/**
 * Assistant Domain — JSON Parser & Schema Validator (v15.0)
 *
 * Production-hardened parser supporting multi-variant AI output:
 *   - Markdown code fences (```json ... ```)
 *   - Preamble / postamble text wrappers
 *   - Vietnamese key names (tieu_de, mo_dau, luan_diem, ket_luan, phan_bien …)
 *   - camelCase and snake_case variations
 *   - Truncated JSON repair
 *   - Double-serialized JSON strings
 *
 * Canonical Contracts:
 *   - Speech Draft: { hook, arguments, counterarguments, conclusion, title? }
 *   - Motion Analysis: { coreConflict, stakeholders, affirmativeCases, negativeCases, burdenOfProof, rebuttalVectors, motion_title? }
 *
 * Returns null ONLY when core required structure cannot be extracted/validated.
 * Returning null triggers HTTP 422 with ZERO quota deduction.
 *
 * Spec: 02_DOMAIN_SPEC.md §7, 04_API_SPEC.md §5, 16_PLAN_QUOTA_BUSINESS_SPEC.md §7
 */

import { safeExtractJSON } from './openAICompatibleClient';

// ─── Canonical Speech Draft Types ────────────────────────────────────────────

export interface SpeechArgument {
  claim: string;
  reasoning: string;
  evidenceSuggestion: string;
  /** Backwards compatibility alias */
  evidence_suggestion: string;
}

export interface SpeechCounterargument {
  opponentArgument: string;
  rebuttal: string;
  /** Backwards compatibility aliases */
  opposing_point: string;
  rebuttal_strategy: string;
}

export interface SpeechDraftResult {
  title?: string;
  hook: string;
  arguments: SpeechArgument[];
  counterarguments: SpeechCounterargument[];
  conclusion: string;
}

// ─── Canonical Motion Analysis Types ─────────────────────────────────────────

export interface StakeholderItem {
  name: string;
  interest: string;
  impact: string;
}

export interface MotionCaseItem {
  claim: string;
  reasoning: string;
  evidenceSuggestion: string;
  /** Backwards compatibility aliases */
  key_argument: string;
  burden_of_proof: string;
}

export interface MotionAnalysisResult {
  motion_title?: string;
  motionTitle?: string;
  coreConflict: string;
  core_conflict: string;
  stakeholders: StakeholderItem[];
  affirmativeCases: MotionCaseItem[];
  affirmative_cases: MotionCaseItem[];
  negativeCases: MotionCaseItem[];
  negative_cases: MotionCaseItem[];
  burdenOfProof: string[];
  burden_of_proof: string[];
  rebuttalVectors: string[];
  rebuttal_vectors: string[];
}

// ─── Extraction Helpers ───────────────────────────────────────────────────────

/**
 * Attempts to repair truncated JSON by balancing open braces and brackets.
 */
function repairTruncatedJson(text: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); continue; }
    if (ch === '}' || ch === ']') { stack.pop(); continue; }
  }

  if (stack.length === 0) return text;

  let repaired = inString ? text + '"' : text;
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }
  return repaired;
}

/**
 * 5-stage JSON extraction pipeline:
 * 1. Markdown fence stripping
 * 2. safeExtractJSON (depth-tracking)
 * 3. Truncation repair
 * 4. Outermost brace slice
 * 5. Double-serialized string unwrapping
 */
function extractObject(raw: unknown): Record<string, unknown> | null {
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw !== 'string') return null;

  let text = raw.trim();
  if (!text) return null;

  // Stage 1: Strip markdown fences
  text = text
    .replace(/^```+(?:json|JSON)?\s*\r?\n?/gm, '')
    .replace(/\r?\n?```+\s*$/gm, '')
    .trim();

  // Stage 2: safeExtractJSON
  let candidate = safeExtractJSON(text);

  // Stage 3: Truncation repair
  if (!candidate) {
    const repaired = repairTruncatedJson(text);
    candidate = safeExtractJSON(repaired) ?? repaired;
  }

  // Stage 4: Outermost brace slice
  if (!candidate) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last > first) {
      candidate = text.slice(first, last + 1);
    }
  }

  if (!candidate) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    try {
      parsed = JSON.parse(repairTruncatedJson(candidate));
    } catch {
      return null;
    }
  }

  // Stage 5: Double-serialized string unwrapping
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { return null; }
  }

  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  return null;
}

