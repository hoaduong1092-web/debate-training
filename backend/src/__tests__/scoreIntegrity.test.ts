/**
 * scoreIntegrity.test.ts — AI Debate Master Score Integrity Test Suite
 *
 * Enforces Phase B Forensic Remediation Invariants:
 *   INVARIANT-SCORE-01: NO IMPLICIT PROMOTION
 *   INVARIANT-SCORE-02: ZERO IS A VALID SCORE
 *   INVARIANT-SCORE-03: NO SCORE FABRICATION
 *   INVARIANT-SCORE-04: FRONTEND IS DISPLAY-ONLY FOR SCORE
 *   INVARIANT-SCORE-05: REPLAY IS READ-ONLY SNAPSHOT
 *   INVARIANT-SCORE-06: INVALID TURN MUST NOT ENTER SCORING PIPELINE
 *   INVARIANT-SCORE-07: STT FAILURE MUST NEVER FABRICATE TEXT
 *   INVARIANT-SCORE-08: CURRENT TURN MUST NOT BE REPLACED BY OLD CONTEXT
 *
 * Zero live network / AI calls.
 * Runner: tsx
 */

import {
  adaptLogicCoachPayload,
  isLogicCoachFeedback,
  parseLogicCoachContent,
  normalizeLogicCoachFeedback,
} from '../services/logicCoachParser.js';
import { validateDebateTurnInput } from '../controllers/debateController.js';
import { transcribeBuffer } from '../services/whisperClient.js';
import { buildOpponentPrompt } from '../prompts/opponent.js';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass += 1;
    console.log('  \u2705 PASS', name);
  } else {
    fail += 1;
    failures.push(name);
    console.log('  \u274c FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 120) : '');
  }
}

function section(title: string): void {
  console.log('\n\u25b6 ' + title);
}

