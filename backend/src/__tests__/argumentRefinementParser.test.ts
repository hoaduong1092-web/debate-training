/**
 * Argument Refinement Parser & Normalizer Unit Tests
 * Spec: AI_ARGUMENT_REFINEMENT_SPEC.md
 */

import { parseArgumentRefinement } from '../services/assistantParser';

let passCount = 0;
let failCount = 0;

function assert(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passCount += 1;
    console.log(`  ✅ PASS: ${name}`);
  } else {
    failCount += 1;
    console.log(`  ❌ FAIL: ${name}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

console.log('\n▶ Testing parseArgumentRefinement Normalizer');

// Case A: Pure JSON (camelCase)
{
  const raw = JSON.stringify({
    claim: 'Học sinh nên được rèn luyện tư duy phản biện từ sớm.',
    reasoning: 'Tư duy phản biện giúp học sinh phân tích thông tin độc lập và tránh bị dẫn dắt bởi tin giả.',
    evidenceSuggestion: 'Tham khảo báo cáo của OECD về giáo dục thế kỷ 21.',
    refinementNote: 'Chuẩn hóa cấu trúc C-R-E.',
  });
  const res = parseArgumentRefinement(raw);
  assert('Case A (camelCase): claim parsed', res?.claim.toLowerCase().includes('tư duy phản biện') === true);
  assert('Case A (camelCase): reasoning parsed', res?.reasoning.includes('OECD') === false && res?.reasoning.length! > 10);
  assert('Case A (camelCase): evidenceSuggestion parsed', res?.evidenceSuggestion.includes('OECD') === true);
  assert('Case A (camelCase): refinementNote parsed', res?.refinementNote.includes('C-R-E') === true);
}

// Case B: Markdown fenced JSON
{
  const raw = '```json\n{\n  "claim": "Claim B",\n  "reasoning": "Reasoning B",\n  "evidenceSuggestion": "Evidence B"\n}\n```';
  const res = parseArgumentRefinement(raw);
  assert('Case B (Markdown fence): claim parsed', res?.claim === 'Claim B');
  assert('Case B (Markdown fence): reasoning parsed', res?.reasoning === 'Reasoning B');
  assert('Case B (Markdown fence): evidenceSuggestion parsed', res?.evidenceSuggestion === 'Evidence B');
}

// Case C: Text surrounding JSON
{
  const raw = 'Dưới đây là phương án hiệu chỉnh của tôi:\n```json\n{\n  "claim": "Claim C",\n  "reasoning": "Reasoning C"\n}\n```\nHy vọng giúp ích cho bạn!';
  const res = parseArgumentRefinement(raw);
  assert('Case C (Surrounding prose): claim parsed', res?.claim === 'Claim C');
  assert('Case C (Surrounding prose): reasoning parsed', res?.reasoning === 'Reasoning C');
  assert('Case C (Surrounding prose): evidenceSuggestion empty string', res?.evidenceSuggestion === '');
}

// Case D: Snake_case & Vietnamese keys
{
  const raw = JSON.stringify({
    luan_diem: 'Luận điểm tiếng Việt',
    lap_luan: 'Lập luận nhân quả tiếng Việt',
    dan_chung: 'Dẫn chứng tham khảo',
    ghi_chu: 'Ghi chú cải tiến',
  });
  const res = parseArgumentRefinement(raw);
  assert('Case D (Vietnamese keys): claim parsed', res?.claim === 'Luận điểm tiếng Việt');
  assert('Case D (Vietnamese keys): reasoning parsed', res?.reasoning === 'Lập luận nhân quả tiếng Việt');
  assert('Case D (Vietnamese keys): evidenceSuggestion parsed', res?.evidenceSuggestion === 'Dẫn chứng tham khảo');
  assert('Case D (Vietnamese keys): refinementNote parsed', res?.refinementNote === 'Ghi chú cải tiến');
}

// Case E: Nested response object ({ result: ... })
{
  const raw = JSON.stringify({
    result: {
      claim: 'Nested Claim',
      reasoning: 'Nested Reasoning',
      evidence_suggestion: 'Nested Evidence',
    },
  });
  const res = parseArgumentRefinement(raw);
  assert('Case E (Nested result): claim parsed', res?.claim === 'Nested Claim');
  assert('Case E (Nested result): reasoning parsed', res?.reasoning === 'Nested Reasoning');
  assert('Case E (Nested result): evidenceSuggestion parsed', res?.evidenceSuggestion === 'Nested Evidence');
}

// Case F: Evidence as Array of strings
{
  const raw = JSON.stringify({
    claim: 'Claim with array evidence',
    reasoning: 'Reasoning with array evidence',
    evidenceSuggestion: ['Nghiên cứu UNESCO 2023', 'Báo cáo Bộ GD&ĐT 2024'],
  });
  const res = parseArgumentRefinement(raw);
  assert('Case F (Array evidence): joined into single string', Boolean(res?.evidenceSuggestion.includes('UNESCO') && res?.evidenceSuggestion.includes('Bộ GD&ĐT')));
}

// Case G: Evidence as nested object
{
  const raw = JSON.stringify({
    claim: 'Claim with obj evidence',
    reasoning: 'Reasoning with obj evidence',
    evidenceSuggestion: { suggestion: 'Tham khảo dữ liệu từ Ngân hàng Thế giới' },
  });
  const res = parseArgumentRefinement(raw);
  assert('Case G (Object evidence): string extracted', res?.evidenceSuggestion.includes('Ngân hàng Thế giới') === true);
}

// Case H: Invalid input (empty / missing claim / missing reasoning)
{
  assert('Case H1: null input returns null', parseArgumentRefinement(null) === null);
  assert('Case H2: empty string returns null', parseArgumentRefinement('') === null);
  assert('Case H3: missing reasoning returns null', parseArgumentRefinement(JSON.stringify({ claim: 'Only claim' })) === null);
  assert('Case H4: missing claim returns null', parseArgumentRefinement(JSON.stringify({ reasoning: 'Only reasoning' })) === null);
}

console.log(`\nRESULTS: ${passCount} passed, ${failCount} failed`);
process.exit(failCount > 0 ? 1 : 0);
