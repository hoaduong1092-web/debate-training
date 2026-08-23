/**
 * Offline contract test: backend parser output vs frontend isCoachFeedback.
 * Zero network / zero AI calls.
 *
 * Score Integrity Remediated Contract (INVARIANT-SCORE-01 to 03):
 * - Score 0 is a valid score (never converted to fallback or null).
 * - Missing score returns score: null and score_source: 'NO_SCORE'.
 * - Parse error returns score: null and score_source: 'PARSE_FAILED'.
 */
import {
  adaptLogicCoachPayload,
  isLogicCoachFeedback,
  parseLogicCoachContent,
} from './services/logicCoachParser.js';

/** Exact frontend CoachFeedback guard (frontend/src/lib/api.ts). */
function isCoachFeedback(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (v.score !== null && (typeof v.score !== 'number' || !Number.isFinite(v.score) || v.score < 0 || v.score > 10)) {
    return false;
  }
  const cre = v.cre_analysis;
  if (!cre || typeof cre !== 'object') {
    return false;
  }
  const c = cre as Record<string, unknown>;
  return (
    typeof c.claim === 'string' &&
    typeof c.reasoning === 'string' &&
    typeof c.evidence === 'string' &&
    isStringArray(v.fallacies_detected) &&
    isStringArray(v.strengths) &&
    isStringArray(v.weaknesses) &&
    isStringArray(v.actionable_suggestions)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const VALID = {
  score: 7.5,
  cre_analysis: {
    claim: 'Under-15 social media use should be restricted.',
    reasoning: 'Developing brains are more susceptible to addictive design.',
    evidence: 'Developmental psychology literature on reward systems.',
  },
  fallacies_detected: ['Appeal to Emotion'],
  strengths: ['Clear claim'],
  weaknesses: ['Needs a source citation'],
  actionable_suggestions: ['Add one peer-reviewed study'],
};

/**
 * EXACT raw response string captured from browser Network DevTools (fixture).
 */
const FIXTURE_RAW = `{
  "score": 2,
  "cre_analysis": {
    "claim": "Học sinh dưới 15 tuổi không nên sử dụng mạng xã hội (ngụ ý từ ngữ cảnh).",
    "reasoning": "Máy móc thiếu cảm xúc nên không thể thấu hiểu tâm lý học sinh.",
    "evidence": "Không có dẫn chứng nào được cung cấp."
  },
  "fallacies_detected": ["Non Sequitur", "Red Herring"],
  "strengths": ["Đề cập đến yếu tố tâm lý và cảm xúc."],
  "weaknesses": ["Lạc chủ đề", "Không có dẫn chứng cụ thể"],
  "actionable_suggestions": ["Bổ sung dẫn chứng số liệu"]
}`;

const FIXTURE_FENCED = '```json\n' + FIXTURE_RAW + '\n```';

const FIXTURE_CAMEL_EVIDENCE_ARRAY = `{
  "score": 6,
  "creAnalysis": {
    "claim": "Claim text",
    "reasoning": "Reasoning text",
    "evidence": ["Evidence item A", "Evidence item B"]
  },
  "fallacies_detected": [],
  "strengths": [],
  "weaknesses": [],
  "actionable_suggestions": []
}`;

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass += 1;
    console.log('PASS', name);
  } else {
    fail += 1;
    console.log('FAIL', name, detail === undefined ? '' : detail);
  }
}

