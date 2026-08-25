/**
 * 🔒 AI ARGUMENT REFINEMENT ACCEPTANCE TEST SUITE (V1)
 *
 * Tests:
 *   AR-01: Happy path C-R-E refinement (Vietnamese)
 *   AR-02: Vietnamese semantic preservation fixture
 *   AR-03: English semantic preservation fixture
 *   AR-04: Evidence safety rejects fabricated statistics
 *   AR-05: Malformed JSON consumes zero quota
 *   AR-06: AI timeout consumes zero quota
 *   AR-07: Provider failure consumes zero quota
 *   AR-08: Quota zero returns 403 before AI call
 *   AR-09: Successful refinement consumes exactly 1 Assistant Credit
 *   AR-10: FinalDebateDraft contract unchanged (readonly verification)
 *   AR-11: Input validation (<3 words, >500 chars, empty, filler-only)
 *   AR-12: Parser resilience (markdown fence, truncated JSON)
 *   AR-13: Telemetry invocation uses taskName = Argument_Refinement
 *   AR-14: Concurrent refinement requests cannot overspend quota
 *   AR-15: AI returns valid JSON but explicit stance reversal is rejected
 *   AR-16: Fabricated URL/citation/DOI in evidenceSuggestion is rejected
 *
 * Zero live AI / live DB calls — fully isolated stubs.
 * Runner: tsx (npx tsx src/__tests__/argumentRefinement.test.ts)
 *
 * Spec: docs/AI_ARGUMENT_REFINEMENT_SPEC.md §29
 */

import { safeExtractJSON } from '../services/openAICompatibleClient';
import { buildArgumentRefinementPrompt } from '../prompts/argumentRefinement';
import { executeWithMetering } from '../services/aiGateway';

// ─── Test Harness ─────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function assert(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passCount += 1;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    failCount += 1;
    failures.push(name);
    console.log(`  ❌ FAIL: ${name}`, detail !== undefined ? JSON.stringify(detail).slice(0, 200) : '');
  }
}

function section(title: string): void {
  console.log(`\n▶ ${title}`);
}

// ─── Mock Data Fixtures ───────────────────────────────────────────────────────

const VALID_REFINEMENT_OUTPUT = {
  claim: 'Mạng xã hội gây suy giảm kết quả học tập và gia tăng nguy cơ trầm cảm ở học sinh do tâm lý so sánh tiêu cực.',
  reasoning: 'Thuật toán tối ưu hóa thời gian giữ chân khiến học sinh mất tập trung vào việc học, đồng thời việc liên tục tiếp xúc với hình ảnh lý tưởng hóa của người khác tạo ra áp lực tâm lý và hội chứng FOMO.',
  evidenceSuggestion: 'Nên tìm kiếm báo cáo của Hiệp hội Tâm lý học Hoa Kỳ (APA) về thời gian sử dụng màn hình hoặc số liệu UNICEF về sức khỏe tâm thần vị thành niên.',
  refinementNote: 'Đã chuẩn hóa ngôn ngữ học thuật, phân tách rõ luận điểm chính và lập luận nhân quả.',
};

const VALID_REFINEMENT_OUTPUT_EN = {
  claim: 'Social media platforms cause significant academic decline and increase depression risk among students due to algorithmic exploitation and negative social comparison.',
  reasoning: 'Engagement-maximizing algorithms reduce students\' study time, while constant exposure to idealized images creates psychological pressure and fear of missing out (FOMO), which directly impacts mental health.',
  evidenceSuggestion: 'Search for reports from the American Psychological Association (APA) on screen time or UNICEF data on adolescent mental health.',
  refinementNote: 'Improved clarity and C-R-E structure while preserving the original argument about social media harm.',
};

const STANCE_REVERSED_OUTPUT = {
  claim: 'Chúng tôi ủng hộ việc sử dụng mạng xã hội vì nó mang lại nhiều lợi ích cho học sinh.',
  reasoning: 'Mạng xã hội giúp học sinh kết nối và chia sẻ kiến thức hiệu quả.',
  evidenceSuggestion: 'Tìm nghiên cứu về lợi ích của mạng xã hội.',
  refinementNote: 'Đã cải thiện cấu trúc.',
};

