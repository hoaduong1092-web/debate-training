/**
 * AI Opponent — Post-Generation Safety Filter
 *
 * Lightweight content validator for AI Opponent responses.
 * Implements the Dual Safety model: Tầng 2 (post-generation).
 *
 * Decision D-06 (APPROVED): Prompt guardrails + post-generation safety filter.
 * Critical for target age group 11–15.
 *
 * Spec Reference: 17_AI_OPPONENT_SPEC.md §10
 * Spec Reference: 10_SECURITY_SPEC.md §2.1 (Child-First Privacy)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ViolationType =
  | 'PROFANITY'
  | 'PERSONAL_ATTACK'
  | 'EMPTY_RESPONSE'
  | null;

export interface SafetyResult {
  safe: boolean;
  filtered_text: string;
  violation_type: ViolationType;
}

export interface SafetyLogEntry {
  event: 'OPPONENT_SAFETY_VIOLATION';
  session_id: string;
  turn_number: number;
  violation_type: ViolationType;
  original_length: number;
  timestamp: string;
}

// ─── Fallback Message ────────────────────────────────────────────────────────

/**
 * Safe fallback message when the opponent response is filtered.
 * Spec: 17_AI_OPPONENT_SPEC.md §10.3
 */
export const OPPONENT_FALLBACK_MESSAGE =
  'Tôi cần thêm thời gian để chuẩn bị phản biện cho luận điểm này. Hãy tiếp tục chia sẻ quan điểm của bạn nhé!';

// ─── Profanity Word List (Vietnamese) ────────────────────────────────────────

/**
 * Basic Vietnamese profanity list for child-safety filtering.
 * Uses Unicode property escapes (?<!\p{L}) and (?!\p{L}) to correctly handle
 * Vietnamese diacritics and avoid false positives on words like "nguồn", "nguội", etc.
 */
const PROFANITY_PATTERNS: RegExp[] = [
  /(?<!\p{L})(đụ|địt|đĩ|đéo|đồ\s*chó|con\s*chó|thằng\s*chó|con\s*đĩ)(?!\p{L})/ui,
  /(?<!\p{L})(mẹ\s*mày|má\s*mày|bố\s*mày|cha\s*mày)(?!\p{L})/ui,
  /(?<!\p{L})(ngu|đần|khùng|điên|đồ\s*ngu|thằng\s*ngu|con\s*ngu|ngu\s*ngốc|ngu\s*dốt)(?!\p{L})/ui,
  /(?<!\p{L})(chết\s*đi|biến\s*đi|cút\s*đi|câm\s*mồm|im\s*mồm)(?!\p{L})/ui,
  /(?<!\p{L})(vô\s*học|rác\s*rưởi|đồ\s*rác)(?!\p{L})/ui,
];

// ─── Personal Attack Patterns ────────────────────────────────────────────────

/**
 * Detect direct personal attacks targeting the user (not argument attacks).
 * Argument criticism ("lập luận của bạn yếu") is allowed.
 * Personal attacks ("bạn thật là ngu", "trình độ của bạn quá kém") are not.
 */
const PERSONAL_ATTACK_PATTERNS: RegExp[] = [
  /(?<!\p{L})bạn\s+(?:là|thật\s*sự|thật|quá)\s*(?:ngu|dốt|kém\s*cỏi|vô\s*học)(?!\p{L})/ui,
  /(?<!\p{L})bạn\s+không\s+(?:biết\s*gì|hiểu\s*biết\s*gì|xứng\s*đáng)(?!\p{L})/ui,
  /(?<!\p{L})người\s+như\s+bạn(?!\p{L})/ui,
  /(?<!\p{L})trình\s+độ\s+(?:của\s+)?bạn\s+(?:quá\s+)?(?:kém|thấp|tệ|non)(?!\p{L})/ui,
];

// ─── Filter Functions ────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERNS.some((pattern) => pattern.test(text));
}

function containsPersonalAttack(text: string): boolean {
  return PERSONAL_ATTACK_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Truncate response to max 500 words.
 * Spec: 17_AI_OPPONENT_SPEC.md §10.2, rule 1.
 * This is NOT a safety violation — just a length trim.
 */
function truncateToMaxWords(text: string, maxWords: number = 500): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '...';
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Validate an AI Opponent response for safety.
 *
 * Checks (in order per Spec 17 §10.2):
 * 1. Length — truncate if > 500 words (not a violation)
 * 2. Empty — response < 5 words → unsafe
 * 3. Profanity — Vietnamese profanity patterns → unsafe
 * 4. Personal attack — direct user attacks → unsafe
 *
 * Returns SafetyResult with the filtered text or fallback message.
 */
export function validateOpponentResponse(text: string): SafetyResult {
  // 1. Truncate overly long responses (not a violation).
  const trimmed = truncateToMaxWords(text);

  // 2. Empty check.
  if (!trimmed || countWords(trimmed) < 5) {
    return {
      safe: false,
      filtered_text: OPPONENT_FALLBACK_MESSAGE,
      violation_type: 'EMPTY_RESPONSE',
    };
  }

  // 3. Profanity check.
  if (containsProfanity(trimmed)) {
    return {
      safe: false,
      filtered_text: OPPONENT_FALLBACK_MESSAGE,
      violation_type: 'PROFANITY',
    };
  }

  // 4. Personal attack check.
  if (containsPersonalAttack(trimmed)) {
    return {
      safe: false,
      filtered_text: OPPONENT_FALLBACK_MESSAGE,
      violation_type: 'PERSONAL_ATTACK',
    };
  }

  // All checks passed.
  return {
    safe: true,
    filtered_text: trimmed,
    violation_type: null,
  };
}

/**
 * Log a safety violation for monitoring and audit.
 * Spec: 17_AI_OPPONENT_SPEC.md §10.4
 */
export function logSafetyViolation(
  sessionId: string,
  turnNumber: number,
  violationType: ViolationType,
  originalLength: number,
): void {
  const entry: SafetyLogEntry = {
    event: 'OPPONENT_SAFETY_VIOLATION',
    session_id: sessionId,
    turn_number: turnNumber,
    violation_type: violationType,
    original_length: originalLength,
    timestamp: new Date().toISOString(),
  };
  console.warn('[SAFETY]', JSON.stringify(entry));
}