function pick(obj: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return fallback;
}

function pickArray(obj: Record<string, unknown>, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
}

function toStringArray(v: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(v)) return fallback;
  const filtered = v
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const name = (item as any).name || (item as any).group || (item as any).stakeholder || (item as any).point || (item as any).title;
        const desc = (item as any).impact || (item as any).interest || (item as any).reasoning || (item as any).desc;
        if (name && desc) return `${name}: ${desc}`;
        if (name) return String(name);
        return Object.values(item).join(': ');
      }
      return '';
    })
    .filter((s) => s.length > 0);
  return filtered.length > 0 ? filtered : fallback;
}

// ─── SpeechDraft Parser ───────────────────────────────────────────────────────

function coerceSpeechArgument(v: unknown): SpeechArgument | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;

  const claim = pick(o, [
    'claim', 'luan_diem', 'y_chinh', 'diem_chinh', 'argument', 'point', 'assertion',
  ], '');
  if (!claim) return null;

  const reasoning = pick(o, [
    'reasoning', 'giai_thich', 'lap_luan', 'ly_le', 'phan_tich', 'reason',
    'rationale', 'explanation', 'analysis',
  ], 'Lập luận chi tiết cho luận điểm.');

  const evidenceSuggestion = pick(o, [
    'evidenceSuggestion', 'evidence_suggestion', 'evidence',
    'dan_chung', 'bang_chung', 'so_lieu', 'vi_du', 'minh_chung',
    'support', 'example', 'source',
  ], 'Nghiên cứu, số liệu, hoặc ví dụ thực tế phù hợp.');

  return {
    claim,
    reasoning,
    evidenceSuggestion,
    evidence_suggestion: evidenceSuggestion,
  };
}

function coerceSpeechCounterargument(v: unknown): SpeechCounterargument | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;

  const opponentArgument = pick(o, [
    'opponentArgument', 'opposing_point', 'opposingPoint', 'opposing',
    'luan_diem_doi_lap', 'y_kien_trai_chieu', 'quan_diem_doi_lap',
    'counterargument', 'counter', 'objection', 'phan_bien_doi_phuong',
  ], '');
  if (!opponentArgument) return null;

  const rebuttal = pick(o, [
    'rebuttal', 'rebuttal_strategy', 'rebuttalStrategy',
    'cach_phan_bac', 'chien_luoc_phan_bac', 'chien_luoc', 'phan_bac',
    'response', 'answer', 'counter_strategy', 'counterStrategy',
  ], 'Phản bác bằng dữ liệu và logic chặt chẽ.');

  return {
    opponentArgument,
    rebuttal,
    opposing_point: opponentArgument,
    rebuttal_strategy: rebuttal,
  };
}

/**
 * Parses and normalizes Speech Draft AI response into canonical structure.
 * Returns null if required fields (arguments >= 1 with valid claim) are missing.
 */