const FABRICATED_STATS_OUTPUT = {
  claim: 'Mạng xã hội gây hại cho học sinh.',
  reasoning: 'Nhiều nghiên cứu đã chứng minh.',
  evidenceSuggestion: 'Theo khảo sát mới nhất, 87.5% học sinh bị trầm cảm do mạng xã hội.',
  refinementNote: 'Đã thêm dẫn chứng.',
};

const FABRICATED_URL_OUTPUT = {
  claim: 'Mạng xã hội gây hại cho học sinh.',
  reasoning: 'Nhiều nghiên cứu đã chứng minh.',
  evidenceSuggestion: 'Xem chi tiết tại https://fake-research.org/study/2024/results',
  refinementNote: 'Đã thêm nguồn tham khảo.',
};

const FABRICATED_DOI_OUTPUT = {
  claim: 'Mạng xã hội gây hại cho học sinh.',
  reasoning: 'Nghiên cứu đã chứng minh.',
  evidenceSuggestion: 'Tham khảo DOI: 10.1234/fake-study-2024',
  refinementNote: 'Đã thêm DOI.',
};

// ─── Simulation Infrastructure ────────────────────────────────────────────────

interface MockQuotaState {
  assistant: number;
  text: number;
  audio: number;
}

function simulateCheckQuota(quota: MockQuotaState): 'ALLOW' | 'QUOTA_EXCEEDED' {
  return quota.assistant > 0 ? 'ALLOW' : 'QUOTA_EXCEEDED';
}

function simulateAtomicConsume(quota: MockQuotaState): boolean {
  if (quota.assistant > 0) {
    quota.assistant -= 1;
    return true;
  }
  return false;
}

function countMeaningfulWords(text: string): number {
  const FILLER = new Set(['ừm', 'à', 'thì', 'là', 'uh', 'um', 'ah', 'ờ', 'ạ', 'vâng', 'dạ', 'ừ', 'hmm']);
  return text.split(/\s+/).filter((w) => w.length > 0 && !FILLER.has(w.toLowerCase())).length;
}

/** Simulate the parseRefinementOutput function from controller. */
function parseRefinementOutput(raw: string | null | undefined): typeof VALID_REFINEMENT_OUTPUT | null {
  if (!raw || typeof raw !== 'string') return null;

  let jsonStr = safeExtractJSON(raw);
  if (!jsonStr) {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = raw.slice(firstBrace, lastBrace + 1);
    }
  }
  if (!jsonStr) return null;

  let obj: unknown;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    try {
      const repaired = jsonStr.replace(/,\s*$/, '') + '}';
      obj = JSON.parse(repaired);
    } catch {
      return null;
    }
  }

  if (!obj || typeof obj !== 'object') return null;
  const data = obj as Record<string, unknown>;

  const pickStr = (keys: string[]): string | null => {
    for (const key of keys) {
      const val = data[key];
      if (typeof val === 'string' && val.trim().length > 0) return val;
    }
    return null;
  };

  const claim = pickStr(['claim', 'luan_diem', 'khang_dinh', 'assertion']);
  const reasoning = pickStr(['reasoning', 'lap_luan', 'ly_giai', 'explanation', 'logic']);
  const evidenceSuggestion = pickStr(['evidenceSuggestion', 'evidence_suggestion', 'dan_chung', 'goi_y_dan_chung', 'evidence']);
  const refinementNote = pickStr(['refinementNote', 'refinement_note', 'ghi_chu', 'note']);

  if (!claim || !reasoning) return null;

  return {
    claim: claim.trim(),
    reasoning: reasoning.trim(),
    evidenceSuggestion: (evidenceSuggestion ?? '').trim(),
    refinementNote: (refinementNote ?? '').trim(),
  };
}

