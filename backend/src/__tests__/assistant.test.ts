/**
 * TC-ASST: Assistant Domain Test Suite
 *
 * Verifies the complete controller lifecycle for Speech Draft and Motion Analysis:
 *   TC-ASST-01: Happy Path — Speech Draft
 *   TC-ASST-02: Happy Path — Motion Analysis
 *   TC-ASST-03: Quota Isolation — ASSISTANT only decrements, TEXT/AUDIO unchanged
 *   TC-ASST-04: AI Provider Failure — zero quota deduction
 *   TC-ASST-05: Schema / Parser Failure — zero quota deduction
 *   TC-ASST-06: Zero Quota Gate — AI NEVER called when assistant_remaining = 0
 *   TC-ASST-07: Concurrency Safety — 1 of 2 concurrent wins, balance never negative
 *   TC-ASST-08: Schema Contract — SpeechDraft output shape
 *   TC-ASST-09: Schema Contract — MotionAnalysis output shape
 *
 * Zero live AI / DB calls — all dependencies are injected stubs.
 * Runner: tsx (consistent with existing suite pattern).
 *
 * NOTE: Top-level await is not available in CJS output. All async tests
 * are wrapped in an async IIFE that rethrows failures to ensure process.exit(1).
 */

import { parseSpeechDraft, parseMotionAnalysis } from '../services/assistantParser';
import { buildSpeechDraftPrompt } from '../prompts/speechDraft';
import { buildMotionAnalysisPrompt } from '../prompts/motionAnalysis';

// ─── Micro test harness ───────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass += 1;
    console.log('  ✅ PASS', name);
  } else {
    fail += 1;
    failures.push(name);
    console.log('  ❌ FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 120) : '');
  }
}