export function parseSpeechDraft(raw: string | unknown): SpeechDraftResult | null {
  const obj = extractObject(raw);
  if (!obj) return null;

  // Title (English + Vietnamese aliases)
  const title = pick(obj, [
    'title', 'tieu_de', 'chu_de', 'ten_bai', 'speech_title',
    'name', 'heading', 'tieu_bai',
  ], '');

  // Required: at least 1 valid argument with claim & reasoning
  const rawArgs = pickArray(obj, [
    'arguments', 'luan_diem', 'cac_luan_diem', 'arguments_list',
    'args', 'points', 'cac_diem', 'luan_cu',
  ]);
  const args = rawArgs
    .map(coerceSpeechArgument)
    .filter((a): a is SpeechArgument => a !== null);
  if (args.length === 0) return null;

  // Hook
  const hook = pick(obj, [
    'hook', 'mo_dau', 'mo_bai', 'dan_nhap', 'opening',
    'introduction', 'intro', 'loi_mo_dau', 'cau_mo_dau',
  ], title ? `${title} — mở đầu bài phát biểu.` : 'Mở đầu bài phát biểu với vấn đề trọng tâm.');

  // Conclusion
  const conclusion = pick(obj, [
    'conclusion', 'ket_luan', 'ket_bai', 'loi_ket', 'closing',
    'summary', 'ending', 'loi_ket_thuc',
  ], 'Để kết luận, chúng ta cần nhìn nhận vấn đề này một cách nghiêm túc và hành động kịp thời.');

  // Counterarguments (preserved without injecting fabricated fake counterarguments)
  const rawCounters = pickArray(obj, [
    'counterarguments', 'counterArguments', 'counter_arguments',
    'phan_bien', 'cac_phan_bien', 'phan_luan', 'y_kien_phan_doi',
    'rebuttals',
  ]);
  const counterarguments = rawCounters
    .map(coerceSpeechCounterargument)
    .filter((c): c is SpeechCounterargument => c !== null);

  const result: SpeechDraftResult = {
    hook,
    arguments: args,
    counterarguments,
    conclusion,
  };

  if (title) {
    result.title = title;
  }

  return result;
}

// ─── MotionAnalysis Parser ────────────────────────────────────────────────────

function coerceStakeholder(v: unknown): StakeholderItem {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      return {
        name: parts[0]?.trim() || 'Bên liên quan',
        interest: parts.slice(1).join(':').trim() || 'Quan tâm tới chính sách',
        impact: parts.slice(1).join(':').trim() || 'Chịu ảnh hưởng trực tiếp',
      };
    }
    if (trimmed.includes(' - ')) {
      const parts = trimmed.split(' - ');
      return {
        name: parts[0]?.trim() || 'Bên liên quan',
        interest: parts.slice(1).join(' - ').trim() || 'Quan tâm tới chính sách',
        impact: parts.slice(1).join(' - ').trim() || 'Chịu ảnh hưởng trực tiếp',
      };
    }
    return {
      name: trimmed,
      interest: 'Quan tâm tới quyền lợi và trách nhiệm liên quan',
      impact: 'Chịu tác động từ kiến nghị',
    };
  }

  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const name = pick(o, ['name', 'group', 'stakeholder', 'party', 'ben_lien_quan', 'nhom', 'title'], 'Bên liên quan');
    const interest = pick(o, ['interest', 'quyen_loi', 'role', 'vai_tro'], 'Quan tâm tới chính sách');
    const impact = pick(o, ['impact', 'tac_dong', 'effect', 'description', 'desc'], 'Chịu ảnh hưởng trực tiếp');
    return { name, interest, impact };
  }

  return {
    name: String(v || 'Bên liên quan'),
    interest: 'Quan tâm tới quyền lợi liên quan',
    impact: 'Chịu tác động từ kiến nghị',
  };
}

function coerceMotionCaseItem(v: unknown): MotionCaseItem | null {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    return {
      claim: trimmed,
      reasoning: trimmed,
      evidenceSuggestion: 'Dẫn chứng và số liệu thực tế.',
      key_argument: trimmed,
      burden_of_proof: 'Chứng minh tính đúng đắn của luận điểm.',
    };
  }

  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;

  const claim = pick(o, [
    'claim', 'luan_diem', 'vi_tri', 'quan_diem', 'position', 'argument', 'point',
  ], '');
  if (!claim) return null;

  const reasoning = pick(o, [
    'reasoning', 'key_argument', 'keyArgument', 'key_point', 'luan_diem_chinh',
    'lap_luan_chinh', 'argument', 'main_argument', 'mainArgument', 'ly_le_chinh',
  ], claim);

  const evidenceSuggestion = pick(o, [
    'evidenceSuggestion', 'evidence_suggestion', 'burden_of_proof', 'burdenOfProof',
    'burden', 'ganh_nang_chung_minh', 'dan_chung', 'proof_requirement', 'what_to_prove',
  ], 'Chứng minh tính hợp lý và hiệu quả của lập trường.');

  return {
    claim,
    reasoning,
    evidenceSuggestion,
    key_argument: reasoning,
    burden_of_proof: evidenceSuggestion,
  };
}

