/**
 * Offline Logic Coach C-R-E JSON extraction + validation.
 *
 * Handles ALL known Beeknoee/Claude response shapes:
 * 1. Pure JSON                               → `{...}`
 * 2. Full markdown fence                     → ```json\n{...}\n```
 * 3. Embedded fence in prose                 → any text ... ```json\n{...}\n``` ... any text
 * 4. Fence without trailing newline          → ```json\n{...}```
 * 5. Fence without language tag              → ```\n{...}\n```
 * 6. Leading/trailing conversational noise   → "Đây là phân tích:\n{...}"
 * 7. Double-serialised string                → `"{\"score\":6,...}"`
 * 8. Already-parsed object (passed directly) → LogicCoachFeedback object
 *
 * Never throws. Invalid input → safe fallback via adaptLogicCoachPayload.
 */

export interface CreAnalysis {
  claim: string;
  reasoning: string;
  evidence: string;
}

export interface LogicCoachFeedback {
  score: number | null;
  cre_analysis: CreAnalysis;
  fallacies_detected: string[];
  strengths: string[];
  weaknesses: string[];
  actionable_suggestions: string[];
  score_source?: 'LLM_EVALUATED' | 'NO_SCORE' | 'PARSE_FAILED';
}

export type ParseLogicCoachResult =
  | { ok: true; feedback: LogicCoachFeedback }
  | { ok: false; raw: string; reason: string };

/**
 * Frontend contract (`frontend/src/lib/api.ts` `CoachFeedback` / `isCoachFeedback`):
 * - score: number | null
 * - cre_analysis: { claim: string; reasoning: string; evidence: string }
 * - fallacies_detected: string[]
 * - strengths: string[]
 * - weaknesses: string[]
 * - actionable_suggestions: string[]
 *
 * Extra keys are allowed. `{ raw }` is NOT accepted by the frontend.
 */

// ─── Markdown Fence Stripper ──────────────────────────────────────────────────

/**
 * Strip ALL markdown code-fence variants from a string.
 *
 * Handles:
 *  - ```json\n{...}\n```      (standard full fence)
 *  - ```json\n{...}```        (no trailing newline before closing fence)
 *  - ```\n{...}\n```          (no language tag)
 *  - ```{...}```              (inline — no newline after opening)
 *  - Fence embedded anywhere in prose
 *  - Opening fence only (unclosed)
 *
 * Strategy:
 *  1. Try to extract the FIRST fenced block via regex — this handles prose wrappers.
 *  2. If no fenced block found, strip partial fences at start/end.
 *  3. Return trimmed result either way.
 */
export function stripMarkdownFences(input: string): string {
  const text = input.trim();
  if (!text) return text;

  // Match the FIRST complete code fence block, permissive:
  // - optional language tag (no space required between ``` and tag)
  // - optional newline between opening fence and content
  // - optional newline before closing fence
  // The `s` (dotAll) flag makes `.` match newlines.
  const fenceRegex = /```(?:[a-zA-Z]*)?\s*\n?([\s\S]*?)\n?```/s;
  const match = text.match(fenceRegex);
  if (match) {
    return match[1].trim();
  }

  // No complete fence found — strip partial opening/closing fences.
  return text
    .replace(/^```[a-zA-Z]*\s*\n?/, '')
    .replace(/\n?```\s*$/, '')
    .trim();
}

// ─── JSON Object Extractor ────────────────────────────────────────────────────

/**
 * Returns the first outermost balanced `{...}` span from the string,
 * respecting JSON string escapes to avoid false matches inside string values.
 *
 * The input is fence-stripped first so embedded fences never confuse the parser.
 */
