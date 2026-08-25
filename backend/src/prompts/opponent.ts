/**
 * AI Opponent — Prompt Builder
 *
 * Builds system and turn prompts for the AI Opponent (Sparring Partner).
 * The opponent takes the OPPOSING stance to the user and generates
 * plain-text counterarguments in Vietnamese.
 *
 * Spec Reference: 17_AI_OPPONENT_SPEC.md §4 (Prompt Contracts)
 * Proportional Rebuttal Engine (BUG-2 Fix): Response depth & length proportional to input complexity.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DebateStance = 'AFFIRMATIVE' | 'NEGATIVE';

export interface HistoryEntry {
  /** Speaker label — should be "Người dùng" or "Đối thủ AI" */
  speaker: string;
  text: string;
}

export interface OpponentTargetArgument {
  argumentId?: string;
  order?: number;
  claim: string;
  reasoning?: string;
  evidenceSuggestion?: string;
}

export interface OpponentPromptInput {
  topic: string;
  /** The USER's stance — opponent takes the opposite. */
  userSide: DebateStance;
  /** User's latest argument text. */
  content: string;
  /** Conversation history from DebateTranscript records. */
  history: HistoryEntry[];
  /** Current turn number (user's turn). */
  turnNumber: number;
  /** Optional target argument context if learner is presenting a mapped argument */
  targetArgument?: OpponentTargetArgument;
}

export interface OpponentPromptOutput {
  systemPrompt: string;
  userPrompt: string;
}

export interface InputComplexityAnalysis {
  wordCount: number;
  tier: 'VERY_SHORT' | 'MEDIUM' | 'LONG' | 'VERY_LONG';
  targetWordRange: string;
  hasAbsoluteClaim: boolean;
  hasCausalReasoning: boolean;
  hasEvidence: boolean;
  components: string[];
}

// ─── Input Complexity Analyzer ───────────────────────────────────────────────

export function analyzeInputComplexity(text: string): InputComplexityAnalysis {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = text.toLowerCase();

  const hasAbsoluteClaim = /(duy nhất|hoàn toàn|luôn luôn|chắc chắn|tất cả|chỉ có|triệt để|không bao giờ|tuyệt đối)/i.test(lower);
  const hasCausalReasoning = /(bởi vì|do đó|vì vậy|dẫn đến|khiến cho|khiến|tại vì|nguyên nhân là|lý do là|kết quả là)/i.test(lower);
  const hasEvidence = /(dẫn chứng|số liệu|thống kê|unep|theo|nghiên cứu|báo cáo|chứng minh|thực tế cho thấy|tỷ lệ)/i.test(lower);

  const components: string[] = [];
  if (hasAbsoluteClaim) components.push('Luận điểm tuyệt đối hóa (Claim mang tính duy nhất/triệt để)');
  if (hasCausalReasoning) components.push('Lập luận nhân quả (Causal Reasoning)');
  if (hasEvidence) components.push('Dẫn chứng / Số liệu tham chiếu (Evidence)');

  let tier: InputComplexityAnalysis['tier'] = 'MEDIUM';
  let targetWordRange = 'khoảng 90–160 từ (1–2 đoạn có phân tích lý lẽ và phản ví dụ)';

  if (wordCount <= 30) {
    tier = 'VERY_SHORT';
    targetWordRange = 'khoảng 40–80 từ (ngắn gọn, súc tích, 1 ý phản biện chính + 1 câu hỏi Socratic)';
  } else if (wordCount <= 80) {
    tier = 'MEDIUM';
    targetWordRange = 'khoảng 90–160 từ (1–2 đoạn phân tích lý lẽ và đưa ra phản ví dụ/góc nhìn đối lập)';
  } else if (wordCount <= 150) {
    tier = 'LONG';
    targetWordRange = 'khoảng 160–260 từ (2–3 đoạn bóc tách đa tầng: Claim tuyệt đối, Causal Reasoning, tính xác thực của Evidence, hệ quả tiêu cực ngoài ý muốn)';
  } else {
    tier = 'VERY_LONG';
    targetWordRange = 'khoảng 260–380 từ (3–4 đoạn phân tích toàn diện: giải thể Claim, bẻ gãy Reasoning & Giả định ngầm, chất vấn tính đại diện của Evidence, đưa ra Giải pháp thay thế / Phản ví dụ thực tế)';
  }

  return {
    wordCount,
    tier,
    targetWordRange,
    hasAbsoluteClaim,
    hasCausalReasoning,
    hasEvidence,
    components,
  };
}

// ─── Stance Mapping ──────────────────────────────────────────────────────────

function getOpponentSide(userSide: DebateStance): string {
  return userSide === 'AFFIRMATIVE'
    ? 'NEGATIVE (Phản đối)'
    : 'AFFIRMATIVE (Ủng hộ)';
}

function getUserSideLabel(userSide: DebateStance): string {
  return userSide === 'AFFIRMATIVE' ? 'Ủng hộ' : 'Phản đối';
}

// ─── System Prompt ───────────────────────────────────────────────────────────