/**
 * Parses and normalizes Motion Analysis AI response into canonical structure.
 * Returns null if required cases (affirmative/negative >= 1) are missing.
 */
export function parseMotionAnalysis(raw: string | unknown): MotionAnalysisResult | null {
  const obj = extractObject(raw);
  if (!obj) return null;

  const motion_title = pick(obj, [
    'motion_title', 'motionTitle', 'title', 'chu_de', 'kien_nghi',
    'topic', 'motion', 'motion_statement', 'ten_kien_nghi',
  ], '');

  // Core conflict
  const coreConflict = pick(obj, [
    'coreConflict', 'core_conflict', 'conflict',
    'xung_dot_cot_loi', 'mau_thuan_chinh', 'central_tension', 'key_issue',
    'diem_mau_thuan',
  ], 'Xung đột giữa các giá trị và lợi ích cốt lõi của các bên liên quan.');

  // Stakeholders
  const rawStakeholders = pickArray(obj, [
    'stakeholders', 'cac_ben_lien_quan', 'cac_ben', 'parties', 'affected_parties',
    'ben_lien_quan',
  ]);
  const stakeholders: StakeholderItem[] = rawStakeholders.map(coerceStakeholder);

  // Affirmative Cases (required >= 1)
  const rawAff = pickArray(obj, [
    'affirmativeCases', 'affirmative_cases', 'affirmative',
    'phe_ung_ho', 'ung_ho', 'luan_diem_ung_ho', 'for_cases', 'forCases',
    'cac_luan_diem_ung_ho',
  ]);
  const affirmativeCases = rawAff
    .map(coerceMotionCaseItem)
    .filter((c): c is MotionCaseItem => c !== null);
  if (affirmativeCases.length === 0) return null;

  // Negative Cases (required >= 1)
  const rawNeg = pickArray(obj, [
    'negativeCases', 'negative_cases', 'negative',
    'phe_phan_doi', 'phan_doi', 'luan_diem_phan_doi', 'against_cases', 'againstCases',
    'cac_luan_diem_phan_doi',
  ]);
  const negativeCases = rawNeg
    .map(coerceMotionCaseItem)
    .filter((c): c is MotionCaseItem => c !== null);
  if (negativeCases.length === 0) return null;

  // Burden of proof
  const rawBurdens = pickArray(obj, [
    'burdenOfProof', 'burden_of_proof', 'burden', 'ganh_nang_chung_minh', 'burdens',
  ]);
  const burdenOfProof = toStringArray(rawBurdens);

  // Rebuttal vectors
  const rawVectors = pickArray(obj, [
    'rebuttalVectors', 'rebuttal_vectors', 'rebuttal_points',
    'huong_phan_bien', 'diem_doi_dau', 'key_clashes', 'keyClashes',
    'cac_diem_tranh_luan',
  ]);
  const rebuttalVectors = toStringArray(rawVectors);

  return {
    motion_title: motion_title || undefined,
    motionTitle: motion_title || undefined,
    coreConflict,
    core_conflict: coreConflict,
    stakeholders,
    affirmativeCases,
    affirmative_cases: affirmativeCases,
    negativeCases,
    negative_cases: negativeCases,
    burdenOfProof,
    burden_of_proof: burdenOfProof,
    rebuttalVectors,
    rebuttal_vectors: rebuttalVectors,
  };
}

// ─── Argument Refinement Types & Parser ──────────────────────────────────────

export interface RefinedArgumentResult {
  claim: string;
  reasoning: string;
  evidenceSuggestion: string;
  refinementNote: string;
}

