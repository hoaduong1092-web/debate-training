/**
 * Offline fixture test for logicCoachParser.
 *
 * Tests ALL real-world Beeknoee/Claude response shapes to verify:
 *   1. score is extracted as a number (never 0.0 from parse failure)
 *   2. cre_analysis.claim is a clean string
 *   3. cre_analysis.reasoning does NOT contain "```json"
 *   4. Fallback path does NOT dump raw text into any cre field
 *
 * Run: npx tsx src/scripts/testCoachParser.ts
 * Must exit with code 0.
 */

import {
  adaptLogicCoachPayload,
  parseLogicCoachContent,
  extractOutermostJsonObject,
  stripMarkdownFences,
} from '../services/logicCoachParser';

// ─── Canonical Fixture ────────────────────────────────────────────────────────

const VALID_FEEDBACK = {
  score: 6,
  cre_analysis: {
    claim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    reasoning: 'Khi học sinh mặc đồng phục, sự khác biệt về hoàn cảnh gia đình giảm bớt',
    evidence: 'Nghiên cứu tại Nhật Bản cho thấy trường có đồng phục giảm 40% bắt nạt liên quan đến quần áo',
  },
  fallacies_detected: [],
  strengths: ['Lập luận rõ ràng', 'Có dẫn chứng'],
  weaknesses: ['Cần thêm số liệu cụ thể'],
  actionable_suggestions: ['Tìm thêm nghiên cứu từ Việt Nam'],
};

const VALID_JSON = JSON.stringify(VALID_FEEDBACK);

// ─── Test Fixtures ────────────────────────────────────────────────────────────

interface Fixture {
  name: string;
  input: unknown;
  expectedScore: number;
  expectedClaim: string;
  noRawInReasoning?: boolean;
}

const fixtures: Fixture[] = [
  // 1. Plain JSON string
  {
    name: '1. Plain JSON string',
    input: VALID_JSON,
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 2. Full markdown fence: ```json\n{...}\n```
  {
    name: '2. Full markdown fence ```json\\n{...}\\n```',
    input: '```json\n' + VALID_JSON + '\n```',
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 3. Fence without trailing newline: ```json\n{...}```
  {
    name: '3. Fence without trailing newline ```json\\n{...}```',
    input: '```json\n' + VALID_JSON + '```',
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 4. Fence without language tag
  {
    name: '4. Fence without language tag ```\\n{...}\\n```',
    input: '```\n' + VALID_JSON + '\n```',
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 5. Embedded fence in prose preamble
  {
    name: '5. Prose preamble + embedded fence',
    input: 'Đây là phân tích của tôi:\n\n```json\n' + VALID_JSON + '\n```\n\nChúc bạn học tốt!',
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 6. Raw JSON with prose preamble (no fence)
  {
    name: '6. Prose preamble + raw JSON (no fence)',
    input: 'Đây là kết quả phân tích:\n' + VALID_JSON + '\n\nHy vọng hữu ích!',
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 7. Double-serialised string (JSON string containing a JSON string)
  {
    name: '7. Double-serialised string',
    input: JSON.stringify(VALID_JSON),
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 8. Already-parsed object
  {
    name: '8. Already-parsed LogicCoachFeedback object',
    input: { ...VALID_FEEDBACK },
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
    noRawInReasoning: true,
  },

  // 9. Score as string "6" (should coerce to number 6)
  {
    name: '9. score as string "6" (coercion)',
    input: JSON.stringify({ ...VALID_FEEDBACK, score: '6' }),
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
  },

  // 10. Wrapped in envelope { data: { ...feedback } }
  {
    name: '10. Envelope { data: {...} }',
    input: JSON.stringify({ data: VALID_FEEDBACK }),
    expectedScore: 6,
    expectedClaim: 'Đồng phục giúp xóa nhòa khoảng cách giàu nghèo',
  },
];

// ─── Fallback Fixtures ────────────────────────────────────────────────────────

interface FallbackFixture {
  name: string;
  input: unknown;
}

const fallbackFixtures: FallbackFixture[] = [
  {
    name: 'F1. Empty string → fallback (score=0, no raw dump)',
    input: '',
  },
  {
    name: 'F2. Plain prose (no JSON) → fallback',
    input: 'Phân tích của tôi là bạn đã làm tốt.',
  },
  {
    name: 'F3. Null → fallback',
    input: null,
  },
];

// ─── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`    ✓ ${msg}`);
    passed++;
  } else {
    console.error(`    ✗ FAIL: ${msg}`);
    failed++;
  }
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  LOGIC COACH PARSER — OFFLINE FIXTURE TESTS');
console.log('══════════════════════════════════════════════════════\n');

// Unit tests for stripMarkdownFences
console.log('── stripMarkdownFences unit tests ──────────────────\n');

const fenceTests: Array<{ input: string; expected: string; label: string }> = [
  { label: 'plain JSON unchanged', input: '{"a":1}', expected: '{"a":1}' },
  { label: 'full fence stripped', input: '```json\n{"a":1}\n```', expected: '{"a":1}' },
  { label: 'fence no trailing newline', input: '```json\n{"a":1}```', expected: '{"a":1}' },
  { label: 'fence no language tag', input: '```\n{"a":1}\n```', expected: '{"a":1}' },
  { label: 'no-newline after opening fence', input: '```json{"a":1}```', expected: '{"a":1}' },
];

for (const ft of fenceTests) {
  const result = stripMarkdownFences(ft.input);
  assert(result === ft.expected, `stripMarkdownFences: ${ft.label} → "${result}"`);
}

// Main fixture tests
console.log('\n── adaptLogicCoachPayload fixture tests ────────────\n');

for (const fixture of fixtures) {
  console.log(`  ${fixture.name}`);
  const result = adaptLogicCoachPayload(fixture.input as any);

  assert(
    result.score === fixture.expectedScore,
    `score === ${fixture.expectedScore} (got ${result.score})`,
  );
  assert(
    result.cre_analysis.claim === fixture.expectedClaim,
    `cre_analysis.claim correct (got: "${result.cre_analysis.claim.slice(0, 60)}")`,
  );
  if (fixture.noRawInReasoning) {
    assert(
      !result.cre_analysis.reasoning.includes('```json'),
      `cre_analysis.reasoning does NOT contain \`\`\`json`,
    );
    assert(
      !result.cre_analysis.reasoning.includes('```'),
      `cre_analysis.reasoning does NOT contain backtick fences`,
    );
  }
  console.log('');
}

// Fallback fixture tests
console.log('── Fallback fixtures (score=0, no raw dump) ────────\n');

for (const ff of fallbackFixtures) {
  console.log(`  ${ff.name}`);
  const result = adaptLogicCoachPayload(ff.input as any);

  assert(result.score === 0, `fallback score === 0 (got ${result.score})`);
  assert(
    !result.cre_analysis.reasoning.includes('```'),
    `fallback reasoning does NOT contain backtick fences`,
  );
  assert(
    result.cre_analysis.claim === '',
    `fallback cre_analysis.claim is empty (got: "${result.cre_analysis.claim.slice(0, 60)}")`,
  );
  console.log('');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════════════\n');

if (failed > 0) {
  process.exit(1);
}