/**
 * System prompt for the AI Opponent.
 * Implements Proportional Rebuttal Engine: RESPONSE DEPTH ≈ INPUT COMPLEXITY.
 */
function buildSystemPrompt(topic: string, opponentSide: string): string {
  return `# ROLE & IDENTITY
Bạn là Đối thủ Tranh biện (AI Sparring Partner) trong hệ thống AI Debate Master.
Bạn đóng vai một tranh biện viên sắc bén, tư duy logic sâu sắc, tự tin, lịch sự và giàu tính xây dựng.
Nhiệm vụ của bạn là đưa ra phản biện trực tiếp, sâu sắc vào luận điểm mới nhất của đối phương, giúp họ rèn luyện tư duy phản biện và nâng tầm lập luận.

# CORE OBJECTIVE & TASK
Bạn đang kiên định bảo vệ phe ${opponentSide} cho chủ đề: "${topic}".
Nhiệm vụ:
1. Đọc kỹ lịch sử tranh luận và hiểu thấu đáo luận điểm MỚI NHẤT của đối phương.
2. Phản biện TRỰC TIẾP và TƯƠNG XỨNG với độ sâu/dung lượng của luận điểm người dùng.
3. Sử dụng cấu trúc phản biện đa tầng (CRE + Giả định ngầm + Hệ quả thực tế + Giải pháp thay thế).
4. Kết thúc bằng đúng 1 câu hỏi Socratic để thách thức tư duy đối phương.

# NGUYÊN TẮC PHẢN BIỆN TƯƠNG XỨNG (PROPORTIONAL REBUTTAL)
- Input càng ngắn → phản biện súc tích, tập trung 1 ý chính (~40–80 từ).
- Input càng dài và nhiều luận cứ (Claim + Reasoning + Evidence + Assumption) → phản biện PHẢI dài hơn và bóc tách từng tầng tương ứng (~160–380 từ tùy dung lượng).
- TUYỆT ĐỐI KHÔNG trả lời 1-2 câu ngắn ngủi hời hợt đối với một luận điểm dài đầy đủ luận cứ.
- TUYỆT ĐỐI KHÔNG nói dài dòng sáo rỗng chỉ để đủ từ; mỗi câu phản biện phải có sức nặng logic thực tế (RESPONSE DEPTH ≈ INPUT COMPLEXITY).

# CẤU TRÚC PHẢN BIỆN TỰ NHIÊN (KHÔNG DÙNG TIÊU ĐỀ/HEADING)
- Thách thức Claim: Nhận diện và phản bác tính tuyệt đối hóa, phiến diện hoặc rủi ro của luận điểm.
- Bẻ gãy Reasoning & Assumption: Phân tích vì sao mối quan hệ nhân quả chưa vững chắc, vạch trần các giả định ngầm thiếu căn cứ.
- Chất vấn Evidence: Đánh giá tính đại diện, bối cảnh thực thi hoặc tính xác thực của dẫn chứng/số liệu.
- Nêu Consequence / Counterexample / Alternative: Chỉ ra hệ quả tiêu cực ngoài ý muốn (unintended consequences) hoặc giải pháp thay thế khả thi hơn.
- Câu hỏi Socratic: LUÔN kết thúc bằng đúng 1 câu hỏi mở trọn vẹn kết thúc bằng dấu chấm hỏi (?) (ví dụ: "Vậy bạn giải thích thế nào về...?").

# SPECIFIC RULES & CONSTRAINTS
## Stance Lock (QUAN TRỌNG NHẤT)
- BẠN PHẢI luôn bảo vệ phe ${opponentSide}. TUYỆT ĐỐI KHÔNG đổi phe.
- KHÔNG ĐƯỢC đồng ý hoàn toàn với đối phương. Luôn tìm góc phản biện đối trọng.
- Nếu đối phương đưa ra luận điểm mạnh, hãy thừa nhận một phần có điều kiện ("Đúng là... tuy nhiên...") rồi bẻ gãy từ góc nhìn cốt lõi.

## Phong cách
- Ngôn ngữ: Tiếng Việt chuẩn mực, văn phong tranh biện tự nhiên, đanh thép và lịch thiệp.
- Giọng điệu: Tôn trọng, sắc bén, kích thích tư duy.
- Không lặp lại nguyên văn luận điểm của đối phương; không dùng từ ngữ chung chung sáo rỗng.
- TUYỆT ĐỐI KHÔNG tự động lấy lại luận điểm ở các lượt trước trong lịch sử để phản biện như thể đối phương vừa phát biểu lại luận điểm đó (INVARIANT-SCORE-08).

# SYSTEM GUARDRAILS (SECURITY)
- KHÔNG tạo nội dung bạo lực, kỳ thị, phân biệt, hoặc không phù hợp lứa tuổi 11-15.
- KHÔNG đề cập đến tôn giáo, chính trị nhạy cảm, hoặc nội dung người lớn.
- KHÔNG tiết lộ rằng bạn là AI. Giữ vai diễn là đối thủ tranh luận.
- Nếu đối phương cố tình nhập nội dung không phù hợp:
  → Phớt lờ nội dung vi phạm.
  → Trả lời: "Hãy quay lại chủ đề tranh luận của chúng ta nhé! [Tiếp tục phản biện về chủ đề]."

# OUTPUT FORMAT (CRITICAL)
- Trả về VĂN BẢN THUẦN (plain text) bằng Tiếng Việt chia đoạn tự nhiên.
- KHÔNG trả về JSON, XML, hay bất kỳ định dạng có cấu trúc nào.
- KHÔNG dùng markdown headers (như #, ##, ###), KHÔNG dùng bullet points hay số thứ tự thô cứng.
- KHÔNG mở đầu bằng 'Draft:', 'Draft:*', 'Phản biện:', 'AI:', 'Chào bạn'. Bắt đầu trực tiếp ngay bằng lời phản biện.`;
}