export function extractOutermostJsonObject(input: string): string | null {
  const text = stripMarkdownFences(input);
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  // Track open arrays too — needed for truncation repair.
  const bracketStack: Array<'{' | '['> = [];

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { depth += 1; bracketStack.push('{'); continue; }
    if (ch === '[') { bracketStack.push('['); continue; }
    if (ch === ']') { if (bracketStack[bracketStack.length - 1] === '[') bracketStack.pop(); continue; }
    if (ch === '}') {
      depth -= 1;
      if (bracketStack[bracketStack.length - 1] === '{') bracketStack.pop();
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  // JSON was truncated (depth > 0 at end of input — hit max_tokens).
  // Attempt repair: close all open brackets and braces.
  if (depth > 0) {
    let fragment = text.slice(start);
    // Strip any incomplete string at the end (might have an unclosed quote).
    // Replace trailing comma+optional whitespace before we close (invalid JSON).
    fragment = fragment.replace(/,\s*$/, '');
    // Close open arrays and objects from the stack (innermost first).
    let closing = '';
    for (let j = bracketStack.length - 1; j >= 0; j--) {
      closing += bracketStack[j] === '[' ? ']' : '}';
    }
    const repaired = fragment + closing;
    try {
      JSON.parse(repaired); // validate repair worked
      console.warn('[COACH_PARSER] Truncated JSON repaired — closed', bracketStack.length, 'open bracket(s).');
      return repaired;
    } catch {
      // Repair failed — return null, adaptLogicCoachPayload will use fallback.
      console.warn('[COACH_PARSER] JSON truncation repair failed. Fragment preview:', fragment.slice(-80));
      return null;
    }
  }

  return null;
}

// ─── Schema Validators ────────────────────────────────────────────────────────

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isLogicCoachFeedback(value: unknown): value is LogicCoachFeedback {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (
    v.score !== null &&
    (typeof v.score !== 'number' || !Number.isFinite(v.score) || v.score < 0 || v.score > 10)
  ) {
    return false;
  }

  const cre = v.cre_analysis;
  if (!cre || typeof cre !== 'object') return false;
  const c = cre as Record<string, unknown>;
  if (
    typeof c.claim !== 'string' ||
    typeof c.reasoning !== 'string' ||
    typeof c.evidence !== 'string'
  ) {
    return false;
  }

  return (
    isStringArray(v.fallacies_detected) &&
    isStringArray(v.strengths) &&
    isStringArray(v.weaknesses) &&
    isStringArray(v.actionable_suggestions)
  );
}

// ─── Normalisation Helpers ────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toDisplayString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayString(item)).filter(Boolean).join('; ');
  }
  const rec = asRecord(value);
  if (!rec) return '';
  if (typeof rec.text === 'string') return rec.text;
  if (typeof rec.message === 'string') return rec.message;
  if (typeof rec.name === 'string') return rec.name;
  if (typeof rec.label === 'string') return rec.label;
  return '';
}

function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayString(item)).filter((item) => item.length > 0);
  }
  const single = toDisplayString(value);
  return single ? [single] : [];
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Coerce common LLM / camelCase / partial shapes into the frontend CoachFeedback contract.
 * Also handles already-valid LogicCoachFeedback objects (pass-through).
 *
 * Strict Score Integrity (INVARIANT-SCORE-01, INVARIANT-SCORE-02, INVARIANT-SCORE-03):
 * - Score 0.0 is explicitly VALID and PRESERVED.
 * - Missing/null score is preserved as null (NO guessing or inferring from text length).
 * - Wild values outside [0, 10] or 0-100 are clamped/normalized.
 */
export function normalizeLogicCoachFeedback(value: unknown): LogicCoachFeedback | null {
  // Fast path: already a valid feedback object.
  if (isLogicCoachFeedback(value)) {
    if (!value.score_source) {
      return {
        ...value,
        score_source: typeof value.score === 'number' ? 'LLM_EVALUATED' : 'NO_SCORE',
      };
    }
    return value;
  }

  const root = asRecord(value);
  if (!root) return null;

  // Unwrap common envelope shapes: { feedback: {...} }, { data: {...} }, etc.
  const nested =
    asRecord(pick(root, ['feedback', 'data', 'analysis', 'result'])) ?? root;

  const creRaw = pick(nested, ['cre_analysis', 'creAnalysis', 'cre', 'CRE', 'c_r_e']);
  const creObj = asRecord(creRaw) ?? nested;

  const claim = toDisplayString(pick(creObj, ['claim', 'Claim', 'luận_điểm', 'luan_diem']));
  const reasoning = toDisplayString(
    pick(creObj, ['reasoning', 'Reasoning', 'lập_luận', 'lap_luan', 'reason']),
  );
  const evidence = toDisplayString(
    pick(creObj, ['evidence', 'Evidence', 'dẫn_chứng', 'dan_chung', 'proof']),
  );

  // Require at least one CRE field to be present (non-empty string > 0 chars)
  if (!claim && !reasoning && !evidence && !asRecord(creRaw)) {
    return null;
  }

  const suggestions = toStringArray(
    pick(nested, [
      'actionable_suggestions',
      'actionableSuggestions',
      'suggestions',
      'recommendations',
    ]),
  );

  // ── Score resolution (INVARIANT-SCORE-01, INVARIANT-SCORE-02, INVARIANT-SCORE-03) ──
  // 1. Try the explicit numeric score field first.
  const rawScore = toFiniteNumber(pick(nested, ['score', 'rating', 'points']));
  // 2. Validate and clamp: 0.0 is explicitly VALID and PRESERVED.
  let score: number | null = null;
  let scoreSource: 'LLM_EVALUATED' | 'NO_SCORE' = 'NO_SCORE';
  if (rawScore !== null) {
    if (rawScore >= 0 && rawScore <= 10) {
      score = rawScore;
      scoreSource = 'LLM_EVALUATED';
    } else if (rawScore > 10 && rawScore <= 100) {
      score = Math.min(+(rawScore / 10).toFixed(1), 10);
      scoreSource = 'LLM_EVALUATED';
    }
  }

  const feedback: LogicCoachFeedback = {
    score,
    cre_analysis: {
      claim,
      reasoning,
      evidence,
    },
    fallacies_detected: toStringArray(
      pick(nested, ['fallacies_detected', 'fallaciesDetected', 'fallacies', 'logical_fallacies']),
    ),
    strengths: toStringArray(pick(nested, ['strengths', 'strength', 'pros'])),
    weaknesses: toStringArray(pick(nested, ['weaknesses', 'weakness', 'cons'])),
    actionable_suggestions: suggestions,
    score_source: scoreSource,
  };

  return isLogicCoachFeedback(feedback) ? feedback : null;
}