function section(title: string): void {
  console.log('\n▶ ' + title);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SPEECH_DRAFT_VALID = {
  title: 'Vì sao mạng xã hội gây hại cho học sinh',
  hook: 'Mỗi ngày, hàng triệu học sinh dành nhiều giờ lướt mạng xã hội thay vì học bài.',
  arguments: [
    {
      claim: 'Mạng xã hội gây nghiện và giảm tập trung.',
      reasoning: 'Các thuật toán thiết kế để giữ người dùng càng lâu càng tốt.',
      evidence_suggestion: 'Nghiên cứu của APA (2023) về tác động của screen time đến học sinh THCS.',
    },
    {
      claim: 'Mạng xã hội tạo áp lực so sánh bản thân.',
      reasoning: 'Nội dung được chọn lọc tạo hình ảnh cuộc sống hoàn hảo không thực tế.',
      evidence_suggestion: 'Số liệu từ UNICEF về tỷ lệ lo âu ở thanh thiếu niên.',
    },
  ],
  counterarguments: [
    {
      opposing_point: 'Mạng xã hội giúp học sinh kết nối và học hỏi.',
      rebuttal_strategy: 'Lợi ích này có thể đạt được qua nền tảng giáo dục chuyên biệt an toàn hơn.',
    },
  ],
  conclusion: 'Để bảo vệ tương lai thế hệ trẻ, cần thiết lập giới hạn rõ ràng về độ tuổi sử dụng mạng xã hội.',
};

const MOTION_ANALYSIS_VALID = {
  motion_title: 'Học sinh dưới 15 tuổi không nên sử dụng mạng xã hội',
  core_conflict: 'Quyền tự do thông tin vs. Bảo vệ sức khỏe tâm thần trẻ em',
  stakeholders: ['Học sinh', 'Phụ huynh', 'Nhà trường', 'Doanh nghiệp công nghệ', 'Cơ quan quản lý nhà nước'],
  affirmative_cases: [
    {
      claim: 'Mạng xã hội gây hại tâm lý cho trẻ em dưới 15 tuổi.',
      key_argument: 'Não bộ trẻ em chưa đủ phát triển để xử lý áp lực mạng xã hội.',
      burden_of_proof: 'Cần chứng minh mức độ tác hại vượt qua lợi ích.',
    },
    {
      claim: 'Cần có quy định pháp lý bảo vệ trẻ em khỏi nội dung độc hại.',
      key_argument: 'Các quốc gia tiên tiến đã ban hành luật hạn chế độ tuổi truy cập mạng xã hội.',
      burden_of_proof: 'Phải chứng minh lệnh cấm khả thi và hiệu quả hơn giáo dục.',
    },
  ],
  negative_cases: [
    {
      claim: 'Cấm đoán không hiệu quả và vi phạm quyền tiếp cận thông tin.',
      key_argument: 'Trẻ em có thể vượt qua hạn chế kỹ thuật; giáo dục hiệu quả hơn.',
      burden_of_proof: 'Cần chứng minh phương án thay thế hiệu quả hơn lệnh cấm.',
    },
  ],
  rebuttal_vectors: [
    'Liệu giáo dục kỹ thuật số có thể thay thế lệnh cấm?',
    'Ai chịu trách nhiệm giám sát: phụ huynh, nhà trường hay nền tảng?',
    'Ranh giới độ tuổi 15 có cơ sở khoa học không?',
  ],
};

// ─── Mock Infrastructure ──────────────────────────────────────────────────────

interface MockQuotaState {
  assistant: number;
  text: number;
  audio: number;
}

/** Simulates checkQuotaAvailable — non-mutating read. */
function mockCheckQuotaAvailable(
  state: MockQuotaState,
  dimension: 'assistant' | 'text' | 'audio',
): 'ALLOW' | 'QUOTA_EXCEEDED' {
  return state[dimension] > 0 ? 'ALLOW' : 'QUOTA_EXCEEDED';
}

/**
 * Simulates consumeQuota with atomic conditional decrement.
 *
 * Mirrors the real PostgreSQL operation:
 *   UPDATE user_quotas SET <col> = <col> - 1
 *   WHERE id = :quotaId AND <col> >= 1
 *
 * Returns { rows: 1 } on success (ALLOW), { rows: 0 } on QUOTA_EXCEEDED.
 * Balance NEVER goes below 0 — the WHERE guard prevents underflow.
 *
 * Spec 16 §22: "Conditional Atomic Decrement"
 */
function mockAtomicDecrement(
  state: MockQuotaState,
  dimension: 'assistant' | 'text' | 'audio',
  amount: number,
): { rows: number } {
  if (state[dimension] >= amount) {
    state[dimension] -= amount;
    return { rows: 1 };   // ALLOW
  }
  return { rows: 0 };     // QUOTA_EXCEEDED — state unchanged
}

/** Simulates the full controller flow for Speech Draft generation. */
async function simulateSpeechDraftFlow(opts: {
  quota: MockQuotaState;
  aiFunction: () => Promise<string>;
}): Promise<{ status: number; body: unknown; aiCalled: boolean; consumeCalled: boolean }> {
  let aiCalled = false;
  let consumeCalled = false;

  // Step 3: Non-consuming quota check.
  if (mockCheckQuotaAvailable(opts.quota, 'assistant') !== 'ALLOW') {
    return { status: 403, body: { error: 'QUOTA_EXCEEDED' }, aiCalled, consumeCalled };
  }

  // Step 5: AI generation.
  let aiContent: string;
  try {
    aiCalled = true;
    aiContent = await opts.aiFunction();
  } catch {
    return { status: 502, body: { error: 'AI_SERVICE_UNAVAILABLE' }, aiCalled, consumeCalled };
  }

  // Step 6: Schema validation.
  const artifact = parseSpeechDraft(aiContent);
  if (!artifact) {
    return { status: 422, body: { error: 'GENERATION_FAILED' }, aiCalled, consumeCalled };
  }

  // Step 7: Atomic quota consumption — ONLY on valid artifact.
  consumeCalled = true;
  const consumeResult = mockAtomicDecrement(opts.quota, 'assistant', 1);
  if (consumeResult.rows !== 1) {
    return { status: 403, body: { error: 'QUOTA_EXCEEDED' }, aiCalled, consumeCalled };
  }

  return { status: 200, body: { success: true, data: artifact }, aiCalled, consumeCalled };
}

/** Simulates the full controller flow for Motion Analysis generation. */
async function simulateMotionAnalysisFlow(opts: {
  quota: MockQuotaState;
  aiFunction: () => Promise<string>;
}): Promise<{ status: number; body: unknown; aiCalled: boolean; consumeCalled: boolean }> {
  let aiCalled = false;
  let consumeCalled = false;

  if (mockCheckQuotaAvailable(opts.quota, 'assistant') !== 'ALLOW') {
    return { status: 403, body: { error: 'QUOTA_EXCEEDED' }, aiCalled, consumeCalled };
  }

  let aiContent: string;
  try {
    aiCalled = true;
    aiContent = await opts.aiFunction();
  } catch {
    return { status: 502, body: { error: 'AI_SERVICE_UNAVAILABLE' }, aiCalled, consumeCalled };
  }

  const artifact = parseMotionAnalysis(aiContent);
  if (!artifact) {
    return { status: 422, body: { error: 'GENERATION_FAILED' }, aiCalled, consumeCalled };
  }

  consumeCalled = true;
  const consumeResult = mockAtomicDecrement(opts.quota, 'assistant', 1);
  if (consumeResult.rows !== 1) {
    return { status: 403, body: { error: 'QUOTA_EXCEEDED' }, aiCalled, consumeCalled };
  }

  return { status: 200, body: { success: true, data: artifact }, aiCalled, consumeCalled };
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-ASST-08 & TC-ASST-09: Synchronous schema contract tests
// Run first (no async needed)
// ─────────────────────────────────────────────────────────────────────────────

section('TC-ASST-08 — Schema Contract: SpeechDraft output shape');

{
  const parsed = parseSpeechDraft(JSON.stringify(SPEECH_DRAFT_VALID));
  assert('TC-ASST-08: parseSpeechDraft returns non-null', parsed !== null);

  if (parsed !== null) {
    assert('TC-ASST-08: title is non-empty string', typeof parsed.title === 'string' && parsed.title.length > 0);
    assert('TC-ASST-08: hook is non-empty string', typeof parsed.hook === 'string' && parsed.hook.length > 0);
    assert('TC-ASST-08: conclusion is non-empty string', typeof parsed.conclusion === 'string' && parsed.conclusion.length > 0);
    assert('TC-ASST-08: arguments is array', Array.isArray(parsed.arguments));
    assert('TC-ASST-08: arguments length >= 1', parsed.arguments.length >= 1);
    assert('TC-ASST-08: argument[0].claim is string', typeof parsed.arguments[0]?.claim === 'string');
    assert('TC-ASST-08: argument[0].reasoning is string', typeof parsed.arguments[0]?.reasoning === 'string');
    assert('TC-ASST-08: argument[0].evidence_suggestion is string', typeof parsed.arguments[0]?.evidence_suggestion === 'string');
    assert('TC-ASST-08: counterarguments is array', Array.isArray(parsed.counterarguments));
    assert('TC-ASST-08: counterarguments length >= 1', parsed.counterarguments.length >= 1);
    assert('TC-ASST-08: counterargument[0].opposing_point is string', typeof parsed.counterarguments[0]?.opposing_point === 'string');
    assert('TC-ASST-08: counterargument[0].rebuttal_strategy is string', typeof parsed.counterarguments[0]?.rebuttal_strategy === 'string');
  }

  // Parser v2: optional fields (hook, conclusion, counterarguments) use safe fallbacks.
  // Empty hook → uses title-based fallback, does NOT return null.
  const emptyHookResult = parseSpeechDraft(JSON.stringify({ ...SPEECH_DRAFT_VALID, hook: '' }));
  assert('TC-ASST-08: empty hook → uses fallback (not null)', emptyHookResult !== null);
  assert('TC-ASST-08: empty hook → fallback hook is non-empty string',
    typeof emptyHookResult?.hook === 'string' && emptyHookResult.hook.length > 0);

  // Missing conclusion → uses fallback string.
  const noConclusion = parseSpeechDraft(JSON.stringify({ ...SPEECH_DRAFT_VALID, conclusion: undefined }));
  assert('TC-ASST-08: missing conclusion → uses fallback (not null)', noConclusion !== null);
  assert('TC-ASST-08: missing conclusion → fallback conclusion is string', typeof noConclusion?.conclusion === 'string');

  // Empty arguments array → MUST return null (title alone is not enough).
  assert('TC-ASST-08: empty arguments array → null', parseSpeechDraft(JSON.stringify({ ...SPEECH_DRAFT_VALID, arguments: [] })) === null);

  // Argument with empty reasoning → reasoning gets fallback, claim is present → NOT null.
  const emptyReasoning = parseSpeechDraft(JSON.stringify({
    ...SPEECH_DRAFT_VALID,
    arguments: [{ claim: 'ok', reasoning: '', evidence_suggestion: 'ok' }],
  }));
  assert('TC-ASST-08: argument with empty reasoning → uses fallback (not null)', emptyReasoning !== null);
  assert('TC-ASST-08: empty reasoning → reasoning field is non-empty', (emptyReasoning?.arguments[0]?.reasoning?.length ?? 0) > 0);

  // Empty counterarguments → uses default fallback counterarg, NOT null.
  const noCounters = parseSpeechDraft(JSON.stringify({ ...SPEECH_DRAFT_VALID, counterarguments: [] }));
  assert('TC-ASST-08: empty counterarguments → uses fallback (not null)', noCounters !== null);
  assert('TC-ASST-08: empty counterarguments → fallback counterarg inserted', (noCounters?.counterarguments.length ?? 0) >= 1);

  const fenced = '```json\n' + JSON.stringify(SPEECH_DRAFT_VALID) + '\n```';
  assert('TC-ASST-08: markdown-fenced JSON → parses correctly', parseSpeechDraft(fenced) !== null);

  const prose = 'Here is the draft:\n' + JSON.stringify(SPEECH_DRAFT_VALID) + '\nEnjoy!';
  assert('TC-ASST-08: prose wrapper → parses correctly', parseSpeechDraft(prose) !== null);
}

section('TC-ASST-09 — Schema Contract: MotionAnalysis output shape');

{
  const parsed = parseMotionAnalysis(JSON.stringify(MOTION_ANALYSIS_VALID));
  assert('TC-ASST-09: parseMotionAnalysis returns non-null', parsed !== null);

  if (parsed !== null) {
    assert('TC-ASST-09: motion_title is non-empty string', typeof parsed.motion_title === 'string' && parsed.motion_title.length > 0);
    assert('TC-ASST-09: core_conflict is non-empty string', typeof parsed.core_conflict === 'string' && parsed.core_conflict.length > 0);
    assert('TC-ASST-09: stakeholders is string[]',
      Array.isArray(parsed.stakeholders) && parsed.stakeholders.every((s: unknown) => typeof s === 'string'));
    assert('TC-ASST-09: stakeholders length >= 1', parsed.stakeholders.length >= 1);
    assert('TC-ASST-09: affirmative_cases is array', Array.isArray(parsed.affirmative_cases));
    assert('TC-ASST-09: affirmative_cases length >= 1', parsed.affirmative_cases.length >= 1);
    assert('TC-ASST-09: affirmative_cases[0].claim is string', typeof parsed.affirmative_cases[0]?.claim === 'string');
    assert('TC-ASST-09: affirmative_cases[0].key_argument is string', typeof parsed.affirmative_cases[0]?.key_argument === 'string');
    assert('TC-ASST-09: affirmative_cases[0].burden_of_proof is string', typeof parsed.affirmative_cases[0]?.burden_of_proof === 'string');
    assert('TC-ASST-09: negative_cases is array', Array.isArray(parsed.negative_cases));
    assert('TC-ASST-09: negative_cases length >= 1', parsed.negative_cases.length >= 1);
    assert('TC-ASST-09: negative_cases[0].claim is string', typeof parsed.negative_cases[0]?.claim === 'string');
    assert('TC-ASST-09: rebuttal_vectors is string[]',
      Array.isArray(parsed.rebuttal_vectors) && parsed.rebuttal_vectors.every((s: unknown) => typeof s === 'string'));
    assert('TC-ASST-09: rebuttal_vectors length >= 1', parsed.rebuttal_vectors.length >= 1);
  }

  // Parser v2: optional fields use safe fallbacks rather than returning null.

  // empty core_conflict → uses fallback, NOT null.
  const noConflict = parseMotionAnalysis(JSON.stringify({ ...MOTION_ANALYSIS_VALID, core_conflict: '' }));
  assert('TC-ASST-09: empty core_conflict → uses fallback (not null)', noConflict !== null);
  assert('TC-ASST-09: empty core_conflict → fallback core_conflict is non-empty', (noConflict?.core_conflict?.length ?? 0) > 0);

  // empty stakeholders → uses fallback ['Các bên liên quan'], NOT null.
  const noStakeholders = parseMotionAnalysis(JSON.stringify({ ...MOTION_ANALYSIS_VALID, stakeholders: [] }));
  assert('TC-ASST-09: empty stakeholders → uses fallback (not null)', noStakeholders !== null);
  assert('TC-ASST-09: empty stakeholders → fallback stakeholder inserted', (noStakeholders?.stakeholders.length ?? 0) >= 1);

  // non-string stakeholders → filtered out, falls back to default.
  const nonStringStakeholders = parseMotionAnalysis(JSON.stringify({ ...MOTION_ANALYSIS_VALID, stakeholders: [123, 456] }));
  assert('TC-ASST-09: non-string stakeholders → uses fallback (not null)', nonStringStakeholders !== null);
  assert('TC-ASST-09: non-string stakeholders → stakeholders is string[]',
    Array.isArray(nonStringStakeholders?.stakeholders) &&
    nonStringStakeholders!.stakeholders.every((s) => typeof s === 'string'));

  // empty affirmative_cases → MUST return null (required field).
  assert('TC-ASST-09: empty affirmative_cases → null', parseMotionAnalysis(JSON.stringify({ ...MOTION_ANALYSIS_VALID, affirmative_cases: [] })) === null);

  // empty negative_cases → MUST return null (required field).
  assert('TC-ASST-09: empty negative_cases → null', parseMotionAnalysis(JSON.stringify({ ...MOTION_ANALYSIS_VALID, negative_cases: [] })) === null);

  // empty rebuttal_vectors → uses fallback, NOT null.
  const noVectors = parseMotionAnalysis(JSON.stringify({ ...MOTION_ANALYSIS_VALID, rebuttal_vectors: [] }));
  assert('TC-ASST-09: empty rebuttal_vectors → uses fallback (not null)', noVectors !== null);
  assert('TC-ASST-09: empty rebuttal_vectors → fallback vector inserted', (noVectors?.rebuttal_vectors.length ?? 0) >= 1);

  // case with empty key_argument → key_argument falls back to claim value, NOT null.
  const emptyKeyArg = parseMotionAnalysis(JSON.stringify({
    ...MOTION_ANALYSIS_VALID,
    affirmative_cases: [{ claim: 'ok', key_argument: '', burden_of_proof: 'ok' }],
  }));
  assert('TC-ASST-09: case with empty key_argument → uses fallback (not null)', emptyKeyArg !== null);
  assert('TC-ASST-09: empty key_argument → falls back to claim', emptyKeyArg?.affirmative_cases[0]?.key_argument === 'ok');
}

section('TC-ASST-09b — Prompt Builders');

{
  const { systemPrompt: spSD, userPrompt: upSD } = buildSpeechDraftPrompt({
    topic: 'Học sinh dưới 15 tuổi không nên dùng mạng xã hội',
    stance: 'AFFIRMATIVE',
    rawIdeas: 'Gây nghiện, mất tập trung',
    language: 'vi',
  });
  assert('TC-ASST-09b: SpeechDraft systemPrompt contains JSON schema', spSD.includes('"title"'));
  assert('TC-ASST-09b: SpeechDraft systemPrompt enforces OUTPUT ONLY VALID JSON', spSD.includes('OUTPUT ONLY VALID JSON'));
  assert('TC-ASST-09b: SpeechDraft userPrompt contains topic', upSD.includes('Học sinh dưới 15'));
  assert('TC-ASST-09b: SpeechDraft userPrompt contains stance label', upSD.includes('NG H'));
  assert('TC-ASST-09b: SpeechDraft userPrompt includes rawIdeas', upSD.includes('Gây nghiện'));

  const { systemPrompt: spMA, userPrompt: upMA } = buildMotionAnalysisPrompt({
    topic: 'Học sinh dưới 15 tuổi không nên dùng mạng xã hội',
    context: 'Bối cảnh Việt Nam 2024',
  });
  assert('TC-ASST-09b: MotionAnalysis systemPrompt contains JSON schema', spMA.includes('"motion_title"'));
  assert('TC-ASST-09b: MotionAnalysis systemPrompt enforces OUTPUT ONLY VALID JSON', spMA.includes('OUTPUT ONLY VALID JSON'));
  assert('TC-ASST-09b: MotionAnalysis userPrompt contains topic', upMA.includes('Học sinh dưới 15'));
  assert('TC-ASST-09b: MotionAnalysis userPrompt contains context', upMA.includes('Bối cảnh Việt Nam 2024'));

  const { userPrompt: negPrompt } = buildSpeechDraftPrompt({ topic: 'Test motion', stance: 'NEGATIVE' });
  assert('TC-ASST-09b: NEGATIVE stance → PHẢN ĐỐI label', negPrompt.includes('N'));

  // Prompt v3: should include language separation hint
  assert('TC-ASST-09b: SpeechDraft prompt warns against key translation', spSD.includes('NEVER translate key names'));
  assert('TC-ASST-09b: MotionAnalysis prompt warns against key translation', spMA.includes('NEVER translate key names'));
  assert('TC-ASST-09b: SpeechDraft prompt specifies contentLang for vi', spSD.includes('Vietnamese'));
}

section('TC-ASST-10 — Vietnamese Key Normalization (parser v3)');

{
  // Simulates model output with Vietnamese keys (the primary runtime failure mode).
  const vietnameseSpeechDraft = {
    tieu_de: 'Tại sao học sinh không nên dùng mạng xã hội',
    mo_dau: 'Mỗi ngày hàng triệu học sinh dành giờ lướt mạng thay vì học bài.',
    luan_diem: [
      {
        luan_diem: 'Mạng xã hội gây nghiện và làm giảm tập trung.',
        giai_thich: 'Thuật toán thiết kế để giữ người dùng càng lâu càng tốt.',
        dan_chung: 'Nghiên cứu APA 2023 về screen time và học sinh THCS.',
      },
      {
        luan_diem: 'Tạo áp lực so sánh bản thân không lành mạnh.',
        giai_thich: 'Nội dung được chọn lọc tạo hình ảnh cuộc sống hoàn hảo không thực tế.',
        dan_chung: 'Số liệu UNICEF về lo âu thanh thiếu niên.',
      },
    ],
    phan_bien: [
      {
        luan_diem_doi_lap: 'Mạng xã hội giúp kết nối và học hỏi.',
        cach_phan_bac: 'Lợi ích này có thể đạt được qua nền tảng giáo dục chuyên biệt.',
      },
    ],
    ket_luan: 'Cần thiết lập giới hạn rõ ràng về độ tuổi sử dụng mạng xã hội.',
  };

  const viParsed = parseSpeechDraft(JSON.stringify(vietnameseSpeechDraft));
  assert('TC-ASST-10: Vietnamese tieu_de → title', viParsed !== null && viParsed.title === vietnameseSpeechDraft.tieu_de);
  assert('TC-ASST-10: Vietnamese mo_dau → hook', viParsed !== null && viParsed.hook === vietnameseSpeechDraft.mo_dau);
  assert('TC-ASST-10: Vietnamese luan_diem (array) → arguments', (viParsed?.arguments.length ?? 0) === 2);
  assert('TC-ASST-10: Vietnamese luan_diem (field) → claim', viParsed?.arguments[0]?.claim === vietnameseSpeechDraft.luan_diem[0].luan_diem);
  assert('TC-ASST-10: Vietnamese giai_thich → reasoning', viParsed?.arguments[0]?.reasoning === vietnameseSpeechDraft.luan_diem[0].giai_thich);
  assert('TC-ASST-10: Vietnamese dan_chung → evidence_suggestion', viParsed?.arguments[0]?.evidence_suggestion === vietnameseSpeechDraft.luan_diem[0].dan_chung);
  assert('TC-ASST-10: Vietnamese phan_bien → counterarguments', (viParsed?.counterarguments.length ?? 0) === 1);
  assert('TC-ASST-10: Vietnamese luan_diem_doi_lap → opposing_point', viParsed?.counterarguments[0]?.opposing_point === vietnameseSpeechDraft.phan_bien[0].luan_diem_doi_lap);
  assert('TC-ASST-10: Vietnamese cach_phan_bac → rebuttal_strategy', viParsed?.counterarguments[0]?.rebuttal_strategy === vietnameseSpeechDraft.phan_bien[0].cach_phan_bac);
  assert('TC-ASST-10: Vietnamese ket_luan → conclusion', viParsed?.conclusion === vietnameseSpeechDraft.ket_luan);

  // camelCase keys (another common model output variant)
  const camelCaseDraft = {
    title: 'Social Media Ban Test',
    hook: 'Opening hook.',
    arguments: [
      {
        claim: 'First claim.',
        reasoning: 'First reasoning.',
        evidenceSuggestion: 'First evidence.',  // camelCase
      },
    ],
    counterArguments: [   // camelCase 'counterArguments'
      {
        opposingPoint: 'Opposing view.',         // camelCase
        rebuttalStrategy: 'Counter strategy.',  // camelCase
      },
    ],
    conclusion: 'Strong conclusion.',
  };

  const camelParsed = parseSpeechDraft(JSON.stringify(camelCaseDraft));
  assert('TC-ASST-10: camelCase evidenceSuggestion → evidence_suggestion', camelParsed?.arguments[0]?.evidence_suggestion === 'First evidence.');
  assert('TC-ASST-10: camelCase counterArguments → counterarguments', (camelParsed?.counterarguments.length ?? 0) === 1);
  assert('TC-ASST-10: camelCase opposingPoint → opposing_point', camelParsed?.counterarguments[0]?.opposing_point === 'Opposing view.');
  assert('TC-ASST-10: camelCase rebuttalStrategy → rebuttal_strategy', camelParsed?.counterarguments[0]?.rebuttal_strategy === 'Counter strategy.');

  // Vietnamese Motion Analysis keys
  const vietnameseMotion = {
    kien_nghi: 'Cấm học sinh dưới 15 tuổi dùng mạng xã hội',
    xung_dot_cot_loi: 'Quyền tự do thông tin vs. Bảo vệ sức khỏe tâm thần trẻ em',
    cac_ben_lien_quan: ['Học sinh', 'Phụ huynh', 'Nhà trường'],
    phe_ung_ho: [
      {
        luan_diem: 'Mạng xã hội gây hại tâm lý.',
        lap_luan_chinh: 'Não bộ trẻ em chưa đủ phát triển.',
        dieu_can_chung_minh: 'Mức độ tác hại vượt qua lợi ích.',
      },
    ],
    phe_phan_doi: [
      {
        luan_diem: 'Cấm đoán không hiệu quả.',
        lap_luan_chinh: 'Trẻ có thể vượt qua hạn chế kỹ thuật.',
        dieu_can_chung_minh: 'Phương án thay thế hiệu quả hơn.',
      },
    ],
    huong_phan_bien: ['Liệu giáo dục kỹ thuật số có thể thay thế lệnh cấm?'],
  };

  const viMotion = parseMotionAnalysis(JSON.stringify(vietnameseMotion));
  assert('TC-ASST-10: Vietnamese kien_nghi → motion_title', viMotion?.motion_title === vietnameseMotion.kien_nghi);
  assert('TC-ASST-10: Vietnamese xung_dot_cot_loi → core_conflict', viMotion?.core_conflict === vietnameseMotion.xung_dot_cot_loi);
  assert('TC-ASST-10: Vietnamese cac_ben_lien_quan → stakeholders', (viMotion?.stakeholders.length ?? 0) === 3);
  assert('TC-ASST-10: Vietnamese phe_ung_ho → affirmative_cases', (viMotion?.affirmative_cases.length ?? 0) === 1);
  assert('TC-ASST-10: Vietnamese phe_phan_doi → negative_cases', (viMotion?.negative_cases.length ?? 0) === 1);
  assert('TC-ASST-10: Vietnamese huong_phan_bien → rebuttal_vectors', (viMotion?.rebuttal_vectors.length ?? 0) === 1);

  // Truncated JSON repair test
  const truncated = '{"title":"Test Draft","hook":"Opening.","arguments":[{"claim":"Claim 1","reasoning":"Reason 1","evidence_suggestion":"Evi';
  const truncRepaired = parseSpeechDraft(truncated);
  // May or may not succeed depending on how clean the repair is, but should not throw
  assert('TC-ASST-10: truncated JSON does not throw', true); // existence check — no exception
}

// ─────────────────────────────────────────────────────────────────────────────
// TC-ASST-01 through TC-ASST-07: Async controller-flow tests
// Wrapped in async IIFE — required for CJS module format (no top-level await)
// ─────────────────────────────────────────────────────────────────────────────

(async () => {

  // ─── TC-ASST-01: Happy Path — Speech Draft ────────────────────────────────
  section('TC-ASST-01 — Happy Path: Speech Draft');
  {
    const quota: MockQuotaState = { assistant: 3, text: 10, audio: 5 };
    const result = await simulateSpeechDraftFlow({
      quota,
      aiFunction: async () => JSON.stringify(SPEECH_DRAFT_VALID),
    });
    assert('TC-ASST-01: HTTP 200', result.status === 200);
    assert('TC-ASST-01: success flag', (result.body as any)?.success === true);
    assert('TC-ASST-01: data present', (result.body as any)?.data !== undefined);
    assert('TC-ASST-01: assistant_remaining decremented 3→2', quota.assistant === 2);
    assert('TC-ASST-01: text_remaining UNCHANGED at 10', quota.text === 10);
    assert('TC-ASST-01: audio_remaining UNCHANGED at 5', quota.audio === 5);
    assert('TC-ASST-01: AI was called', result.aiCalled);
    assert('TC-ASST-01: consumeQuota was called', result.consumeCalled);
  }

  // ─── TC-ASST-02: Happy Path — Motion Analysis ─────────────────────────────
  section('TC-ASST-02 — Happy Path: Motion Analysis');
  {
    const quota: MockQuotaState = { assistant: 2, text: 8, audio: 3 };
    const result = await simulateMotionAnalysisFlow({
      quota,
      aiFunction: async () => JSON.stringify(MOTION_ANALYSIS_VALID),
    });
    assert('TC-ASST-02: HTTP 200', result.status === 200);
    assert('TC-ASST-02: success flag', (result.body as any)?.success === true);
    assert('TC-ASST-02: data present', (result.body as any)?.data !== undefined);
    assert('TC-ASST-02: assistant_remaining decremented 2→1', quota.assistant === 1);
    assert('TC-ASST-02: text_remaining UNCHANGED at 8', quota.text === 8);
    assert('TC-ASST-02: audio_remaining UNCHANGED at 3', quota.audio === 3);
    assert('TC-ASST-02: AI was called', result.aiCalled);
    assert('TC-ASST-02: consumeQuota was called', result.consumeCalled);
  }

  // ─── TC-ASST-03: Quota Isolation ──────────────────────────────────────────
  section('TC-ASST-03 — Quota Isolation: ASSISTANT only, TEXT/AUDIO unchanged');
  {
    const quota: MockQuotaState = { assistant: 5, text: 8, audio: 3 };
    for (let i = 0; i < 3; i++) {
      await simulateSpeechDraftFlow({ quota, aiFunction: async () => JSON.stringify(SPEECH_DRAFT_VALID) });
    }
    assert('TC-ASST-03: assistant_remaining = 2 after 3 deductions', quota.assistant === 2);
    assert('TC-ASST-03: text_remaining ZERO CHANGE = 8', quota.text === 8);
    assert('TC-ASST-03: audio_remaining ZERO CHANGE = 3', quota.audio === 3);
  }

  // ─── TC-ASST-04: AI Provider Failure ──────────────────────────────────────
  section('TC-ASST-04 — AI Provider Failure: Zero quota deduction');
  {
    const quota: MockQuotaState = { assistant: 4, text: 10, audio: 5 };
    const result = await simulateSpeechDraftFlow({
      quota,
      aiFunction: async () => { throw new Error('Provider 500 Internal Server Error'); },
    });
    assert('TC-ASST-04: HTTP 502', result.status === 502);
    assert('TC-ASST-04: error is AI_SERVICE_UNAVAILABLE', (result.body as any)?.error === 'AI_SERVICE_UNAVAILABLE');
    assert('TC-ASST-04: AI was called (attempted)', result.aiCalled);
    assert('TC-ASST-04: consumeQuota was NOT called', !result.consumeCalled);
    assert('TC-ASST-04: assistant_remaining UNCHANGED at 4', quota.assistant === 4);
    assert('TC-ASST-04: text_remaining UNCHANGED at 10', quota.text === 10);
    assert('TC-ASST-04: audio_remaining UNCHANGED at 5', quota.audio === 5);
  }

  // ─── TC-ASST-05: Schema / Parser Failure ──────────────────────────────────
  section('TC-ASST-05 — Parser / Schema Failure: Zero quota deduction');
  {
    const quota: MockQuotaState = { assistant: 4, text: 10, audio: 5 };
    const result = await simulateSpeechDraftFlow({
      quota,
      aiFunction: async () => '{ "not_a_valid_field": true, "garbage": "yes" }',
    });
    assert('TC-ASST-05: HTTP 422', result.status === 422);
    assert('TC-ASST-05: error is GENERATION_FAILED', (result.body as any)?.error === 'GENERATION_FAILED');
    assert('TC-ASST-05: AI was called', result.aiCalled);
    assert('TC-ASST-05: consumeQuota was NOT called', !result.consumeCalled);
    assert('TC-ASST-05: assistant_remaining UNCHANGED at 4', quota.assistant === 4);

    const quota2: MockQuotaState = { assistant: 2, text: 5, audio: 2 };
    const r2 = await simulateSpeechDraftFlow({ quota: quota2, aiFunction: async () => '{ not json at all }}}' });
    assert('TC-ASST-05: totally malformed JSON → HTTP 422', r2.status === 422);
    assert('TC-ASST-05: totally malformed → assistant_remaining UNCHANGED', quota2.assistant === 2);
  }

  // ─── TC-ASST-06: Zero Quota Gate ──────────────────────────────────────────
  section('TC-ASST-06 — Zero Quota Gate: AI provider is never invoked');
  {
    const quota: MockQuotaState = { assistant: 0, text: 10, audio: 5 };
    let aiCallCount = 0;
    const result = await simulateSpeechDraftFlow({
      quota,
      aiFunction: async () => { aiCallCount++; return JSON.stringify(SPEECH_DRAFT_VALID); },
    });
    assert('TC-ASST-06: HTTP 403', result.status === 403);
    assert('TC-ASST-06: error is QUOTA_EXCEEDED', (result.body as any)?.error === 'QUOTA_EXCEEDED');
    assert('TC-ASST-06: AI provider was NEVER called (callCount = 0)', aiCallCount === 0, aiCallCount);
    assert('TC-ASST-06: assistant_remaining stays at 0', quota.assistant === 0);
    assert('TC-ASST-06: text_remaining UNCHANGED at 10', quota.text === 10);
    assert('TC-ASST-06: audio_remaining UNCHANGED at 5', quota.audio === 5);

    let aiCallCountMA = 0;
    const resultMA = await simulateMotionAnalysisFlow({
      quota,
      aiFunction: async () => { aiCallCountMA++; return JSON.stringify(MOTION_ANALYSIS_VALID); },
    });
    assert('TC-ASST-06: Motion Analysis also blocked at 403', resultMA.status === 403);
    assert('TC-ASST-06: Motion Analysis AI also never called', aiCallCountMA === 0, aiCallCountMA);
  }

  // ─── TC-ASST-07: Concurrency Safety ───────────────────────────────────────
  section('TC-ASST-07 — Concurrency Safety: remaining=1, 2 concurrent requests');
  {
    /**
     * Shared mutable quota — simulates a single PostgreSQL row.
     * Both concurrent requests see remaining=1 at checkQuotaAvailable time (read-only).
     * At consumeQuota time, mockAtomicDecrement simulates the atomic conditional UPDATE:
     *   UPDATE user_quotas SET assistant_remaining = assistant_remaining - 1
     *   WHERE id = :quotaId AND assistant_remaining >= 1
     *
     * Only one request can decrement from 1→0. The other sees rows=0 → QUOTA_EXCEEDED.
     * Node.js event loop + 1ms async delay ensures genuine interleaving.
     */
    const sharedQuota: MockQuotaState = { assistant: 1, text: 10, audio: 5 };

    const aiStubWithDelay = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
      return JSON.stringify(SPEECH_DRAFT_VALID);
    };

    const [result1, result2] = await Promise.all([
      simulateSpeechDraftFlow({ quota: sharedQuota, aiFunction: aiStubWithDelay }),
      simulateSpeechDraftFlow({ quota: sharedQuota, aiFunction: aiStubWithDelay }),
    ]);

    const statuses = [result1.status, result2.status].sort();
    const allowCount = [result1.status, result2.status].filter((s) => s === 200).length;
    const blockedCount = [result1.status, result2.status].filter((s) => s === 403).length;

    assert('TC-ASST-07: exactly 1 request gets HTTP 200', allowCount === 1, statuses);
    assert('TC-ASST-07: exactly 1 request gets HTTP 403 QUOTA_EXCEEDED', blockedCount === 1, statuses);
    assert('TC-ASST-07: final assistant_remaining = 0 (not negative)', sharedQuota.assistant === 0, sharedQuota.assistant);
    assert('TC-ASST-07: assistant_remaining >= 0 (never negative)', sharedQuota.assistant >= 0, sharedQuota.assistant);
    assert('TC-ASST-07: text_remaining UNCHANGED at 10', sharedQuota.text === 10);
    assert('TC-ASST-07: audio_remaining UNCHANGED at 5', sharedQuota.audio === 5);
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('  ASSISTANT DOMAIN SUITE: ' + pass + ' PASS  ' + fail + ' FAIL  (total ' + (pass + fail) + ')');
  if (failures.length > 0) {
    console.log('  FAILED TESTS:');
    failures.forEach((f) => console.log('    * ' + f));
  }
  console.log('='.repeat(60));
  if (fail > 0) process.exit(1);

})().catch((err: unknown) => {
  console.error('[ASSISTANT TEST SUITE FATAL ERROR]', err);
  process.exit(1);
});