function main(): void {
  const parsed = parseLogicCoachContent(JSON.stringify(VALID));
  assert('parseLogicCoachContent ok', parsed.ok === true);
  if (parsed.ok) {
    assert('frontend isCoachFeedback(valid)', isCoachFeedback(parsed.feedback));
    assert('backend isLogicCoachFeedback(valid)', isLogicCoachFeedback(parsed.feedback));
  }

  // ── INVARIANT-SCORE-02: Score 0 is valid and preserved ─────────────────
  const scoreZeroPayload = JSON.stringify({
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
  const zeroParsed = parseLogicCoachContent(scoreZeroPayload);
  assert('score 0 parsed.ok === true', zeroParsed.ok === true);
  if (zeroParsed.ok) {
    assert('score 0 preserved as 0 (not null, not 4, not 8)', zeroParsed.feedback.score === 0);
    assert('score 0 source is LLM_EVALUATED', zeroParsed.feedback.score_source === 'LLM_EVALUATED');
    assert('score 0 passes isLogicCoachFeedback', isLogicCoachFeedback(zeroParsed.feedback));
    assert('score 0 passes frontend isCoachFeedback', isCoachFeedback(zeroParsed.feedback));
  }

  // ── INVARIANT-SCORE-03: Missing score returns null, NO INFERENCE ────────
  const missingScorePayload = JSON.stringify({
    cre_analysis: {
      claim: 'Dong phuc thuc day binh dang hoc duong.',
      reasoning: 'Giam bot khoang cach giau ngheo.',
      evidence: 'Khao sat tai 50 truong trung hoc.',
    },
    fallacies_detected: [],
    strengths: ['Dan chung tot'],
    weaknesses: [],
    actionable_suggestions: [],
  });
  const missingParsed = parseLogicCoachContent(missingScorePayload);
  assert('missing score parsed.ok === true', missingParsed.ok === true);
  if (missingParsed.ok) {
    assert('missing score is null (no fake inference)', missingParsed.feedback.score === null);
    assert('missing score source is NO_SCORE', missingParsed.feedback.score_source === 'NO_SCORE');
    assert('missing score passes isLogicCoachFeedback', isLogicCoachFeedback(missingParsed.feedback));
    assert('missing score passes frontend isCoachFeedback', isCoachFeedback(missingParsed.feedback));
  }

  const fenced = adaptLogicCoachPayload('```json\n' + JSON.stringify(VALID) + '\n```');
  assert('fenced adapter isCoachFeedback', isCoachFeedback(fenced));
  assert('fenced has no raw key as payload', !('raw' in fenced && !('score' in fenced)));

  const camel = parseLogicCoachContent(
    JSON.stringify({
      score: '8',
      creAnalysis: { claim: 'C', reasoning: 'R', evidence: 'E' },
      fallaciesDetected: ['Strawman'],
      strengths: ['s'],
      weaknesses: ['w'],
      actionableSuggestions: ['a'],
    }),
  );
  assert('camelCase/score-string normalized', camel.ok === true && isCoachFeedback(camel.ok ? camel.feedback : null));

  const noisy = adaptLogicCoachPayload(
    'Here you go:\n' + JSON.stringify(VALID) + '\nThanks!',
  );
  assert('noisy wrapper isCoachFeedback', isCoachFeedback(noisy));

  // ── INVARIANT-SCORE-01: Malformed adapter returns score: null (PARSE_FAILED)
  const malformed = adaptLogicCoachPayload('{ score: 1, not json');
  assert('malformed adapter still isCoachFeedback', isCoachFeedback(malformed));
  assert('malformed score is null (not 4.0)', malformed.score === null);
  assert('malformed score_source is PARSE_FAILED', malformed.score_source === 'PARSE_FAILED');

  const missing = adaptLogicCoachPayload(JSON.stringify({ score: 5, cre_analysis: { claim: 'only' } }));
  assert('partial CRE adapter isCoachFeedback', isCoachFeedback(missing));
  assert('partial CRE claim preserved', missing.cre_analysis.claim === 'only');

  const empty = adaptLogicCoachPayload('');
  assert('empty adapter isCoachFeedback', isCoachFeedback(empty));
  assert('empty adapter score is null', empty.score === null);
  assert('empty adapter score_source is PARSE_FAILED', empty.score_source === 'PARSE_FAILED');

  const httpShape = {
    success: true,
    data: adaptLogicCoachPayload(JSON.stringify(VALID)),
    telemetry: { tokens: { prompt_tokens: 1, completion_tokens: 2 } },
  };
  assert('HTTP data field isCoachFeedback', isCoachFeedback(httpShape.data));

  // ── DevTools fixture (exact runtime evidence) ────────────────────────────
  const fixtureParsed = parseLogicCoachContent(FIXTURE_RAW);
  assert('fixture raw parse ok', fixtureParsed.ok === true, fixtureParsed);
  assert('fixture raw isCoachFeedback', isCoachFeedback(adaptLogicCoachPayload(FIXTURE_RAW)));

  const fixtureFenced = adaptLogicCoachPayload(FIXTURE_FENCED);
  assert('fixture fenced isCoachFeedback', isCoachFeedback(fixtureFenced));
  assert('fixture fenced no raw key', !('raw' in fixtureFenced));
  assert('fixture fenced C-R-E preserved', fixtureFenced.cre_analysis.claim.length > 0);
  assert('fixture fenced evidence string', typeof fixtureFenced.cre_analysis.evidence === 'string');
  assert('fixture fenced arrays', Array.isArray(fixtureFenced.fallacies_detected));

  const noisyFixture = adaptLogicCoachPayload('Phản hồi của tôi:\n' + FIXTURE_FENCED + '\nChúc học tốt!');
  assert('fixture noisy wrapper isCoachFeedback', isCoachFeedback(noisyFixture));

  // ── camelCase creAnalysis + evidence array normalization ──────────────────
  const camelArr = parseLogicCoachContent(FIXTURE_CAMEL_EVIDENCE_ARRAY);
  assert('camel creAnalysis + evidence[] parse ok', camelArr.ok === true, camelArr);
  if (camelArr.ok) {
    assert('evidence array joined to string', camelArr.feedback.cre_analysis.evidence === 'Evidence item A; Evidence item B');
    assert('camel normalized isCoachFeedback', isCoachFeedback(camelArr.feedback));
  }

  console.log(`\n=== SUMMARY pass=${pass} fail=${fail} ===`);
  if (fail > 0) process.exit(1);
}

main();