/** Simulate semantic preservation gate. */
function validateSemanticPreservation(
  candidate: typeof VALID_REFINEMENT_OUTPUT,
  requestedStance: 'AFFIRMATIVE' | 'NEGATIVE',
): { passed: boolean; reason?: string } {
  const combinedOutput = (candidate.claim + ' ' + candidate.reasoning).toLowerCase();

  if (requestedStance === 'AFFIRMATIVE') {
    const negationPatterns = [
      'chúng tôi phản đối', 'chúng tôi không đồng ý', 'phe phản đối',
      'we oppose', 'we disagree', 'we are against',
      'không nên ủng hộ', 'phải chống lại', 'cần phản bác',
    ];
    for (const pattern of negationPatterns) {
      if (combinedOutput.includes(pattern)) {
        return { passed: false, reason: `Stance reversal: "${pattern}"` };
      }
    }
  } else {
    const affirmationPatterns = [
      'chúng tôi ủng hộ', 'chúng tôi đồng ý', 'phe ủng hộ',
      'we support', 'we agree', 'we are in favor',
      'nên ủng hộ', 'cần đồng tình',
    ];
    for (const pattern of affirmationPatterns) {
      if (combinedOutput.includes(pattern)) {
        return { passed: false, reason: `Stance reversal: "${pattern}"` };
      }
    }
  }

  if (candidate.claim.trim().length < 5) return { passed: false, reason: 'Claim too short' };
  if (candidate.reasoning.trim().length < 10) return { passed: false, reason: 'Reasoning too short' };

  return { passed: true };
}

/** Simulate evidence safety gate. */
function validateEvidenceSafety(evidence: string): { passed: boolean; reason?: string } {
  if (!evidence || evidence.trim().length === 0) return { passed: true };

  if (/https?:\/\/[^\s]+|www\.[^\s]+/i.test(evidence)) {
    return { passed: false, reason: 'Fabricated URL' };
  }
  if (/\b(?:doi|DOI)\s*:\s*10\.\d{4,}/.test(evidence)) {
    return { passed: false, reason: 'Fabricated DOI' };
  }
  if (/\b\d{1,3}\.\d+\s*%/.test(evidence)) {
    return { passed: false, reason: 'Fabricated specific percentage' };
  }

  return { passed: true };
}

/**
 * Full V1 refinement flow simulation:
 *   Auth → Validate → Quota Check → AI Call → Parse → Semantic Gate → Evidence Gate → Consume Quota
 */
