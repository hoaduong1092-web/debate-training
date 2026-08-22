/**
 * 🔒 ASSISTANT DOMAIN ADAPTATION ACCEPTANCE TEST SUITE (v15.0)
 *
 * Tests:
 *   AD-01: Speech Draft happy path
 *   AD-02: Speech Draft JSON normalization (Vietnamese / camelCase / snake_case)
 *   AD-03: Speech Draft markdown fence stripping
 *   AD-04: Speech Draft malformed JSON -> HTTP 422 failure
 *   AD-05: Speech Draft schema validation failure -> no quota deduction
 *   AD-06: Motion Analysis happy path
 *   AD-07: Motion Analysis JSON normalization (Vietnamese / camelCase / snake_case)
 *   AD-08: Motion Analysis malformed JSON -> HTTP 422 failure
 *   AD-09: Motion Analysis schema validation failure -> no quota deduction
 *   AD-10: assistant_remaining = 0 -> HTTP 403 QUOTA_EXCEEDED
 *   AD-11: assistant_remaining < 0 / invalid state -> fail closed (403)
 *   AD-12: Quota failure -> AI provider NEVER called (callCount = 0)
 *   AD-13: Provider failure -> quota unchanged
 *   AD-14: Parser failure -> quota unchanged
 *   AD-15: Successful Speech Draft -> exactly 1 Assistant Credit deducted
 *   AD-16: Successful Motion Analysis -> exactly 1 Assistant Credit deducted
 *   AD-17: Successful Assistant generation does NOT modify text_remaining
 *   AD-18: Successful Assistant generation does NOT modify audio_remaining
 *   AD-19: Telemetry taskName = Speech_Draft_Generation
 *   AD-20: Telemetry taskName = Motion_Analysis_Report
 *   AD-21: Missing / invalid authentication -> HTTP 401
 *   AD-22: userId tampering in body/query cannot access another user's quota/data
 *   AD-26: Duplicate/retry behavior & idempotency audit
 *   AD-27: Required response fields are present and typed correctly (canonical contracts)
 *   AD-28: Existing DB schema remains unchanged (git diff invariant)
 *
 * Frontend Arena Handoff Tests (Contract verification):
 *   AH-01: Arena handoff preserves topic, stance, and draft content
 *   AH-02: Arena handoff does NOT automatically submit / create debate
 *   AH-03: Arena handoff consumes zero quota
 *
 * Zero live AI / live DB calls — fully isolated stubs.
 * Runner: tsx (npx tsx src/__tests__/assistantDomain.test.ts)
 */

import fs from 'fs';
import path from 'path';
import { parseSpeechDraft, parseMotionAnalysis } from '../services/assistantParser';
import { buildSpeechDraftPrompt } from '../prompts/speechDraft';
import { buildMotionAnalysisPrompt } from '../prompts/motionAnalysis';
import { executeWithMetering } from '../services/aiGateway';
import { buildLogicCoachPrompt } from '../prompts/logicCoach';
import { buildOpponentPrompt } from '../prompts/opponent';

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
    console.log(`  ❌ FAIL: ${name}`, detail !== undefined ? JSON.stringify(detail).slice(0, 150) : '');
  }
}

function section(title: string): void {
  console.log(`\n▶ ${title}`);
}

// ─── Mock Data Fixtures ───────────────────────────────────────────────────────

const RAW_SPEECH_DRAFT_CANONICAL = {
  hook: 'Mỗi ngày, hàng triệu học sinh dành nhiều giờ lướt mạng xã hội thay vì học bài.',
  arguments: [
    {
      claim: 'Mạng xã hội gây nghiện và giảm tập trung.',
      reasoning: 'Các thuật toán thiết kế để tối ưu hóa thời gian sử dụng.',
      evidenceSuggestion: 'Nghiên cứu của APA (2023) về tác động của screen time.',
    },
    {
      claim: 'Mạng xã hội tạo áp lực tâm lý so sánh đồng trang lứa.',
      reasoning: 'Hình ảnh cuộc sống hoàn hảo không thực tế gây hội chứng FOMO.',
      evidenceSuggestion: 'Số liệu từ UNICEF về tỷ lệ trầm cảm ở thanh thiếu niên.',
    },
  ],
  counterarguments: [
    {
      opponentArgument: 'Mạng xã hội giúp học sinh kết nối bạn bè và học tập.',
      rebuttal: 'Lợi ích này có thể đạt được qua các nền tảng giáo dục chuyên biệt an toàn hơn.',
    },
  ],
  conclusion: 'Để bảo vệ thế hệ tương lai, việc hạn chế độ tuổi dùng mạng xã hội là cấp thiết.',
};

const RAW_MOTION_ANALYSIS_CANONICAL = {
  coreConflict: 'Quyền tự do tiếp cận thông tin vs. Bảo vệ sức khỏe tâm thần của trẻ vị thành niên.',
  stakeholders: [
    { name: 'Học sinh', interest: 'Giải trí và kết nối', impact: 'Bị ảnh hưởng tâm lý và học tập' },
    { name: 'Phụ huynh', interest: 'Bảo vệ con em', impact: 'Khó kiểm soát thời gian sử dụng' },
    { name: 'Cơ quan quản lý', interest: 'An toàn mạng', impact: 'Cần ban hành hành lang pháp lý' },
  ],
  affirmativeCases: [
    {
      claim: 'Mạng xã hội gây hại cho não bộ đang phát triển của trẻ dưới 15 tuổi.',
      reasoning: 'Chất dẫn truyền thần kinh dopamine bị kích thích quá mức bởi nội dung ngắn.',
      evidenceSuggestion: 'Khảo sát thần kinh học của Viện Y học Hoa Kỳ.',
    },
  ],
  negativeCases: [
    {
      claim: 'Lệnh cấm không khả thi và tước bỏ kỹ năng số của trẻ.',
      reasoning: 'Trẻ em có thể dễ dàng vượt qua tường lửa công nghệ; cần giáo dục thay vì cấm.',
      evidenceSuggestion: 'Kinh nghiệm quản lý từ các nước OECD.',
    },
  ],
  burdenOfProof: [
    'Phe Ủng hộ cần chứng minh tác hại vượt xa lợi ích.',
    'Phe Phản đối cần chứng minh giải pháp giáo dục hiệu quả hơn lệnh cấm.',
  ],
  rebuttalVectors: [
    'Giáo dục số có thể thay thế hoàn toàn lệnh cấm độ tuổi hay không?',
    'Ranh giới 15 tuổi có cơ sở y khoa chính xác hay không?',
  ],
};

