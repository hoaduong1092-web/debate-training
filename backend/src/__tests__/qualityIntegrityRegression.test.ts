/**
 * Regression Test Suite: AI Debate Master Quality & Integrity Fixes
 *
 * Tests P0, P1, P2 fixes:
 * 1. AI Opponent truncation detection, completion integrity & controlled retry
 * 2. Logic Coach prompt rubric, history un-anchoring & score consistency
 * 3. Speech Draft and Motion Analysis parser integrity (no fake fallbacks)
 */

import { validateOpponentResponse } from '../services/opponentSafety';
import { generateOpponentResponse } from '../services/opponentService';
import { buildLogicCoachPrompt } from '../prompts/logicCoach';
import { buildSpeechDraftPrompt } from '../prompts/speechDraft';
import { parseSpeechDraft, parseMotionAnalysis } from '../services/assistantParser';
import * as openAIClient from '../services/openAICompatibleClient';

// Micro-test harness
let passCount = 0;
let failCount = 0;
const errors: string[] = [];

function assert(description: string, condition: boolean, extra?: any) {
  if (condition) {
    passCount++;
    console.log(`  ✅ PASS: ${description}`);
  } else {
    failCount++;
    errors.push(description);
    console.error(`  ❌ FAIL: ${description}`, extra !== undefined ? extra : '');
  }
}