// ─── Core Parser ──────────────────────────────────────────────────────────────

/**
 * Parse provider content into structured Logic Coach feedback.
 *
 * Input can be:
 *   - A raw string (markdown-fenced or plain JSON)
 *   - An already-parsed object (returned when adaptLogicCoachPayload receives
 *     a pre-parsed value from the controller)
 *
 * Never throws. Invalid input yields `{ ok: false, raw }`.
 */
export function parseLogicCoachContent(raw: string | null | undefined): ParseLogicCoachResult {
  const source = raw ?? '';
  if (!source.trim()) {
    return { ok: false, raw: source, reason: 'empty_content' };
  }

  // Handle double-serialised strings: `"{\"score\":6,...}"`
  let workingSource = source;
  if (workingSource.trim().startsWith('"') && workingSource.trim().endsWith('"')) {
    try {
      const inner = JSON.parse(workingSource.trim());
      if (typeof inner === 'string') workingSource = inner;
    } catch {
      // Not double-serialised — continue with original.
    }
  }

  const candidate = extractOutermostJsonObject(workingSource);
  if (!candidate) {
    return { ok: false, raw: source, reason: 'no_json_object' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return { ok: false, raw: source, reason: 'json_parse_error' };
  }

  const normalized = normalizeLogicCoachFeedback(parsed);
  if (!normalized) {
    return { ok: false, raw: source, reason: 'schema_invalid' };
  }

  return { ok: true, feedback: normalized };
}

// ─── HTTP Adapter ─────────────────────────────────────────────────────────────

/**
 * HTTP adapter: ALWAYS returns the frontend CoachFeedback contract.
 *
 * Accepts:
 *   - string  — raw LLM output (fenced or plain JSON)
 *   - object  — already-parsed LogicCoachFeedback (pass-through via normalise)
 *   - null/undefined — treated as empty
 *
 * Strict Score Integrity (INVARIANT-SCORE-01, INVARIANT-SCORE-03):
 * On parse failure, returns explicit error state with score: null (NO fabricated 4.0 score).
 */
export function adaptLogicCoachPayload(raw: string | null | undefined | unknown): LogicCoachFeedback {
  // If already an object (e.g. passed from a prior parse step), normalise directly.
  if (raw !== null && raw !== undefined && typeof raw === 'object') {
    const normalized = normalizeLogicCoachFeedback(raw);
    if (normalized) return normalized;
    // Object was present but failed schema validation — fall through to error state.
    console.warn('[COACH_PARSER] Object input failed schema validation:', JSON.stringify(raw).slice(0, 200));
    return {
      score: null,
      cre_analysis: { claim: '', reasoning: '', evidence: '' },
      fallacies_detected: [],
      strengths: [],
      weaknesses: ['Phản hồi từ Logic Coach không đúng định dạng.'],
      actionable_suggestions: ['Vui lòng thử lại lượt tiếp theo.'],
      score_source: 'PARSE_FAILED',
    };
  }

  const result = parseLogicCoachContent(raw as string | null | undefined);
  if (result.ok) {
    return result.feedback;
  }

  // Parse failed — log the reason and return explicit missing state with score: null.
  console.warn('[COACH_PARSER] Parse failed:', result.reason, '— raw preview:', (result.raw || '').slice(0, 150));
  return {
    score: null,
    cre_analysis: {
      claim: '',
      reasoning: '',
      evidence: '',
    },
    fallacies_detected: [],
    strengths: [],
    weaknesses: ['Logic Coach chưa thể phân tích phản hồi này.'],
    actionable_suggestions: ['Vui lòng thử lại lượt tiếp theo.'],
    score_source: 'PARSE_FAILED',
  };
}