/**
 * Production-grade robust normalizer for AI Argument Refinement output.
 * Spec: docs/AI_ARGUMENT_REFINEMENT_SPEC.md §14, §17
 *
 * Handles:
 *   - Markdown code fences (```json ... ```)
 *   - Surrounding text/explanations
 *   - Nested wrapper objects ({ result: ... }, { data: ... }, { cre: ... }, { argument: ... })
 *   - camelCase and snake_case keys
 *   - Vietnamese keys (luan_diem, lap_luan, dan_chung, ghi_chu)
 *   - Array-formatted evidence suggestions or sub-objects
 *   - String-cleaning & unclosed JSON repair
 */
export function parseArgumentRefinement(raw: unknown): RefinedArgumentResult | null {
  const root = extractObject(raw);
  if (!root) return null;

  // Unwrap potential wrapper objects
  let target: Record<string, unknown> = root;
  const wrapperKeys = ['result', 'data', 'argument', 'cre', 'candidate', 'output', 'refinement', 'response', 'item'];
  for (const wk of wrapperKeys) {
    if (target[wk] && typeof target[wk] === 'object' && !Array.isArray(target[wk])) {
      target = target[wk] as Record<string, unknown>;
      break;
    }
  }

  // 1. Extract Claim (required)
  let claim = pick(target, [
    'claim', 'luan_diem', 'khang_dinh', 'assertion', 'y_chinh', 'diem_chinh', 'point', 'title', 'statement', 'argument'
  ], '');
  if (!claim) {
    const claimObj = target['claim'] || target['luan_diem'] || target['khang_dinh'];
    if (claimObj && typeof claimObj === 'object') {
      claim = (claimObj as any).text || (claimObj as any).content || (claimObj as any).value || '';
    }
  }
  if (!claim || claim.trim().length === 0) return null;

  // 2. Extract Reasoning (required)
  let reasoning = pick(target, [
    'reasoning', 'lap_luan', 'ly_giai', 'giai_thich', 'explanation', 'logic', 'rationale', 'analysis', 'ly_le', 'justification'
  ], '');
  if (!reasoning) {
    const reasoningObj = target['reasoning'] || target['lap_luan'] || target['ly_giai'];
    if (reasoningObj && typeof reasoningObj === 'object') {
      reasoning = (reasoningObj as any).text || (reasoningObj as any).content || (reasoningObj as any).value || '';
    }
  }
  if (!reasoning || reasoning.trim().length === 0) return null;

  // 3. Extract Evidence Suggestion (optional, string or array)
  let evidenceSuggestion = pick(target, [
    'evidenceSuggestion', 'evidence_suggestion', 'evidence', 'dan_chung', 'goi_y_dan_chung', 'bang_chung', 'source', 'example', 'support', 'sources', 'examples'
  ], '');
  if (!evidenceSuggestion) {
    const arr = pickArray(target, [
      'evidenceSuggestion', 'evidence_suggestion', 'evidence', 'dan_chung', 'goi_y_dan_chung', 'bang_chung', 'sources', 'examples', 'support'
    ]);
    if (arr.length > 0) {
      evidenceSuggestion = toStringArray(arr).join('. ');
    } else {
      const evObj = target['evidenceSuggestion'] || target['evidence_suggestion'] || target['evidence'] || target['dan_chung'];
      if (evObj && typeof evObj === 'object') {
        evidenceSuggestion = (evObj as any).text || (evObj as any).content || (evObj as any).value || (evObj as any).suggestion || '';
      }
    }
  }

  // 4. Extract Refinement Note (optional)
  const refinementNote = pick(target, [
    'refinementNote', 'refinement_note', 'ghi_chu', 'note', 'improvement', 'changes', 'comment', 'nhan_xet'
  ], '');

  return {
    claim: cleanRefinedString(claim),
    reasoning: cleanRefinedString(reasoning),
    evidenceSuggestion: cleanRefinedString(evidenceSuggestion),
    refinementNote: cleanRefinedString(refinementNote),
  };
}

function cleanRefinedString(str: string): string {
  if (!str) return '';
  return str
    .replace(/^["']|["']$/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}