async function runQualityIntegritySuite() {
  console.log('\n============================================================');
  console.log('  QUALITY & INTEGRITY REGRESSION SUITE (P0, P1, P2)');
  console.log('============================================================\n');

  // ─── Group 1: AI Opponent Truncation & Completion Integrity ────────────────
  console.log('--- Group 1: AI Opponent Output Integrity ---');

  // Test 1.1: finish_reason === 'length' is rejected as TRUNCATED_RESPONSE
  {
    const safety = validateOpponentResponse(
      'Mạng xã hội có thể gây ra nhiều hệ lụy cho sức khỏe tâm thần và',
      'length'
    );
    assert('1.1 finish_reason=length is marked safe=false', safety.safe === false);
    assert('1.1 violation_type is TRUNCATED_RESPONSE', safety.violation_type === 'TRUNCATED_RESPONSE');
  }

  // Test 1.2: Dangling conjunction at end of sentence is caught as INCOMPLETE_SENTENCE
  {
    const safety = validateOpponentResponse(
      'Việc cấm đoán hoàn toàn là không khả thi bởi vì',
      'stop'
    );
    assert('1.2 Dangling conjunction "bởi vì" is marked safe=false', safety.safe === false);
    assert('1.2 violation_type is INCOMPLETE_SENTENCE', safety.violation_type === 'INCOMPLETE_SENTENCE');
  }

  // Test 1.3: Complete response with stop finish_reason is safe
  {
    const safety = validateOpponentResponse(
      'Việc cấm đoán mạng xã hội không giải quyết tận gốc vấn đề, mà thay vào đó chúng ta cần giáo dục kỹ năng số cho trẻ em. Bạn nghĩ sao về việc đồng hành thay vì cấm đoán?',
      'stop'
    );
    assert('1.3 Complete Vietnamese response is marked safe=true', safety.safe === true);
    assert('1.3 violation_type is null', safety.violation_type === null);
  }

  // Test 1.4: Controlled retry mechanism — Attempt 1 truncated, Retry succeeds
  {
    let callCount = 0;
    openAIClient.setMockChatCompletion(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          content: 'Lập luận của bạn rất đáng chú ý nhưng mà',
          finish_reason: 'length',
          usage: { prompt_tokens: 100, completion_tokens: 20 },
        };
      }
      return {
        content: 'Lập luận của bạn rất đáng chú ý nhưng chưa tính đến quyền tự chủ của trẻ em. Bạn có nghĩ rằng hướng dẫn sẽ tốt hơn cấm đoán hoàn toàn không?',
        finish_reason: 'stop',
        usage: { prompt_tokens: 120, completion_tokens: 50 },
      };
    });

    try {
      const result = await generateOpponentResponse({
        userId: 'test_user',
        sessionId: 'test_session',
        topic: 'Cấm mạng xã hội dưới 16 tuổi',
        userSide: 'AFFIRMATIVE',
        content: 'Mạng xã hội gây hại cho trẻ em',
        history: [],
        turnNumber: 1,
        characterId: null,
      });

      assert('1.4 Retry was triggered (callCount === 2)', callCount === 2);
      assert('1.4 Complete text returned from successful retry', result.text.includes('quyền tự chủ của trẻ em'));
      assert('1.4 Safety filtered is false on successful retry', result.safety_filtered === false);
    } finally {
      openAIClient.setMockChatCompletion(null);
    }
  }

  // Test 1.5: Controlled retry mechanism — Attempt 1 truncated AND Retry still truncated -> throws OPPONENT_TRUNCATED
  {
    let callCount = 0;
    openAIClient.setMockChatCompletion(async () => {
      callCount++;
      return {
        content: 'Lập luận của bạn bị cắt ngang tại',
        finish_reason: 'length',
        usage: { prompt_tokens: 100, completion_tokens: 20 },
      };
    });

    try {
      let threw = false;
      let errorCode = '';
      try {
        await generateOpponentResponse({
          userId: 'test_user',
          sessionId: 'test_session',
          topic: 'Cấm mạng xã hội dưới 16 tuổi',
          userSide: 'AFFIRMATIVE',
          content: 'Mạng xã hội gây hại cho trẻ em',
          history: [],
          turnNumber: 1,
          characterId: null,
        });
      } catch (err: any) {
        threw = true;
        errorCode = err.code;
      }

      assert('1.5 Threw error on persistent truncation', threw === true);
      assert('1.5 Error code is OPPONENT_TRUNCATED', errorCode === 'OPPONENT_TRUNCATED');
      assert('1.5 Attempted exactly 2 calls (1 original + 1 retry)', callCount === 2);
    } finally {
      openAIClient.setMockChatCompletion(null);
    }
  }

  // ─── Group 2: Logic Coach Scoring Integrity & Rubric ───────────────────────
  console.log('\n--- Group 2: Logic Coach Scoring Integrity ---');

  // Test 2.1: History prompt omits numerical score (no historical anchor)
  {
    const { userPrompt } = buildLogicCoachPrompt({
      topic: 'Cấm mạng xã hội dưới 16 tuổi',
      stance: 'AFFIRMATIVE',
      content: 'Mạng xã hội làm giảm sự tập trung trong học tập.',
      history: [
        {
          speaker: 'user',
          text: 'Mạng xã hội gây tổn hại tâm lý học sinh.',
          coachFeedback: {
            score: 9.0,
            fallacies_detected: [],
            weaknesses: ['Dẫn chứng chưa có số liệu'],
            actionable_suggestions: ['Bổ sung nghiên cứu cụ thể'],
          },
        },
      ],
    });

    assert('2.1 User prompt does NOT contain "Điểm: 9/10"', !userPrompt.includes('Điểm: 9/10') && !userPrompt.includes('9.0/10') && !userPrompt.includes('Điểm: 9'));
    assert('2.1 User prompt preserves weaknesses for context', userPrompt.includes('Dẫn chứng chưa có số liệu'));
    assert('2.1 User prompt preserves actionable suggestion', userPrompt.includes('Bổ sung nghiên cứu cụ thể'));
  }

  // Test 2.2: System prompt contains explicit Quantitative C-R-E Rubric
  {
    const { systemPrompt } = buildLogicCoachPrompt({
      topic: 'Cấm mạng xã hội dưới 16 tuổi',
      stance: 'AFFIRMATIVE',
      content: 'Test content',
    });

    assert('2.2 System prompt contains RUBRIC CHẤM ĐIỂM C-R-E', systemPrompt.includes('RUBRIC CHẤM ĐIỂM C-R-E (TỔNG 10.0 ĐIỂM)'));
    assert('2.2 System prompt defines Claim max 3.0', systemPrompt.includes('Claim — Luận điểm (Tối đa 3.0 điểm)'));
    assert('2.2 System prompt defines Reasoning max 3.5', systemPrompt.includes('Reasoning — Lý lẽ (Tối đa 3.5 điểm)'));
    assert('2.2 System prompt defines Evidence max 3.5', systemPrompt.includes('Evidence — Dẫn chứng thực tế (Tối đa 3.5 điểm)'));
    assert('2.2 System prompt enforces Score Integrity Cap on weak evidence', systemPrompt.includes('KHÔNG ĐƯỢC vượt quá 7.5/10'));
  }

  // ─── Group 3: Argument Map & Parser Integrity ──────────────────────────────
  console.log('\n--- Group 3: Argument Map & Parser Integrity ---');

  // Test 3.1: Speech Draft prompt encourages standard 3 core arguments
  {
    const { systemPrompt } = buildSpeechDraftPrompt({
      topic: 'Cấm mạng xã hội',
      stance: 'AFFIRMATIVE',
      language: 'vi',
    });
    assert('3.1 Speech Draft prompt mentions 3 core arguments', systemPrompt.includes('3 core arguments') || systemPrompt.includes('3 focused arguments'));
  }

  // Test 3.2: parseSpeechDraft does NOT inject fake counterarguments when empty
  {
    const validNoCounter = JSON.stringify({
      title: 'Bản thảo bài nói',
      hook: 'Lời mở đầu hấp dẫn',
      arguments: [
        {
          claim: 'Mạng xã hội gây nghiện',
          reasoning: 'Cơ chế thuật toán giữ chân người dùng',
          evidence_suggestion: 'Báo cáo của WHO năm 2023',
        },
      ],
      counterarguments: [],
      conclusion: 'Tóm lại cần có biện pháp quản lý.',
    });

    const parsed = parseSpeechDraft(validNoCounter);
    assert('3.2 Parser returns valid draft object', parsed !== null);
    assert('3.2 Counterarguments array is empty, not fake populated', Array.isArray(parsed?.counterarguments) && parsed?.counterarguments.length === 0);
  }

  // Test 3.3: parseMotionAnalysis does NOT inject fake stakeholders if omitted
  {
    const validMotion = JSON.stringify({
      motion_title: 'Cấm mạng xã hội dưới 16 tuổi',
      core_conflict: 'Quyền tự do tiếp cận thông tin vs Bảo vệ sức khỏe tinh thần',
      stakeholders: [],
      affirmative_cases: [
        { claim: 'Bảo vệ não bộ đang phát triển', reasoning: 'Não bộ vị thành niên dễ tổn thương', evidenceSuggestion: 'Nghiên cứu thần kinh học' }
      ],
      negative_cases: [
        { claim: 'Hạn chế quyền kết nối', reasoning: 'Mạng xã hội là kênh giao tiếp chính', evidenceSuggestion: 'Khảo sát giới trẻ 2024' }
      ],
      burden_of_proof: [],
      rebuttal_vectors: [],
    });

    const parsed = parseMotionAnalysis(validMotion);
    assert('3.3 Motion analysis parsed successfully', parsed !== null);
    assert('3.3 Stakeholders array is empty (not fake filled)', Array.isArray(parsed?.stakeholders) && parsed?.stakeholders.length === 0);
    assert('3.3 Burden of proof array is empty (not fake filled)', Array.isArray(parsed?.burden_of_proof) && parsed?.burden_of_proof.length === 0);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log(`  RESULTS: ${passCount} PASSED, ${failCount} FAILED (Total: ${passCount + failCount})`);
  console.log('============================================================\n');

  if (failCount > 0) {
    console.error('Failed tests:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

void runQualityIntegritySuite();
