/**
 * Logic Coach — Prompt Builder
 *
 * Builds the system + user prompts for the Logic Coach LLM call.
 * The coach evaluates the student's argument for C-R-E structure,
 * logical fallacies, and — when history is present — progress across turns.
 *
 * Output contract is STRICTLY preserved (no schema change):
 * {
 *   score, cre_analysis: {claim, reasoning, evidence},
 *   fallacies_detected[], strengths[], weaknesses[], actionable_suggestions[]
 * }
 *
 * Token budget discipline:
 * - History: last 3 user turns only, compact format (score + key issues)
 * - JSON output: max 2 sentences per string field, max 3 items per array
 * - Total JSON output target: < 700 tokens
 */

export interface LogicCoachHistoryTurn {
  speaker: string;
  text: string;
  coachFeedback?: {
    score: number;
    fallacies_detected: string[];
    weaknesses: string[];
    actionable_suggestions: string[];
  };
}

export interface TargetArgumentContext {
  argumentId?: string;
  order?: number;
  claim: string;
  reasoning?: string;
  evidenceSuggestion?: string;
}

export interface LogicCoachPromptInput {
  topic: string;
  stance: 'AFFIRMATIVE' | 'NEGATIVE';
  content: string;
  history?: LogicCoachHistoryTurn[];
  targetArgument?: TargetArgumentContext;
}

// ─── History Formatter ────────────────────────────────────────────────────────

/**
 * Format a single history turn into compact text.
 * User argument is truncated to 120 chars to bound token usage.
 * Coach feedback shows only key metrics (score, top issues).
 */
function formatHistoryTurn(turn: LogicCoachHistoryTurn, turnIndex: number): string {
  // Truncate long user text to keep prompt compact.
  const textPreview =
    turn.text.length > 120 ? turn.text.slice(0, 120) + '…' : turn.text;

  const lines = [`[Lượt ${turnIndex + 1}] ${textPreview}`];

  if (turn.coachFeedback) {
    const fb = turn.coachFeedback;
    lines.push(`  Điểm: ${fb.score}/10`);
    // Only include non-empty arrays, limit to top 2 items each.
    if (fb.fallacies_detected.length > 0) {
      lines.push(`  Ngụy biện: ${fb.fallacies_detected.slice(0, 2).join('; ')}`);
    }
    if (fb.weaknesses.length > 0) {
      lines.push(`  Điểm yếu: ${fb.weaknesses.slice(0, 2).join('; ')}`);
    }
    if (fb.actionable_suggestions.length > 0) {
      lines.push(`  Gợi ý trước: ${fb.actionable_suggestions.slice(0, 1).join('; ')}`);
    }
  } else {
    lines.push('  (Chưa có phản hồi Coach)');
  }

  return lines.join('\n');
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

export function buildLogicCoachPrompt(
  input: LogicCoachPromptInput,
): { systemPrompt: string; userPrompt: string } {
  // Sliding window: use only the last 3 history turns to bound token usage.
  const allHistory = input.history ?? [];
  const history = allHistory.slice(-3);
  const hasHistory = history.length > 0;

  // ── System prompt ──────────────────────────────────────────────────────────
  const progressSection = hasHistory
    ? `
# ĐÁNH GIÁ TIẾN BỘ
So sánh lượt hiện tại với lịch sử:
- Học sinh có khắc phục điểm yếu/ngụy biện từ lượt trước? → ghi vào strengths.
- Lặp lỗi cũ hoặc mắc lỗi mới? → ghi vào weaknesses/fallacies_detected.
- Điểm số phản ánh xu hướng: tiến bộ → tăng, thoái bộ → giảm.`
    : `
# LƯU Ý
Lượt đầu tiên — phân tích độc lập, chưa có lịch sử.`;

  const targetArgTask = input.targetArgument?.claim
    ? `
4. Đánh giá mức độ người học bảo vệ/triển khai thành công Luận điểm mục tiêu (so khớp nội dung phát biểu với Luận điểm dự kiến: "${input.targetArgument.claim}").`
    : '';

  const systemPrompt = `Bạn là Logic Coach ngắn gọn cho ứng dụng AI Debate Master.

# NHIỆM VỤ
1. Phân tích C-R-E (Claim, Reasoning, Evidence) của lập luận.
2. Phát hiện ngụy biện logic nếu có.
3. Đưa ra phản hồi sư phạm, cụ thể.${targetArgTask}
${progressSection}

# QUY TẮC ĐẦU RA — CRITICAL
OUTPUT ONLY VALID JSON. NO PREAMBLE. NO EXPLANATION OUTSIDE JSON. NO MARKDOWN FENCES.
Bắt đầu ngay bằng ký tự '{'. Kết thúc bằng ký tự '}'.
Schema bắt buộc:
{"score":number,"cre_analysis":{"claim":string,"reasoning":string,"evidence":string},"fallacies_detected":string[],"strengths":string[],"weaknesses":string[],"actionable_suggestions":string[]}

Thang điểm: 0–10. Mỗi string TỐI ĐA 1 câu ngắn (≤25 từ). Mỗi mảng TỐI ĐA 2 phần tử.`;

  // ── User prompt ────────────────────────────────────────────────────────────
  const stanceLabel =
    input.stance === 'AFFIRMATIVE' ? 'ỦNG HỘ' : 'PHẢN ĐỐI';

  const formattedHistory = hasHistory
    ? history.map((t, i) => formatHistoryTurn(t, allHistory.length - history.length + i)).join('\n\n')
    : 'Chưa có.';

  let targetContextText = '';
  if (input.targetArgument?.claim) {
    targetContextText = `\n[Kế hoạch Luận điểm mục tiêu của người học]
- Mã luận điểm: ${input.targetArgument.argumentId || 'N/A'}${input.targetArgument.order ? ` (Thứ tự: ${input.targetArgument.order})` : ''}
- Luận điểm dự kiến: ${input.targetArgument.claim}
${input.targetArgument.reasoning ? `- Lý lẽ dự kiến: ${input.targetArgument.reasoning}\n` : ''}${input.targetArgument.evidenceSuggestion ? `- Dẫn chứng chuẩn bị: ${input.targetArgument.evidenceSuggestion}\n` : ''}`;
  }

  const userPrompt = `Chủ đề: "${input.topic}" | Phe: ${stanceLabel}
${targetContextText}
Lịch sử ${history.length} lượt gần nhất:
${formattedHistory}

Lập luận hiện tại (Lượt ${allHistory.length + 1}):
"${input.content}"

Trả JSON.`;

  return { systemPrompt, userPrompt };
}