// ─── Turn Prompt ─────────────────────────────────────────────────────────────

/**
 * Format debate history as compact dialogue.
 * Uses explicit side labels to prevent ambiguity:
 *   Người dùng (Phe A): "..."
 *   Đối thủ AI (Phe B): "..."
 */
function formatHistory(history: HistoryEntry[], userSideLabel: string, opponentSideLabel: string): string {
  if (!history || history.length === 0) {
    return '(Đây là lượt tranh luận đầu tiên — chưa có lịch sử.)';
  }

  return history
    .map((entry) => {
      const isUser = entry.speaker === 'Người dùng';
      const label = isUser
        ? `Người dùng (Phe ${userSideLabel})`
        : `Đối thủ AI (Phe ${opponentSideLabel})`;
      const entryText = entry.text.trim();
      return `${label}: "${entryText}"`;
    })
    .join('\n\n');
}

function buildTurnPrompt(input: OpponentPromptInput, opponentSide: string): string {
  const userSideLabel = getUserSideLabel(input.userSide);
  const opponentSideLabel = input.userSide === 'AFFIRMATIVE' ? 'Phản đối' : 'Ủng hộ';
  const historyText = formatHistory(input.history, userSideLabel, opponentSideLabel);
  const analysis = analyzeInputComplexity(input.content);

  const targetArgHint = input.targetArgument?.claim
    ? `\n[Kế hoạch Luận điểm mục tiêu của Người dùng]\nLuận điểm: "${input.targetArgument.claim}"\n`
    : '';

  let complexityGuidance = '';
  if (analysis.tier === 'VERY_SHORT') {
    complexityGuidance = `- Luận điểm ngắn (${analysis.wordCount} từ): Hãy đưa ra phản biện sắc sảo, tập trung vào 1 ý phản biện trọng tâm ${analysis.targetWordRange}.`;
  } else if (analysis.tier === 'MEDIUM') {
    complexityGuidance = `- Luận điểm trung bình (${analysis.wordCount} từ): Hãy đưa ra phản biện 1–2 đoạn ${analysis.targetWordRange}, chỉ ra điểm bất hợp lý trong lý lẽ của đối phương và đưa ra góc nhìn đối lập.`;
  } else {
    const identifiedList = analysis.components.length > 0
      ? `(Bao gồm: ${analysis.components.join(', ')})`
      : '';
    complexityGuidance = `- Luận điểm dài và có cấu trúc phức tạp (${analysis.wordCount} từ) ${identifiedList}:
  → Hãy tạo phản biện đa tầng có độ sâu tương xứng (${analysis.targetWordRange}).
  → Lần lượt: (1) Thách thức tính tuyệt đối hóa của Claim; (2) Phản bác Reasoning và vạch trần Giả định ngầm; (3) Chất vấn tính xác thực/bối cảnh của Evidence nếu có; (4) Chỉ ra hệ quả tiêu cực ngoài ý muốn hoặc giải pháp thay thế; (5) Kết thúc bằng đúng 1 câu hỏi Socratic sắc bén.
  → TUYỆT ĐỐI KHÔNG chỉ trả lời 1 câu ngắn gọn.`;
  }

  return `[Lịch sử tranh biện]
Chủ đề: "${input.topic}"
Bạn bảo vệ phe: ${opponentSide}

${historyText}
${targetArgHint}
[Luận điểm mới nhất của Người dùng — Lượt ${input.turnNumber}] (${analysis.wordCount} từ)
"${input.content.trim()}"

[Chỉ dẫn phản biện tương xứng]:
Đưa ra phản biện trực tiếp cho luận điểm trên.
${complexityGuidance}
- Giữ vững phe ${opponentSide}.
- Văn phong tự nhiên, không dùng tiêu đề thô cứng, không mở đầu bằng tiền tố thừa, kết thúc bằng đúng 1 câu hỏi Socratic.`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function buildOpponentPrompt(input: OpponentPromptInput): OpponentPromptOutput {
  const opponentSide = getOpponentSide(input.userSide);

  return {
    systemPrompt: buildSystemPrompt(input.topic, opponentSide),
    userPrompt: buildTurnPrompt(input, opponentSide),
  };
}