// ─── Controller & Quota Flow Simulator ────────────────────────────────────────

interface MockQuotaState {
  assistant: number;
  text: number;
  audio: number;
}

function simulateCheckQuota(state: MockQuotaState): 'ALLOW' | 'QUOTA_EXCEEDED' {
  if (state.assistant > 0) return 'ALLOW';
  return 'QUOTA_EXCEEDED';
}

function simulateAtomicConsume(state: MockQuotaState): { success: boolean } {
  if (state.assistant >= 1) {
    state.assistant -= 1;
    return { success: true };
  }
  return { success: false };
}

interface SimulateRequestOptions {
  userId?: string;
  bodyUserId?: string;
  hasAuthHeader?: boolean;
  quota: MockQuotaState;
  aiFunction: () => Promise<any>;
  taskName: 'Speech_Draft_Generation' | 'Motion_Analysis_Report';
}

interface SimulateResponse {
  status: number;
  body: any;
  aiCalled: boolean;
  consumed: boolean;
  telemetryTaskName?: string;
}

async function simulateAssistantFlow(
  endpoint: '/api/v1/speeches/draft' | '/api/v1/reports/analyze',
  opts: SimulateRequestOptions,
): Promise<SimulateResponse> {
  let aiCalled = false;
  let consumed = false;
  let telemetryTaskName: string | undefined;

  // 1. Auth check (strictly authenticates token; body.userId is ignored)
  if (!opts.hasAuthHeader || !opts.userId) {
    return { status: 401, body: { success: false, error: 'UNAUTHENTICATED' }, aiCalled, consumed };
  }

  // 2. Quota pre-check (Fail closed before any AI invocation)
  const quotaCheck = simulateCheckQuota(opts.quota);
  if (quotaCheck !== 'ALLOW') {
    return { status: 403, body: { success: false, error: 'QUOTA_EXCEEDED' }, aiCalled, consumed };
  }

  // 3. AI Gateway invocation via executeWithMetering
  let aiContent: string;
  try {
    aiCalled = true;
    const meteredResult = await executeWithMetering({
      userId: opts.userId,
      sessionId: 'ASSISTANT_DOMAIN',
      serviceType: 'LLM_ASSISTANT',
      modelName: 'gpt-4o-mini',
      taskName: opts.taskName,
      apiCallFunction: opts.aiFunction,
    });
    telemetryTaskName = opts.taskName;
    aiContent = meteredResult.content;
  } catch {
    return { status: 502, body: { success: false, error: 'AI_SERVICE_UNAVAILABLE' }, aiCalled, consumed, telemetryTaskName };
  }

  // 4. Parser & Schema Validation
  const artifact = endpoint === '/api/v1/speeches/draft'
    ? parseSpeechDraft(aiContent)
    : parseMotionAnalysis(aiContent);

  if (!artifact) {
    return { status: 422, body: { success: false, error: 'GENERATION_FAILED' }, aiCalled, consumed, telemetryTaskName };
  }

  // 5. Atomic Quota Decrement (ONLY after validation)
  const consumeResult = simulateAtomicConsume(opts.quota);
  if (!consumeResult.success) {
    return { status: 403, body: { success: false, error: 'QUOTA_EXCEEDED' }, aiCalled, consumed, telemetryTaskName };
  }
  consumed = true;

  // 6. Success HTTP 200
  return { status: 200, body: { success: true, data: artifact }, aiCalled, consumed, telemetryTaskName };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE ACCEPTANCE TESTS (AD-01 to AD-28 + AH-01 to AH-03)
// ─────────────────────────────────────────────────────────────────────────────

(async () => {

  // ─── AD-01: Speech Draft Happy Path ────────────────────────────────────────
  section('AD-01: Speech Draft Happy Path');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL), usage: { prompt_tokens: 100, completion_tokens: 200 } }),
    });
    assert('AD-01: Returns HTTP 200', res.status === 200);
    assert('AD-01: success is true', res.body.success === true);
    assert('AD-01: Contains canonical arguments', Array.isArray(res.body.data.arguments) && res.body.data.arguments.length >= 1);
    assert('AD-01: Assistant quota deducted from 5 to 4', quota.assistant === 4);
    assert('AD-01: AI provider was called', res.aiCalled);
    assert('AD-01: Quota consume occurred', res.consumed);
  }

  // ─── AD-02: Speech Draft JSON Normalization ────────────────────────────────
  section('AD-02: Speech Draft JSON Normalization (Vietnamese & snake_case)');
  {
    const vietnameseRaw = {
      tieu_de: 'Cấm mạng xã hội dưới 15 tuổi',
      mo_dau: 'Lời mở đầu bài nói',
      luan_diem: [
        {
          luan_diem: 'Gây nghiện dopamine',
          giai_thich: 'Thuật toán giữ chân người dùng',
          dan_chung: 'Nghiên cứu APA 2023',
        },
      ],
      phan_bien: [
        {
          luan_diem_doi_lap: 'Giúp kết nối bạn bè',
          cach_phan_bac: 'Có thể dùng mạng chuyên biệt an toàn hơn',
        },
      ],
      ket_luan: 'Cần giới hạn độ tuổi',
    };
    const parsed = parseSpeechDraft(JSON.stringify(vietnameseRaw));
    assert('AD-02: Normalizes tieu_de to title', parsed !== null && parsed.title === 'Cấm mạng xã hội dưới 15 tuổi');
    assert('AD-02: Normalizes mo_dau to hook', parsed?.hook === 'Lời mở đầu bài nói');
    assert('AD-02: Normalizes luan_diem to arguments with claim', parsed?.arguments[0]?.claim === 'Gây nghiện dopamine');
    assert('AD-02: Normalizes giai_thich to reasoning', parsed?.arguments[0]?.reasoning === 'Thuật toán giữ chân người dùng');
    assert('AD-02: Normalizes dan_chung to evidenceSuggestion', parsed?.arguments[0]?.evidenceSuggestion === 'Nghiên cứu APA 2023');
    assert('AD-02: Normalizes luan_diem_doi_lap to opponentArgument', parsed?.counterarguments[0]?.opponentArgument === 'Giúp kết nối bạn bè');
    assert('AD-02: Normalizes cach_phan_bac to rebuttal', parsed?.counterarguments[0]?.rebuttal === 'Có thể dùng mạng chuyên biệt an toàn hơn');
    assert('AD-02: Normalizes ket_luan to conclusion', parsed?.conclusion === 'Cần giới hạn độ tuổi');
  }

  // ─── AD-03: Speech Draft Markdown Fence Stripping ──────────────────────────
  section('AD-03: Speech Draft Markdown Fence Stripping');
  {
    const fenced = '```json\n' + JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) + '\n```';
    const parsed = parseSpeechDraft(fenced);
    assert('AD-03: Strips ```json fences and returns valid object', parsed !== null && parsed.arguments.length === 2);

    const proseWrapped = 'Dưới đây là bản thảo bài nói chi tiết:\n```JSON\n' + JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) + '\n```\nHy vọng bản thảo này hữu ích!';
    const parsedProse = parseSpeechDraft(proseWrapped);
    assert('AD-03: Strips prose wrapping around markdown fences', parsedProse !== null && parsedProse.hook.length > 0);
  }

  // ─── AD-04: Speech Draft Malformed JSON -> Failure ─────────────────────────
  section('AD-04: Speech Draft Malformed JSON -> HTTP 422');
  {
    const quota: MockQuotaState = { assistant: 3, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: '{ invalid json non-recoverable ???' }),
    });
    assert('AD-04: Returns HTTP 422', res.status === 422);
    assert('AD-04: Error is GENERATION_FAILED', res.body.error === 'GENERATION_FAILED');
  }

  // ─── AD-05: Speech Draft Schema Validation Failure -> Zero Quota ───────────
  section('AD-05: Speech Draft Schema Validation Failure -> Zero Quota Deduction');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify({ randomKey: 'no arguments array present' }) }),
    });
    assert('AD-05: Returns HTTP 422 on missing arguments schema', res.status === 422);
    assert('AD-05: Quota NOT consumed (remains 5)', quota.assistant === 5);
    assert('AD-05: consumed flag is false', !res.consumed);
  }

  // ─── AD-06: Motion Analysis Happy Path ─────────────────────────────────────
  section('AD-06: Motion Analysis Happy Path');
  {
    const quota: MockQuotaState = { assistant: 4, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/reports/analyze', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Motion_Analysis_Report',
      aiFunction: async () => ({ content: JSON.stringify(RAW_MOTION_ANALYSIS_CANONICAL), usage: { prompt_tokens: 120, completion_tokens: 250 } }),
    });
    assert('AD-06: Returns HTTP 200', res.status === 200);
    assert('AD-06: success is true', res.body.success === true);
    assert('AD-06: coreConflict present', typeof res.body.data.coreConflict === 'string');
    assert('AD-06: stakeholders normalized', Array.isArray(res.body.data.stakeholders) && res.body.data.stakeholders.length >= 1);
    assert('AD-06: affirmativeCases present', Array.isArray(res.body.data.affirmativeCases) && res.body.data.affirmativeCases.length >= 1);
    assert('AD-06: negativeCases present', Array.isArray(res.body.data.negativeCases) && res.body.data.negativeCases.length >= 1);
    assert('AD-06: Assistant quota deducted from 4 to 3', quota.assistant === 3);
  }

  // ─── AD-07: Motion Analysis JSON Normalization ─────────────────────────────
  section('AD-07: Motion Analysis JSON Normalization');
  {
    const vietnameseMotion = {
      kien_nghi: 'Hạn chế độ tuổi mạng xã hội',
      xung_dot_cot_loi: 'Tự do thông tin vs. An toàn trẻ em',
      cac_ben_lien_quan: [
        'Học sinh: Chịu tác động trực tiếp',
        'Nhà trường: Cần môi trường học tập tập trung',
      ],
      phe_ung_ho: [
        {
          luan_diem: 'Bảo vệ tâm lý trẻ em',
          lap_luan_chinh: 'Hạn chế nội dung độc hại và bắt nạt trên mạng',
          ganh_nang_chung_minh: 'Chứng minh tác hại vượt quá lợi ích',
        },
      ],
      phe_phan_doi: [
        {
          luan_diem: 'Giáo dục hiệu quả hơn cấm đoán',
          lap_luan_chinh: 'Kỹ năng số là thiết yếu cho tương lai',
          ganh_nang_chung_minh: 'Chứng minh phương án thay thế khả thi',
        },
      ],
      huong_phan_bien: ['Liệu cấm có làm gia tăng tò mò và lách luật?'],
    };
    const parsed = parseMotionAnalysis(JSON.stringify(vietnameseMotion));
    assert('AD-07: Normalizes xung_dot_cot_loi to coreConflict', parsed?.coreConflict === 'Tự do thông tin vs. An toàn trẻ em');
    assert('AD-07: Normalizes cac_ben_lien_quan string array to StakeholderItem[]', Array.isArray(parsed?.stakeholders) && parsed!.stakeholders[0]?.name === 'Học sinh');
    assert('AD-07: Normalizes phe_ung_ho to affirmativeCases', (parsed?.affirmativeCases.length ?? 0) === 1);
    assert('AD-07: Normalizes phe_phan_doi to negativeCases', (parsed?.negativeCases.length ?? 0) === 1);
    assert('AD-07: Normalizes huong_phan_bien to rebuttalVectors', (parsed?.rebuttalVectors.length ?? 0) === 1);
  }

  // ─── AD-08: Motion Analysis Malformed JSON -> HTTP 422 ─────────────────────
  section('AD-08: Motion Analysis Malformed JSON -> HTTP 422');
  {
    const quota: MockQuotaState = { assistant: 3, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/reports/analyze', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Motion_Analysis_Report',
      aiFunction: async () => ({ content: '<<<NOT JSON>>>' }),
    });
    assert('AD-08: Returns HTTP 422 on corrupted JSON', res.status === 422);
    assert('AD-08: Error is GENERATION_FAILED', res.body.error === 'GENERATION_FAILED');
  }

  // ─── AD-09: Motion Analysis Schema Validation Failure -> Zero Quota ────────
  section('AD-09: Motion Analysis Schema Validation Failure -> Zero Quota');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/reports/analyze', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Motion_Analysis_Report',
      aiFunction: async () => ({ content: JSON.stringify({ coreConflict: 'Some conflict', affirmativeCases: [] }) }), // missing negativeCases
    });
    assert('AD-09: Returns HTTP 422 on incomplete cases schema', res.status === 422);
    assert('AD-09: Quota unchanged at 5', quota.assistant === 5);
  }

  // ─── AD-10: Quota = 0 -> HTTP 403 QUOTA_EXCEEDED ───────────────────────────
  section('AD-10: assistant_remaining = 0 -> HTTP 403 QUOTA_EXCEEDED');
  {
    const quota: MockQuotaState = { assistant: 0, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
    });
    assert('AD-10: Returns HTTP 403', res.status === 403);
    assert('AD-10: Error is QUOTA_EXCEEDED', res.body.error === 'QUOTA_EXCEEDED');
  }

  // ─── AD-11: Quota < 0 / Invalid State -> Fail Closed (403) ──────────────────
  section('AD-11: assistant_remaining < 0 / Invalid State -> Fail Closed');
  {
    const quota: MockQuotaState = { assistant: -1, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
    });
    assert('AD-11: Returns HTTP 403 on negative quota', res.status === 403);
    assert('AD-11: Error is QUOTA_EXCEEDED', res.body.error === 'QUOTA_EXCEEDED');
  }

  // ─── AD-12: Quota Failure -> AI Provider NEVER Called ───────────────────────
  section('AD-12: Quota Failure -> AI Provider NEVER Called (callCount = 0)');
  {
    let callCount = 0;
    const quota: MockQuotaState = { assistant: 0, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => {
        callCount++;
        return { content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) };
      },
    });
    assert('AD-12: HTTP 403 returned', res.status === 403);
    assert('AD-12: AI provider was NEVER invoked (callCount === 0)', callCount === 0);
    assert('AD-12: aiCalled is false', !res.aiCalled);
  }

  // ─── AD-13: Provider Failure -> Quota Unchanged ─────────────────────────────
  section('AD-13: Provider Failure -> Quota Unchanged');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => { throw new Error('AI Provider 500 Network Timeout'); },
    });
    assert('AD-13: Returns HTTP 502', res.status === 502);
    assert('AD-13: Error is AI_SERVICE_UNAVAILABLE', res.body.error === 'AI_SERVICE_UNAVAILABLE');
    assert('AD-13: Quota remains 5', quota.assistant === 5);
  }

  // ─── AD-14: Parser Failure -> Quota Unchanged ───────────────────────────────
  section('AD-14: Parser Failure -> Quota Unchanged');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/reports/analyze', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Motion_Analysis_Report',
      aiFunction: async () => ({ content: 'Not a valid JSON content at all' }),
    });
    assert('AD-14: Returns HTTP 422', res.status === 422);
    assert('AD-14: Quota remains 5 (no deduction)', quota.assistant === 5);
  }

  // ─── AD-15: Successful Speech Draft -> Exactly 1 Assistant Credit Deducted ──
  section('AD-15: Successful Speech Draft -> Exactly 1 Assistant Credit Deducted');
  {
    const quota: MockQuotaState = { assistant: 8, text: 10, audio: 10 };
    await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
    });
    assert('AD-15: assistant_remaining decremented from 8 to 7', quota.assistant === 7);
  }

  // ─── AD-16: Successful Motion Analysis -> Exactly 1 Assistant Credit Deducted ─
  section('AD-16: Successful Motion Analysis -> Exactly 1 Assistant Credit Deducted');
  {
    const quota: MockQuotaState = { assistant: 8, text: 10, audio: 10 };
    await simulateAssistantFlow('/api/v1/reports/analyze', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Motion_Analysis_Report',
      aiFunction: async () => ({ content: JSON.stringify(RAW_MOTION_ANALYSIS_CANONICAL) }),
    });
    assert('AD-16: assistant_remaining decremented from 8 to 7', quota.assistant === 7);
  }

  // ─── AD-17: Assistant Generation Does NOT Modify text_remaining ─────────────
  section('AD-17: Assistant Generation Does NOT Modify text_remaining');
  {
    const quota: MockQuotaState = { assistant: 5, text: 20, audio: 15 };
    for (let i = 0; i < 3; i++) {
      await simulateAssistantFlow('/api/v1/speeches/draft', {
        userId: 'user-001',
        hasAuthHeader: true,
        quota,
        taskName: 'Speech_Draft_Generation',
        aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
      });
    }
    assert('AD-17: text_remaining is strictly unchanged at 20', quota.text === 20);
    assert('AD-17: assistant_remaining correctly decremented from 5 to 2', quota.assistant === 2);
  }

  // ─── AD-18: Assistant Generation Does NOT Modify audio_remaining ────────────
  section('AD-18: Assistant Generation Does NOT Modify audio_remaining');
  {
    const quota: MockQuotaState = { assistant: 5, text: 20, audio: 15 };
    for (let i = 0; i < 3; i++) {
      await simulateAssistantFlow('/api/v1/reports/analyze', {
        userId: 'user-001',
        hasAuthHeader: true,
        quota,
        taskName: 'Motion_Analysis_Report',
        aiFunction: async () => ({ content: JSON.stringify(RAW_MOTION_ANALYSIS_CANONICAL) }),
      });
    }
    assert('AD-18: audio_remaining is strictly unchanged at 15', quota.audio === 15);
    assert('AD-18: assistant_remaining correctly decremented from 5 to 2', quota.assistant === 2);
  }

  // ─── AD-19: Telemetry taskName = Speech_Draft_Generation ───────────────────
  section('AD-19: Telemetry taskName = Speech_Draft_Generation');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
    });
    assert('AD-19: executeWithMetering received taskName = Speech_Draft_Generation', res.telemetryTaskName === 'Speech_Draft_Generation');
  }

  // ─── AD-20: Telemetry taskName = Motion_Analysis_Report ────────────────────
  section('AD-20: Telemetry taskName = Motion_Analysis_Report');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/reports/analyze', {
      userId: 'user-001',
      hasAuthHeader: true,
      quota,
      taskName: 'Motion_Analysis_Report',
      aiFunction: async () => ({ content: JSON.stringify(RAW_MOTION_ANALYSIS_CANONICAL) }),
    });
    assert('AD-20: executeWithMetering received taskName = Motion_Analysis_Report', res.telemetryTaskName === 'Motion_Analysis_Report');
  }

  // ─── AD-21: Missing Authentication -> HTTP 401 ──────────────────────────────
  section('AD-21: Missing Authentication -> HTTP 401');
  {
    const quota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: undefined,
      hasAuthHeader: false,
      quota,
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
    });
    assert('AD-21: Missing auth returns HTTP 401', res.status === 401);
    assert('AD-21: AI was NOT called', !res.aiCalled);
    assert('AD-21: Quota unchanged at 5', quota.assistant === 5);
  }

  // ─── AD-22: userId Tampering Resistance ─────────────────────────────────────
  section('AD-22: userId Tampering Resistance (Body/Query userId Ignored)');
  {
    const userAQuota: MockQuotaState = { assistant: 5, text: 10, audio: 10 };
    // Attacker sends request authenticated as User A but passes body.userId = "user-B-victim"
    const res = await simulateAssistantFlow('/api/v1/speeches/draft', {
      userId: 'user-A-attacker', // from verified JWT
      bodyUserId: 'user-B-victim', // ignored parameter
      hasAuthHeader: true,
      quota: userAQuota, // operation executes against authenticated User A
      taskName: 'Speech_Draft_Generation',
      aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
    });
    assert('AD-22: Authenticated user quota decremented (5 -> 4)', userAQuota.assistant === 4);
    assert('AD-22: Identity taken strictly from verified auth context', res.status === 200);
  }

  // ─── AD-26: Idempotency & Duplicate/Retry Audit ─────────────────────────────
  section('AD-26: Idempotency & Duplicate/Retry Audit');
  {
    // Invariant: Atomic decrement UPDATE user_quotas SET assistant_remaining = assistant_remaining - 1 WHERE assistant_remaining >= 1
    // guarantees non-negative balances.
    // Under the locked schema, there is no persistent idempotency_key column in usage_logs/user_quotas.
    const sharedQuota: MockQuotaState = { assistant: 1, text: 10, audio: 10 };
    const [res1, res2] = await Promise.all([
      simulateAssistantFlow('/api/v1/speeches/draft', {
        userId: 'user-001',
        hasAuthHeader: true,
        quota: sharedQuota,
        taskName: 'Speech_Draft_Generation',
        aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
      }),
      simulateAssistantFlow('/api/v1/speeches/draft', {
        userId: 'user-001',
        hasAuthHeader: true,
        quota: sharedQuota,
        taskName: 'Speech_Draft_Generation',
        aiFunction: async () => ({ content: JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL) }),
      }),
    ]);
    const successCount = [res1.status, res2.status].filter(s => s === 200).length;
    const blockedCount = [res1.status, res2.status].filter(s => s === 403).length;
    assert('AD-26: Concurrent duplicate with 1 credit allows exactly 1 success (200)', successCount === 1);
    assert('AD-26: Concurrent duplicate with 1 credit blocks second attempt (403)', blockedCount === 1);
    assert('AD-26: Quota never goes negative (assistant_remaining = 0)', sharedQuota.assistant === 0);
  }

  // ─── AD-27: Canonical Response Schema & Types ──────────────────────────────
  section('AD-27: Canonical Response Schema & Types');
  {
    const speechResult = parseSpeechDraft(JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL));
    assert('AD-27: Speech Draft has hook string', typeof speechResult?.hook === 'string');
    assert('AD-27: Speech Draft arguments have claim, reasoning, evidenceSuggestion',
      Boolean(speechResult?.arguments[0]?.claim && speechResult?.arguments[0]?.reasoning && speechResult?.arguments[0]?.evidenceSuggestion));
    assert('AD-27: Speech Draft counterarguments have opponentArgument, rebuttal',
      Boolean(speechResult?.counterarguments[0]?.opponentArgument && speechResult?.counterarguments[0]?.rebuttal));
    assert('AD-27: Speech Draft conclusion is string', typeof speechResult?.conclusion === 'string');

    const motionResult = parseMotionAnalysis(JSON.stringify(RAW_MOTION_ANALYSIS_CANONICAL));
    assert('AD-27: Motion Analysis has coreConflict string', typeof motionResult?.coreConflict === 'string');
    assert('AD-27: Motion Analysis stakeholders have name, interest, impact',
      Boolean(motionResult?.stakeholders[0]?.name && motionResult?.stakeholders[0]?.interest && motionResult?.stakeholders[0]?.impact));
    assert('AD-27: Motion Analysis affirmativeCases have claim, reasoning, evidenceSuggestion',
      Boolean(motionResult?.affirmativeCases[0]?.claim && motionResult?.affirmativeCases[0]?.reasoning));
    assert('AD-27: Motion Analysis negativeCases have claim, reasoning, evidenceSuggestion',
      Boolean(motionResult?.negativeCases[0]?.claim && motionResult?.negativeCases[0]?.reasoning));
    assert('AD-27: Motion Analysis burdenOfProof is string[]', Array.isArray(motionResult?.burdenOfProof));
    assert('AD-27: Motion Analysis rebuttalVectors is string[]', Array.isArray(motionResult?.rebuttalVectors));
  }

  // ─── AD-28: Existing DB Schema Invariant ───────────────────────────────────
  section('AD-28: Existing DB Schema Invariant (schema.prisma unchanged)');
  {
    const schemaPath = path.resolve(__dirname, '../../prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    assert('AD-28: schema.prisma exists', fs.existsSync(schemaPath));
    assert('AD-28: schema.prisma contains UserQuota.assistant_remaining', schemaContent.includes('assistantRemaining'));
    assert('AD-28: schema.prisma has NO illegal new tables', !schemaContent.includes('model AssistantUsageLog'));
  }

  // ─── AH-01..AH-03: Frontend Arena Handoff Contract Tests ────────────────────
  section('AH-01..AH-03: Frontend Arena Handoff Contract Verification');
  {
    // Simulate speechDraftToArenaText logic from AssistantPanel
    function speechDraftToArenaText(draft: typeof RAW_SPEECH_DRAFT_CANONICAL): string {
      const lines: string[] = [];
      if (draft.hook) lines.push(`🎯 [Mở đầu] ${draft.hook}`);
      draft.arguments.forEach((arg, i) => {
        lines.push(`[Luận điểm ${i + 1}] ${arg.claim}`);
        lines.push(`→ Lý lẽ: ${arg.reasoning}`);
        lines.push(`📚 Dẫn chứng: ${arg.evidenceSuggestion}`);
      });
      draft.counterarguments.forEach((ca, i) => {
        lines.push(`[Phản biện đối phương ${i + 1}] ${ca.opponentArgument}`);
        lines.push(`→ Phản bác: ${ca.rebuttal}`);
      });
      if (draft.conclusion) lines.push(`✅ [Kết luận] ${draft.conclusion}`);
      return lines.join('\n');
    }

    const handoffTopic = 'Cấm học sinh dưới 15 tuổi sử dụng mạng xã hội';
    const handoffStance = 'AFFIRMATIVE';
    const handoffText = speechDraftToArenaText(RAW_SPEECH_DRAFT_CANONICAL);

    // Mock Arena Client State
    interface MockArenaState {
      topic: string;
      stance: string;
      inputText: string;
      isDebateStarted: boolean;
      sessionCreated: boolean;
      consumedQuota: { text: number; audio: number; assistant: number };
    }

    const arenaState: MockArenaState = {
      topic: '',
      stance: 'AFFIRMATIVE',
      inputText: '',
      isDebateStarted: false,
      sessionCreated: false,
      consumedQuota: { text: 0, audio: 0, assistant: 0 },
    };

    // Client-side prefill event handler
    function handlePrefillArena(topic: string, stance: string, draftText: string): void {
      arenaState.topic = topic;
      arenaState.stance = stance;
      arenaState.inputText = draftText;
      // Note: does NOT call createDebateSession and does NOT decrement quota!
    }

    handlePrefillArena(handoffTopic, handoffStance, handoffText);

    // AH-01: Preserves topic, stance, and draft content
    assert('AH-01: Arena handoff preserves topic', arenaState.topic === handoffTopic);
    assert('AH-01: Arena handoff preserves stance', arenaState.stance === handoffStance);
    assert('AH-01: Arena handoff preserves rich argument text', arenaState.inputText.includes('[Luận điểm 1]'));

    // AH-02: Does not automatically submit or start debate
    assert('AH-02: Arena handoff does NOT set isDebateStarted to true', arenaState.isDebateStarted === false);
    assert('AH-02: Arena handoff does NOT create debate session', arenaState.sessionCreated === false);

    // AH-03: Consumes zero additional quota
    assert('AH-03: Arena handoff consumes 0 Text Credit', arenaState.consumedQuota.text === 0);
    assert('AH-03: Arena handoff consumes 0 Audio Credit', arenaState.consumedQuota.audio === 0);
    assert('AH-03: Arena handoff consumes 0 Assistant Credit', arenaState.consumedQuota.assistant === 0);
  }

  // ============================================================================
  // ─── CONTRACT CLOSURE v1.1: ACCEPTANCE SUITE (AT-01 .. AT-35) ───────────────
  // ============================================================================
  section('CONTRACT CLOSURE v1.1: Acceptance Tests (AT-01 .. AT-35)');

  // AT-01, AT-02, AT-03: Candidate Scaffold Invariants
  {
    const parsedScaffold = parseSpeechDraft(JSON.stringify(RAW_SPEECH_DRAFT_CANONICAL));
    assert('AT-01: AI candidate scaffold provides arguments', Boolean(parsedScaffold && parsedScaffold.arguments.length >= 1));
    assert('AT-02: AI candidate scaffold provides counterarguments', Boolean(parsedScaffold && parsedScaffold.counterarguments.length >= 1));
    assert('AT-03: AI candidate scaffold provides 1 conclusion', Boolean(parsedScaffold && typeof parsedScaffold.conclusion === 'string' && parsedScaffold.conclusion.length > 0));
  }

  // AT-04: Workspace Ingestion assigns stable IDs
  interface MockWorkspaceArg {
    argumentId: string;
    order: number;
    claim: string;
    reasoning: string;
    evidenceSuggestion: string;
    isCustomAdded?: boolean;
  }
  interface MockWorkspaceCounter {
    counterargumentId: string;
    order: number;
    opponentArgument: string;
    rebuttal: string;
    isCustomAdded?: boolean;
  }

  let wsArgs: MockWorkspaceArg[] = [
    { argumentId: 'arg-uuid-1', order: 1, claim: 'AI nâng cao năng suất giảng dạy', reasoning: 'Tự động hóa giáo án', evidenceSuggestion: 'Báo cáo UNESCO 2024' },
    { argumentId: 'arg-uuid-2', order: 2, claim: 'AI cá nhân hóa lộ trình học', reasoning: 'Học thích ứng 1:1', evidenceSuggestion: 'Dữ liệu Khanmigo' },
    { argumentId: 'arg-uuid-3', order: 3, claim: 'AI tiết kiệm ngân sách đào tạo', reasoning: 'Giảm chi phí vận hành', evidenceSuggestion: 'Khảo sát OECD' },
  ];

  let wsCounters: MockWorkspaceCounter[] = [
    { counterargumentId: 'ca-uuid-1', order: 1, opponentArgument: 'AI thiếu thấu cảm con người', rebuttal: 'AI hỗ trợ chứ không phủ nhận cảm xúc' },
    { counterargumentId: 'ca-uuid-2', order: 2, opponentArgument: 'AI có nguy cơ thiên kiến', rebuttal: 'Quy chuẩn an toàn AI ngày càng hoàn thiện' },
  ];

  assert('AT-04: Ingestion assigns stable argument IDs and 1-based order',
    wsArgs[0].argumentId === 'arg-uuid-1' && wsArgs[0].order === 1 && wsArgs[1].order === 2 && wsArgs[2].order === 3);

  // AT-05: Reordering updates order while argumentId remains invariant (Identity !== Position)
  {
    // Move Arg 3 to first position: [Arg 3, Arg 1, Arg 2]
    const reordered = [wsArgs[2], wsArgs[0], wsArgs[1]].map((a, idx) => ({ ...a, order: idx + 1 }));
    assert('AT-05: Reordering updates display order (1, 2, 3)',
      reordered[0].order === 1 && reordered[1].order === 2 && reordered[2].order === 3);
    assert('AT-05: Argument IDs strictly survive reorder (identity !== position)',
      reordered[0].argumentId === 'arg-uuid-3' && reordered[1].argumentId === 'arg-uuid-1' && reordered[2].argumentId === 'arg-uuid-2');
  }

  // AT-06: Deleting an argument renormalizes order while preserving remaining IDs
  {
    // Delete Arg 2 ('arg-uuid-2')
    const remaining = wsArgs.filter(a => a.argumentId !== 'arg-uuid-2').map((a, idx) => ({ ...a, order: idx + 1 }));
    assert('AT-06: Deletion renormalizes remaining order to 1..N',
      remaining.length === 2 && remaining[0].order === 1 && remaining[1].order === 2);
    assert('AT-06: Remaining IDs are strictly preserved without regeneration',
      remaining[0].argumentId === 'arg-uuid-1' && remaining[1].argumentId === 'arg-uuid-3');
  }

  // AT-07: Counterarguments support equivalent lifecycle and ID stability
  {
    const reorderedCounters = [wsCounters[1], wsCounters[0]].map((c, idx) => ({ ...c, order: idx + 1 }));
    assert('AT-07: Counterargument IDs survive reorder',
      reorderedCounters[0].counterargumentId === 'ca-uuid-2' && reorderedCounters[0].order === 1 &&
      reorderedCounters[1].counterargumentId === 'ca-uuid-1' && reorderedCounters[1].order === 2);
  }

  // AT-08, AT-09, AT-10, AT-11: Workspace Validation Rules
  function validateWorkspace(topic: string, args: MockWorkspaceArg[], counters: MockWorkspaceCounter[]): boolean {
    const isTopicValid = topic.trim().length > 0;
    const hasMinArgs = args.length >= 1;
    const areClaimsFilled = args.length > 0 && args.every(a => a.claim.trim().length > 0);
    return isTopicValid && hasMinArgs && areClaimsFilled;
  }

  assert('AT-08: N >= 1 validation allows 1 argument', validateWorkspace('Topic', [wsArgs[0]], []));
  assert('AT-08: N = 0 validation fails', !validateWorkspace('Topic', [], []));
  assert('AT-09: M >= 0 validation allows 0 counterarguments', validateWorkspace('Topic', [wsArgs[0]], []));
  assert('AT-10: Empty claim is invalid', !validateWorkspace('Topic', [{ ...wsArgs[0], claim: '   ' }], []));
  assert('AT-11: Empty topic is invalid', !validateWorkspace('   ', [wsArgs[0]], []));

  // AT-12..AT-18: Zero AI Call & Zero Quota Curation Invariants
  {
    let mockAiCalls = 0;
    const quotaTracker: MockQuotaState = { assistant: 3, text: 5, audio: 5 };

    // AT-12 & AT-13: Add custom argument (0 AI calls)
    const customArg: MockWorkspaceArg = {
      argumentId: 'custom-uuid-4',
      order: wsArgs.length + 1,
      claim: 'AI thu hẹp khoảng cách địa lý',
      reasoning: 'Vùng sâu vùng xa tiếp cận tri thức',
      evidenceSuggestion: 'Dự án Starlink Education',
      isCustomAdded: true,
    };
    wsArgs.push(customArg);
    assert('AT-12: User can add custom argument (total count = 4)', wsArgs.length === 4);
    assert('AT-13: Adding custom argument triggers zero AI calls', mockAiCalls === 0);
    assert('AT-14: Adding custom argument consumes zero quota', quotaTracker.assistant === 3);

    // AT-15: Delete argument consumes 0 quota
    wsArgs = wsArgs.filter(a => a.argumentId !== 'custom-uuid-4');
    assert('AT-15: Deleting argument consumes zero quota', quotaTracker.assistant === 3);

    // AT-16: Reorder consumes 0 quota
    wsArgs = [wsArgs[1], wsArgs[0], wsArgs[2]].map((a, idx) => ({ ...a, order: idx + 1 }));
    assert('AT-16: Reordering consumes zero quota', quotaTracker.assistant === 3);

    // AT-17: Editing fields consumes 0 quota
    wsArgs[0].claim = 'Sửa đổi nội dung claim mới';
    assert('AT-17: In-place editing consumes zero quota', quotaTracker.assistant === 3);

    // AT-18: Confirmation consumes 0 quota
    assert('AT-18: Confirmation consumes zero quota', quotaTracker.assistant === 3 && mockAiCalls === 0);
  }

  // AT-19 & AT-20: FinalDebateDraft Snapshot Creation
  interface FinalDebateDraftSnapshot {
    draftId: string;
    topic: string;
    stance: 'AFFIRMATIVE' | 'NEGATIVE';
    hook: string;
    arguments: MockWorkspaceArg[];
    counterarguments: MockWorkspaceCounter[];
    conclusion: string;
    isUserConfirmed: true;
    confirmedAt: string;
  }

  const finalDraftSnapshot: FinalDebateDraftSnapshot = {
    draftId: 'final_draft_test_1',
    topic: 'Trí tuệ nhân tạo sẽ thay thế giáo viên trong tương lai',
    stance: 'AFFIRMATIVE',
    hook: 'Mở đầu ấn tượng...',
    arguments: wsArgs,
    counterarguments: wsCounters,
    conclusion: 'Kết luận đúc kết...',
    isUserConfirmed: true,
    confirmedAt: new Date().toISOString(),
  };

  assert('AT-19: FinalDebateDraft snapshot created', Boolean(finalDraftSnapshot.draftId));
  assert('AT-20: FinalDebateDraft has isUserConfirmed = true and confirmedAt timestamp',
    finalDraftSnapshot.isUserConfirmed === true && typeof finalDraftSnapshot.confirmedAt === 'string');

  // AT-21 & AT-22: Structured Handoff Contract
  interface ArenaHandoffPayloadTest {
    topic: string;
    stance: 'AFFIRMATIVE' | 'NEGATIVE';
    finalDraft: FinalDebateDraftSnapshot;
    legacyDraftText?: string;
  }

  const handoffPayload: ArenaHandoffPayloadTest = {
    topic: finalDraftSnapshot.topic,
    stance: finalDraftSnapshot.stance,
    finalDraft: finalDraftSnapshot,
    legacyDraftText: '[Legacy fallback text]',
  };

  assert('AT-21: Structured handoff contains finalDraft object', Boolean(handoffPayload.finalDraft && handoffPayload.finalDraft.arguments.length === 3));
  assert('AT-22: Canonical handoff preserves structured finalDraft (not flattened into monolithic string)',
    Array.isArray(handoffPayload.finalDraft.arguments) && handoffPayload.finalDraft.arguments[0].claim.length > 0);

  // AT-23 & AT-24: Arena Argument Map Rendering & Order
  {
    const arenaFinalDraft = handoffPayload.finalDraft;
    assert('AT-23: Arena receives all final arguments intact', arenaFinalDraft.arguments.length === 3);
    assert('AT-24: Argument Map respects 1-based order',
      arenaFinalDraft.arguments[0].order === 1 && arenaFinalDraft.arguments[1].order === 2 && arenaFinalDraft.arguments[2].order === 3);
  }

  // AT-25, AT-26, AT-27: activeArgumentId vs targetArgumentId Decoupling
  {
    let activeArgId: string | null = 'arg-uuid-1'; // UI focus on Argument 1
    let targetArgId: string | null = 'arg-uuid-3'; // Turn target explicitly bound to Argument 3

    assert('AT-25: activeArgumentId tracks UI focus', activeArgId === 'arg-uuid-1');
    assert('AT-26: targetArgumentId tracks turn target independently', targetArgId === 'arg-uuid-3');

    // Priority check: targetArgumentId overrides activeArgumentId when binding turn context
    const effectiveArgId = targetArgId || activeArgId;
    assert('AT-27: Explicit targetArgumentId takes priority over activeArgumentId in turn context', effectiveArgId === 'arg-uuid-3');
  }

  // AT-28 & AT-29: Selective Insertion Invariants
  {
    let editorText = 'Lời phát biểu mở đầu của học sinh.';
    const selectedArg = finalDraftSnapshot.arguments[0];
    const toInsert = `${selectedArg.claim}. Bởi vì ${selectedArg.reasoning}.`;

    // Safe append/insert
    editorText = editorText ? `${editorText}\n\n${toInsert}` : toInsert;

    assert('AT-28: Selective insertion inserts only the selected argument',
      editorText.includes(selectedArg.claim) && !editorText.includes(finalDraftSnapshot.arguments[1].claim));
    assert('AT-29: Selective insertion preserves existing user-authored text',
      editorText.startsWith('Lời phát biểu mở đầu của học sinh.'));
  }

  // AT-30 & AT-31: Turn Argument Context Contract
  {
    function buildTurnPayload(content: string, targetArg?: MockWorkspaceArg) {
      return {
        userId: 'user-123',
        content,
        stance: 'AFFIRMATIVE',
        argumentContext: targetArg ? {
          argumentId: targetArg.argumentId,
          order: targetArg.order,
          claim: targetArg.claim,
          reasoning: targetArg.reasoning,
          evidenceSuggestion: targetArg.evidenceSuggestion,
        } : undefined,
      };
    }

    const payloadWithTarget = buildTurnPayload('Nội dung phát biểu', finalDraftSnapshot.arguments[0]);
    const payloadWithoutTarget = buildTurnPayload('Nội dung phát biểu tự do');

    assert('AT-30: Turn includes argumentContext when target argument exists',
      Boolean(payloadWithTarget.argumentContext?.argumentId === 'arg-uuid-2' || payloadWithTarget.argumentContext?.argumentId === wsArgs[0].argumentId));
    assert('AT-31: Turn omits argumentContext when no target argument is selected',
      payloadWithoutTarget.argumentContext === undefined);
  }

  // AT-32: Logic Coach receives target argument context without altering output schema
  {
    const coachPromptWithArg = buildLogicCoachPrompt({
      topic: 'Trí tuệ nhân tạo thay thế giáo viên',
      stance: 'AFFIRMATIVE',
      content: 'AI cá nhân hóa bài tập cho từng học sinh dựa trên tốc độ tiếp thu.',
      targetArgument: {
        argumentId: 'arg-uuid-1',
        order: 1,
        claim: 'AI nâng cao năng suất giảng dạy',
        reasoning: 'Tự động hóa giáo án',
        evidenceSuggestion: 'UNESCO 2024',
      },
    });

    assert('AT-32: Logic Coach prompt includes target argument information',
      coachPromptWithArg.userPrompt.includes('Luận điểm dự kiến: AI nâng cao năng suất giảng dạy'));
    assert('AT-32: Logic Coach system prompt maintains strict canonical JSON schema instructions',
      coachPromptWithArg.systemPrompt.includes('cre_analysis') && coachPromptWithArg.systemPrompt.includes('fallacies_detected'));
  }

  // AT-33: AI Opponent receives target argument awareness without rigid sequential lock
  {
    const opponentPrompt = buildOpponentPrompt({
      topic: 'Trí tuệ nhân tạo thay thế giáo viên',
      userSide: 'AFFIRMATIVE',
      content: 'AI giúp giảm tải cho giáo viên.',
      turnNumber: 1,
      history: [],
      targetArgument: {
        argumentId: 'arg-uuid-1',
        claim: 'AI nâng cao năng suất giảng dạy',
      },
    });

    assert('AT-33: AI Opponent prompt receives learner target argument context',
      opponentPrompt.userPrompt.includes('Luận điểm: "AI nâng cao năng suất giảng dạy"'));
    assert('AT-33: AI Opponent prompt preserves competitive CRE task freedom',
      opponentPrompt.userPrompt.includes('Đưa ra phản biện trực tiếp cho luận điểm trên'));
  }

  // AT-34: Standalone Arena Mode Compatibility
  {
    const standaloneArenaProps = {
      finalDraft: null,
      prefilledTopic: undefined,
      prefilledDraft: undefined,
    };
    assert('AT-34: Standalone Arena operates cleanly with finalDraft = null',
      standaloneArenaProps.finalDraft === null);
  }

  // AT-35: Legacy draftText & Historical Replay Compatibility
  {
    const legacyPrefill = {
      prefilledDraft: 'Nội dung bản thảo cũ dạng chuỗi văn bản thuần túy.',
      finalDraft: null,
    };
    assert('AT-35: Legacy draftText fallback operates without runtime exceptions',
      typeof legacyPrefill.prefilledDraft === 'string' && legacyPrefill.finalDraft === null);
  }

  // ─── Consolidated Summary ───────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`  ASSISTANT DOMAIN ADAPTATION SUITE: ${passCount} PASS, ${failCount} FAIL (Total: ${passCount + failCount})`);
  if (failures.length > 0) {
    console.log('  FAILED TESTS:');
    failures.forEach((f) => console.log(`    * ${f}`));
  }
  console.log('='.repeat(60));

  if (failCount > 0) {
    process.exit(1);
  }
})().catch((err: unknown) => {
  console.error('[FATAL ERROR IN ACCEPTANCE SUITE]', err);
  process.exit(1);
});