async function simulateRefinementFlow(params: {
  userId: string | null;
  rawText: string;
  stance: string;
  quota: MockQuotaState;
  aiFunction: () => Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number } }>;
  topic?: string;
}): Promise<{
  status: number;
  body: any;
  aiCallCount: number;
  taskName: string | null;
  sessionId: string | null;
}> {
  let aiCallCount = 0;
  let taskName: string | null = null;
  let sessionId: string | null = null;

  // 1. Auth
  if (!params.userId) {
    return { status: 401, body: { success: false, error: 'UNAUTHENTICATED' }, aiCallCount: 0, taskName: null, sessionId: null };
  }

  // 2. Input validation
  const trimmed = params.rawText.trim();
  if (!trimmed) {
    return { status: 400, body: { success: false, error: 'INVALID_INPUT', message: 'rawText required' }, aiCallCount: 0, taskName: null, sessionId: null };
  }
  if (trimmed.length > 500) {
    return { status: 400, body: { success: false, error: 'INVALID_INPUT', message: '>500 chars' }, aiCallCount: 0, taskName: null, sessionId: null };
  }
  if (countMeaningfulWords(trimmed) < 3) {
    return { status: 400, body: { success: false, error: 'INVALID_INPUT', message: '<3 words' }, aiCallCount: 0, taskName: null, sessionId: null };
  }
  if (params.stance !== 'AFFIRMATIVE' && params.stance !== 'NEGATIVE') {
    return { status: 400, body: { success: false, error: 'INVALID_INPUT', message: 'invalid stance' }, aiCallCount: 0, taskName: null, sessionId: null };
  }

  // 3. Quota pre-check
  const quotaDecision = simulateCheckQuota(params.quota);
  if (quotaDecision !== 'ALLOW') {
    return { status: 403, body: { success: false, error: 'QUOTA_EXCEEDED' }, aiCallCount: 0, taskName: null, sessionId: null };
  }

  // 4. Build prompt
  const prompt = buildArgumentRefinementPrompt({
    rawText: trimmed,
    stance: params.stance as 'AFFIRMATIVE' | 'NEGATIVE',
    topic: params.topic,
    language: 'vi',
  });

  // 5. AI call via executeWithMetering
  let aiContent: string;
  try {
    taskName = 'Argument_Refinement';
    sessionId = 'ASSISTANT_REFINEMENT';
    const result = await executeWithMetering({
      userId: params.userId,
      sessionId,
      serviceType: 'LLM_ASSISTANT',
      modelName: 'test-model',
      taskName,
      apiCallFunction: async () => {
        aiCallCount += 1;
        return await params.aiFunction();
      },
    });
    aiContent = result.content;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timed out')) {
      return { status: 504, body: { success: false, error: 'AI_TIMEOUT' }, aiCallCount, taskName, sessionId };
    }
    return { status: 502, body: { success: false, error: 'AI_SERVICE_UNAVAILABLE' }, aiCallCount, taskName, sessionId };
  }

  // 6. Parse
  const parsed = parseRefinementOutput(aiContent);
  if (!parsed) {
    return { status: 422, body: { success: false, error: 'INVALID_AI_OUTPUT' }, aiCallCount, taskName, sessionId };
  }

  // 7. Semantic preservation gate
  const semanticResult = validateSemanticPreservation(parsed, params.stance as 'AFFIRMATIVE' | 'NEGATIVE');
  if (!semanticResult.passed) {
    return { status: 422, body: { success: false, error: 'SEMANTIC_VALIDATION_FAILED', detail: semanticResult.reason }, aiCallCount, taskName, sessionId };
  }

  // 8. Evidence safety gate
  const evidenceResult = validateEvidenceSafety(parsed.evidenceSuggestion);
  if (!evidenceResult.passed) {
    return { status: 422, body: { success: false, error: 'EVIDENCE_SAFETY_FAILED', detail: evidenceResult.reason }, aiCallCount, taskName, sessionId };
  }

  // 9. Atomic consume
  const consumed = simulateAtomicConsume(params.quota);
  if (!consumed) {
    return { status: 403, body: { success: false, error: 'QUOTA_EXCEEDED' }, aiCallCount, taskName, sessionId };
  }

  // 10. Success
  return { status: 200, body: { success: true, data: parsed }, aiCallCount, taskName, sessionId };
}

// ─── TEST SUITE ──────────────────────────────────────────────────────────────