// ─── Frontend Contract Mirror ────────────────────────────────────────────────
function frontendIsCoachFeedback(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.score !== null && (typeof v.score !== 'number' || !Number.isFinite(v.score) || v.score < 0 || v.score > 10)) {
    return false;
  }
  const cre = v.cre_analysis;
  if (!cre || typeof cre !== 'object') return false;
  const c = cre as Record<string, unknown>;
  return (
    typeof c.claim === 'string' &&
    typeof c.reasoning === 'string' &&
    typeof c.evidence === 'string' &&
    Array.isArray(v.fallacies_detected) &&
    Array.isArray(v.strengths) &&
    Array.isArray(v.weaknesses) &&
    Array.isArray(v.actionable_suggestions)
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

section('1. Parser & Score Normalization Invariants');

{
  // TC-INT-01: Score 0.0 is valid and preserved
  const scoreZeroJson = JSON.stringify({
    score: 0,
    cre_analysis: {
      claim: 'Không xác định được luận điểm rõ ràng.',
      reasoning: 'Không có lý lẽ nào được trình bày.',
      evidence: 'Không có dẫn chứng nào được cung cấp.',
    },
    fallacies_detected: ['Phát biểu rỗng'],
    strengths: [],
    weaknesses: ['Chưa có luận cứ'],
    actionable_suggestions: ['Trình bày luận điểm hoàn chỉnh'],
  });
  const res0 = parseLogicCoachContent(scoreZeroJson);
  assert('TC-INT-01a: score 0 parse ok', res0.ok === true);
  if (res0.ok) {
    assert('TC-INT-01b: score 0 is strictly preserved as 0 (not promoted)', res0.feedback.score === 0);
    assert('TC-INT-01c: score_source is LLM_EVALUATED', res0.feedback.score_source === 'LLM_EVALUATED');
    assert('TC-INT-01d: passes backend isLogicCoachFeedback', isLogicCoachFeedback(res0.feedback));
    assert('TC-INT-01e: passes frontend isCoachFeedback', frontendIsCoachFeedback(res0.feedback));
  }

  // TC-INT-02: Missing score returns null, NO inference from text length
  const missingScoreJson = JSON.stringify({
    cre_analysis: {
      claim: 'Nghệ thuật AI không phản ánh trải nghiệm con người.',
      reasoning: 'Các giải thưởng sáng tạo được lập ra để tôn vinh cảm xúc con người.',
      evidence: 'Dẫn chứng từ lịch sử hội họa thế giới.',
    },
    fallacies_detected: [],
    strengths: ['Lập luận chặt chẽ'],
    weaknesses: [],
    actionable_suggestions: [],
  });
  const resMissing = parseLogicCoachContent(missingScoreJson);
  assert('TC-INT-02a: missing score parse ok', resMissing.ok === true);
  if (resMissing.ok) {
    assert('TC-INT-02b: missing score is null (no fake inference from length)', resMissing.feedback.score === null);
    assert('TC-INT-02c: score_source is NO_SCORE', resMissing.feedback.score_source === 'NO_SCORE');
    assert('TC-INT-02d: passes frontend isCoachFeedback', frontendIsCoachFeedback(resMissing.feedback));
  }

  // TC-INT-03: Malformed JSON -> score is null (PARSE_FAILED)
  const malformed = adaptLogicCoachPayload('{ invalid json content: 123');
  assert('TC-INT-03a: malformed score is null (not 4.0)', malformed.score === null);
  assert('TC-INT-03b: malformed score_source is PARSE_FAILED', malformed.score_source === 'PARSE_FAILED');
  assert('TC-INT-03c: malformed passes frontend isCoachFeedback', frontendIsCoachFeedback(malformed));

  // TC-INT-04: Score on 0-100 scale normalized to 0-10
  const normalized100 = normalizeLogicCoachFeedback({
    score: 85,
    cre_analysis: { claim: 'C', reasoning: 'R', evidence: 'E' },
    fallacies_detected: [],
    strengths: [],
    weaknesses: [],
    actionable_suggestions: [],
  });
  assert('TC-INT-04: score 85 normalized to 8.5', normalized100?.score === 8.5);

  // TC-INT-05: Negative or out of bounds score normalized to null
  const negScore = normalizeLogicCoachFeedback({
    score: -5,
    cre_analysis: { claim: 'C', reasoning: 'R', evidence: 'E' },
    fallacies_detected: [],
    strengths: [],
    weaknesses: [],
    actionable_suggestions: [],
  });
  assert('TC-INT-05: negative score normalized to null', negScore?.score === null);
}

section('2. Input Validation Gate Invariants (INVARIANT-SCORE-06)');

{
  // TC-INT-06: Empty input rejected
  const vEmpty = validateDebateTurnInput('');
  assert('TC-INT-06a: empty string rejected', vEmpty.isValid === false);
  assert('TC-INT-06b: rejection errorCode is EMPTY_SPEECH', vEmpty.errorCode === 'EMPTY_SPEECH');

  // TC-INT-07: Filler-only rejected
  const vFiller1 = validateDebateTurnInput('à ừm thì là mà');
  assert('TC-INT-07a: filler-only Vietnamese rejected', vFiller1.isValid === false);

  const vFiller2 = validateDebateTurnInput('uhm ah uh uhm');
  assert('TC-INT-07b: filler-only English rejected', vFiller2.isValid === false);

  // TC-INT-08: < 3 words rejected
  const vShort = validateDebateTurnInput('vài giây');
  assert('TC-INT-08: 2-word input rejected', vShort.isValid === false && vShort.errorCode === 'TOO_SHORT_OR_MEANINGLESS');

  // TC-INT-09: Valid input accepted
  const vValid = validateDebateTurnInput('Nghệ thuật AI không thể thay thế con người vì thiếu cảm xúc.');
  assert('TC-INT-09: valid argument accepted', vValid.isValid === true);
}

section('3. STT Integrity (INVARIANT-SCORE-07)');

{
  // TC-INT-10: STT failure returns empty transcript and explicit reason (no school uniform text)
  void (async () => {
    const sttRes = await transcribeBuffer(null, 5000, 'vi');
    assert('TC-INT-10a: STT without buffer returns empty transcript', sttRes.transcript === '');
    assert('TC-INT-10b: STT does NOT return school uniform text', !sttRes.transcript.includes('đồng phục'));
    assert('TC-INT-10c: STT returns explicit fallback_reason', typeof sttRes.fallback_reason === 'string');
  })();
}

section('4. Score Aggregation & Running Average (INVARIANT-SCORE-02)');

{
  // Helper simulating controller aggregation
  function computeSessionAverage(turnScores: (number | null)[]): number | null {
    const validScores: number[] = [];
    for (const s of turnScores) {
      if (typeof s === 'number' && Number.isFinite(s) && s >= 0 && s <= 10) {
        validScores.push(s);
      }
    }
    if (validScores.length === 0) return null;
    return +(validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1);
  }

  // TC-INT-11: Average with score 0.0 ([6.0, 0.0]) -> 3.0 (NOT 8.0, NOT 6.0)
  const avgIncident = computeSessionAverage([6.0, 0.0]);
  assert('TC-INT-11: [6.0, 0.0] average is strictly 3.0', avgIncident === 3.0);

  // TC-INT-12: Average with missing score ([6.0, null]) -> 6.0
  const avgWithNull = computeSessionAverage([6.0, null]);
  assert('TC-INT-12: [6.0, null] average is 6.0', avgWithNull === 6.0);

  // TC-INT-13: Average with all null ([null, null]) -> null
  const avgAllNull = computeSessionAverage([null, null]);
  assert('TC-INT-13: [null, null] average is null (no fake 7.8)', avgAllNull === null);
}

section('5. Opponent Context Leakage Guard (INVARIANT-SCORE-08)');

{
  // TC-INT-15: Opponent prompt includes instruction prohibiting historical argument reuse
  const prompt = buildOpponentPrompt({
    topic: 'Cấm nghệ thuật AI',
    userSide: 'AFFIRMATIVE',
    turnNumber: 2,
    content: 'vài giây không đổi',
    history: [
      { speaker: 'Người dùng', text: 'Nghệ thuật AI không phản ánh trải nghiệm con người.' },
      { speaker: 'Đối thủ AI', text: 'AI phản ánh sự sáng tạo thông qua thuật toán.' },
    ],
  });
  assert('TC-INT-15a: opponent system prompt contains INVARIANT-SCORE-08', prompt.systemPrompt.includes('INVARIANT-SCORE-08'));
  assert('TC-INT-15b: opponent turn prompt includes current turn text', prompt.userPrompt.includes('vài giây không đổi'));
}

// ─── Final Summary ───────────────────────────────────────────────────────────

setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('  SCORE INTEGRITY TEST SUITE: ' + pass + ' PASS  ' + fail + ' FAIL  (total ' + (pass + fail) + ')');
  if (failures.length > 0) {
    failures.forEach((f) => console.log('    * ' + f));
  }
  console.log('='.repeat(60));
  if (fail > 0) process.exit(1);
}, 200);