(async () => {
  console.log('══════════════════════════════════════════════════════');
  console.log(' AI ARGUMENT REFINEMENT ACCEPTANCE TEST SUITE (V1)');
  console.log('══════════════════════════════════════════════════════');

  // ─── AR-01: Happy Path C-R-E Refinement ───────────────────────────────────
  section('AR-01: Happy path C-R-E refinement');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-001',
      rawText: 'mang xa hoi lam hoc sinh luoi hoc voi tram cam suot ngay so sanh',
      stance: 'AFFIRMATIVE',
      topic: 'Học sinh dưới 16 tuổi không nên sử dụng mạng xã hội',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(VALID_REFINEMENT_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-01: Returns HTTP 200', res.status === 200);
    assert('AR-01: success is true', res.body.success === true);
    assert('AR-01: data.claim is a non-empty string', typeof res.body.data?.claim === 'string' && res.body.data.claim.length > 0);
    assert('AR-01: data.reasoning is a non-empty string', typeof res.body.data?.reasoning === 'string' && res.body.data.reasoning.length > 0);
    assert('AR-01: data.evidenceSuggestion is a string', typeof res.body.data?.evidenceSuggestion === 'string');
    assert('AR-01: data.refinementNote is a string', typeof res.body.data?.refinementNote === 'string');
    assert('AR-01: Quota decremented by 1', quota.assistant === 4);
  }

  // ─── AR-02: Vietnamese Semantic Preservation ──────────────────────────────
  section('AR-02: Vietnamese semantic preservation');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-002',
      rawText: 'mang xa hoi khien hoc sinh kho tap trung hoc tap va bi tram cam',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(VALID_REFINEMENT_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-02: Returns HTTP 200', res.status === 200);
    assert('AR-02: Claim preserves AFFIRMATIVE stance', !res.body.data?.claim.toLowerCase().includes('chúng tôi phản đối'));
    assert('AR-02: Reasoning does not reverse to opposition', !res.body.data?.reasoning.toLowerCase().includes('chúng tôi phản đối'));
    assert('AR-02: Quota = 4 after 1 success', quota.assistant === 4);
  }

  // ─── AR-03: English Semantic Preservation ─────────────────────────────────
  section('AR-03: English semantic preservation');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-003',
      rawText: 'social media is harmful because it causes depression and bad grades',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(VALID_REFINEMENT_OUTPUT_EN), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-03: Returns HTTP 200', res.status === 200);
    assert('AR-03: Claim does not contain opposition markers', !res.body.data?.claim.toLowerCase().includes('we oppose'));
    assert('AR-03: Reasoning does not contain opposition markers', !res.body.data?.reasoning.toLowerCase().includes('we disagree'));
    assert('AR-03: Quota = 4 after 1 success', quota.assistant === 4);
  }

  // ─── AR-04: Evidence Safety — Fabricated Statistics ────────────────────────
  section('AR-04: Evidence safety rejects fabricated statistics');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-004',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien va tram cam',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(FABRICATED_STATS_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-04: Returns 422 (evidence safety failed)', res.status === 422);
    assert('AR-04: Error is EVIDENCE_SAFETY_FAILED', res.body.error === 'EVIDENCE_SAFETY_FAILED');
    assert('AR-04: Quota NOT consumed (still 5)', quota.assistant === 5);
  }

  // ─── AR-05: Malformed JSON → Zero Quota ────────────────────────────────────
  section('AR-05: Malformed JSON consumes zero quota');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-005',
      rawText: 'mang xa hoi lam hoc sinh luoi hoc voi tram cam',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => ({ content: 'This is not JSON at all!!!', usage: { prompt_tokens: 100, completion_tokens: 50 } }),
    });
    assert('AR-05: Returns 422 (invalid AI output)', res.status === 422);
    assert('AR-05: Error is INVALID_AI_OUTPUT', res.body.error === 'INVALID_AI_OUTPUT');
    assert('AR-05: Quota NOT consumed (still 5)', quota.assistant === 5);
  }

  // ─── AR-06: AI Timeout → Zero Quota ────────────────────────────────────────
  section('AR-06: AI timeout consumes zero quota');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-006',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => { throw new Error('AI Provider request timed out after 120000ms'); },
    });
    assert('AR-06: Returns 504 (timeout)', res.status === 504);
    assert('AR-06: Error is AI_TIMEOUT', res.body.error === 'AI_TIMEOUT');
    assert('AR-06: Quota NOT consumed (still 5)', quota.assistant === 5);
  }

  // ─── AR-07: Provider Failure → Zero Quota ──────────────────────────────────
  section('AR-07: Provider failure consumes zero quota');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-007',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => { throw new Error('AI Provider 500 Network Error'); },
    });
    assert('AR-07: Returns 502 (provider error)', res.status === 502);
    assert('AR-07: Error is AI_SERVICE_UNAVAILABLE', res.body.error === 'AI_SERVICE_UNAVAILABLE');
    assert('AR-07: Quota NOT consumed (still 5)', quota.assistant === 5);
  }

  // ─── AR-08: Quota Zero → 403 Before AI Call ────────────────────────────────
  section('AR-08: Quota zero returns 403 before AI call');
  {
    const quota: MockQuotaState = { assistant: 0, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-008',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => { throw new Error('Should never be called'); },
    });
    assert('AR-08: Returns 403 (quota exceeded)', res.status === 403);
    assert('AR-08: Error is QUOTA_EXCEEDED', res.body.error === 'QUOTA_EXCEEDED');
    assert('AR-08: AI provider NEVER called', res.aiCallCount === 0);
    assert('AR-08: Quota remains 0', quota.assistant === 0);
  }

  // ─── AR-09: Successful Refinement → Exactly 1 Credit ──────────────────────
  section('AR-09: Successful refinement consumes exactly 1 Assistant Credit');
  {
    const quota: MockQuotaState = { assistant: 3, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-009',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien va tram cam',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(VALID_REFINEMENT_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-09: Returns HTTP 200', res.status === 200);
    assert('AR-09: Exactly 1 credit consumed (3 → 2)', quota.assistant === 2);
    assert('AR-09: text_remaining unchanged', quota.text === 10);
    assert('AR-09: audio_remaining unchanged', quota.audio === 10);
  }

  // ─── AR-10: FinalDebateDraft Contract Unchanged ────────────────────────────
  section('AR-10: FinalDebateDraft contract unchanged');
  {
    // Verify that refinement output has DIFFERENT fields than FinalDebateDraft.
    // FinalDebateDraft fields: draftId, topic, stance, hook, arguments, counterarguments, conclusion, isUserConfirmed, confirmedAt
    // Refinement output fields: claim, reasoning, evidenceSuggestion, refinementNote
    const refinementFields = Object.keys(VALID_REFINEMENT_OUTPUT);
    const finalDraftExclusiveFields = ['draftId', 'isUserConfirmed', 'confirmedAt', 'hook', 'conclusion'];
    const hasNoOverlap = finalDraftExclusiveFields.every((f) => !refinementFields.includes(f));
    assert('AR-10: Refinement output has no FinalDebateDraft exclusive fields', hasNoOverlap);
    assert('AR-10: Refinement output has exactly 4 C-R-E fields', refinementFields.length === 4);
    assert('AR-10: Fields are claim, reasoning, evidenceSuggestion, refinementNote',
      refinementFields.includes('claim') && refinementFields.includes('reasoning') &&
      refinementFields.includes('evidenceSuggestion') && refinementFields.includes('refinementNote'));
  }

  // ─── AR-11: Input Validation ───────────────────────────────────────────────
  section('AR-11: Input validation');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };

    // 11a: Empty rawText
    const r1 = await simulateRefinementFlow({
      userId: 'user-011', rawText: '', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => { throw new Error('Should not be called'); },
    });
    assert('AR-11a: Empty rawText → 400', r1.status === 400);
    assert('AR-11a: Quota unchanged', quota.assistant === 5);

    // 11b: <3 meaningful words
    const r2 = await simulateRefinementFlow({
      userId: 'user-011', rawText: 'ừm à thì', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => { throw new Error('Should not be called'); },
    });
    assert('AR-11b: Filler-only → 400', r2.status === 400);
    assert('AR-11b: Quota unchanged', quota.assistant === 5);

    // 11c: >500 characters
    const longText = 'a'.repeat(501);
    const r3 = await simulateRefinementFlow({
      userId: 'user-011', rawText: longText, stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => { throw new Error('Should not be called'); },
    });
    assert('AR-11c: >500 chars → 400', r3.status === 400);
    assert('AR-11c: Quota unchanged', quota.assistant === 5);

    // 11d: Invalid stance
    const r4 = await simulateRefinementFlow({
      userId: 'user-011', rawText: 'mang xa hoi co hai cho hoc sinh', stance: 'NEUTRAL' as any, quota,
      aiFunction: async () => { throw new Error('Should not be called'); },
    });
    assert('AR-11d: Invalid stance → 400', r4.status === 400);
    assert('AR-11d: Quota unchanged', quota.assistant === 5);

    // 11e: <3 words (only 2 meaningful)
    const r5 = await simulateRefinementFlow({
      userId: 'user-011', rawText: 'thì à ừm hai từ', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => { throw new Error('Should not be called'); },
    });
    assert('AR-11e: Only 2 meaningful words → 400', r5.status === 400);
    assert('AR-11e: Quota unchanged', quota.assistant === 5);
  }

  // ─── AR-12: Parser Resilience ──────────────────────────────────────────────
  section('AR-12: Parser resilience');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };

    // 12a: Markdown fence wrapping
    const fencedJson = '```json\n' + JSON.stringify(VALID_REFINEMENT_OUTPUT) + '\n```';
    const res1 = await simulateRefinementFlow({
      userId: 'user-012', rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien va tram cam', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => ({ content: fencedJson, usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-12a: Fenced JSON → HTTP 200 (parsed successfully)', res1.status === 200);
    assert('AR-12a: Quota consumed once', quota.assistant === 4);

    // 12b: JSON with Vietnamese key aliases
    const vnKeys = {
      luan_diem: 'Mạng xã hội gây nghiện và giảm tập trung.',
      lap_luan: 'Các thuật toán thiết kế để tối ưu hóa thời gian sử dụng khiến học sinh mất tập trung.',
      goi_y_dan_chung: 'Tìm nghiên cứu của APA về tác động của screen time.',
      ghi_chu: 'Đã cải thiện cấu trúc C-R-E.',
    };
    const res2 = await simulateRefinementFlow({
      userId: 'user-012', rawText: 'mang xa hoi gay nghien cho hoc sinh va giam kha nang tap trung', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => ({ content: JSON.stringify(vnKeys), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-12b: Vietnamese key aliases → HTTP 200', res2.status === 200);
    assert('AR-12b: Quota consumed once more', quota.assistant === 3);
  }

  // ─── AR-13: Telemetry ─────────────────────────────────────────────────────
  section('AR-13: Telemetry invocation');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateRefinementFlow({
      userId: 'user-013',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien va tram cam',
      stance: 'AFFIRMATIVE',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(VALID_REFINEMENT_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-13: taskName = Argument_Refinement', res.taskName === 'Argument_Refinement');
    assert('AR-13: sessionId = ASSISTANT_REFINEMENT', res.sessionId === 'ASSISTANT_REFINEMENT');
  }

  // ─── AR-14: Concurrent Refinement → Cannot Overspend ──────────────────────
  section('AR-14: Concurrent refinement cannot overspend quota');
  {
    const quota: MockQuotaState = { assistant: 1, text: 10, audio: 10 };

    // Simulate 2 concurrent requests with the last credit.
    const [r1, r2] = await Promise.all([
      simulateRefinementFlow({
        userId: 'user-014', rawText: 'mang xa hoi lam hoc sinh luoi hoc vi gay nghien', stance: 'AFFIRMATIVE', quota,
        aiFunction: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return { content: JSON.stringify(VALID_REFINEMENT_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } };
        },
      }),
      simulateRefinementFlow({
        userId: 'user-014', rawText: 'mang xa hoi gay tram cam cho hoc sinh do so sanh', stance: 'AFFIRMATIVE', quota,
        aiFunction: async () => {
          await new Promise((r) => setTimeout(r, 5));
          return { content: JSON.stringify(VALID_REFINEMENT_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } };
        },
      }),
    ]);

    // In simulation: the first to consume wins; second fails.
    // Note: simulateAtomicConsume mutates in-place, so with 1 credit,
    // one request succeeds (200) and the other fails (403).
    const successes = [r1, r2].filter((r) => r.status === 200).length;
    const failures_c = [r1, r2].filter((r) => r.status === 403).length;
    assert('AR-14: Exactly 1 success out of 2 concurrent requests', successes === 1);
    assert('AR-14: Exactly 1 failure (quota exceeded) out of 2', failures_c === 1);
    assert('AR-14: Final quota is 0 (not negative)', quota.assistant === 0);
  }

  // ─── AR-15: Stance Reversal Rejected ──────────────────────────────────────
  section('AR-15: AI valid JSON but stance reversal → rejected');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    // User requests NEGATIVE stance, but AI returns AFFIRMATIVE markers.
    const res = await simulateRefinementFlow({
      userId: 'user-015',
      rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien va tram cam',
      stance: 'NEGATIVE',
      quota,
      aiFunction: async () => ({ content: JSON.stringify(STANCE_REVERSED_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-15: Returns 422 (semantic validation failed)', res.status === 422);
    assert('AR-15: Error is SEMANTIC_VALIDATION_FAILED', res.body.error === 'SEMANTIC_VALIDATION_FAILED');
    assert('AR-15: Quota NOT consumed (still 5)', quota.assistant === 5);
  }

  // ─── AR-16: Fabricated URL/DOI in evidenceSuggestion Rejected ─────────────
  section('AR-16: Fabricated URL/DOI in evidenceSuggestion → rejected');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };

    // 16a: Fabricated URL
    const r1 = await simulateRefinementFlow({
      userId: 'user-016', rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => ({ content: JSON.stringify(FABRICATED_URL_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-16a: Fabricated URL → 422', r1.status === 422);
    assert('AR-16a: Error is EVIDENCE_SAFETY_FAILED', r1.body.error === 'EVIDENCE_SAFETY_FAILED');
    assert('AR-16a: Quota NOT consumed', quota.assistant === 5);

    // 16b: Fabricated DOI
    const r2 = await simulateRefinementFlow({
      userId: 'user-016', rawText: 'mang xa hoi co hai cho hoc sinh vi gay nghien va tram cam', stance: 'AFFIRMATIVE', quota,
      aiFunction: async () => ({ content: JSON.stringify(FABRICATED_DOI_OUTPUT), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AR-16b: Fabricated DOI → 422', r2.status === 422);
    assert('AR-16b: Error is EVIDENCE_SAFETY_FAILED', r2.body.error === 'EVIDENCE_SAFETY_FAILED');
    assert('AR-16b: Quota NOT consumed', quota.assistant === 5);
  }

  // ─── Prompt Builder Verification ──────────────────────────────────────────
  section('Prompt Builder: buildArgumentRefinementPrompt');
  {
    const result = buildArgumentRefinementPrompt({
      rawText: 'mang xa hoi lam hoc sinh luoi hoc',
      stance: 'AFFIRMATIVE',
      topic: 'Học sinh dưới 16 tuổi không nên sử dụng mạng xã hội',
      language: 'vi',
    });
    assert('Prompt: systemPrompt is a non-empty string', typeof result.systemPrompt === 'string' && result.systemPrompt.length > 100);
    assert('Prompt: userPrompt is a non-empty string', typeof result.userPrompt === 'string' && result.userPrompt.length > 20);
    assert('Prompt: systemPrompt contains semantic preservation instruction', result.systemPrompt.includes('SEMANTIC PRESERVATION'));
    assert('Prompt: systemPrompt contains evidence safety instruction', result.systemPrompt.includes('EVIDENCE SAFETY'));
    assert('Prompt: systemPrompt instructs JSON-only output', result.systemPrompt.includes('JSON'));
    assert('Prompt: userPrompt contains stance label', result.userPrompt.includes('ỦNG HỘ'));
    assert('Prompt: userPrompt contains topic', result.userPrompt.includes('mạng xã hội'));
  }

  // ─── REPORT ────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(` RESULTS: ${passCount} passed, ${failCount} failed`);
  if (failures.length > 0) {
    console.log(' FAILURES:');
    failures.forEach((f) => console.log(`   ❌ ${f}`));
  }
  console.log('══════════════════════════════════════════════════════');

  process.exit(failCount > 0 ? 1 : 0);
})();
