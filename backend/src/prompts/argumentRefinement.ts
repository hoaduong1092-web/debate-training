/**
 * Argument Refinement Prompt Builder — Assistant Domain
 *
 * Generates system + user prompts for AI to refine a raw user idea/argument
 * into a well-structured C-R-E (Claim - Reasoning - Evidence Suggestion) format.
 *
 * Hard constraints (AI_ARGUMENT_REFINEMENT_SPEC.md §15–§17):
 *   1. Preserve user's stance — NEVER reverse or drift.
 *   2. Preserve semantic core — improve structure/grammar, NEVER replace meaning.
 *   3. NEVER fabricate statistics, percentages, URLs, citations, or institutions.
 *   4. Evidence Suggestion = search direction only (methodological framing).
 *   5. Output ONLY valid JSON — no markdown fences, no preamble.
 *
 * Output JSON schema:
 * {
 *   "claim": "string (1-2 sentences)",
 *   "reasoning": "string (2-3 sentences)",
 *   "evidenceSuggestion": "string (1-2 sentences)",
 *   "refinementNote": "string (1-2 sentences)"
 * }
 *
 * Spec: docs/AI_ARGUMENT_REFINEMENT_SPEC.md §14, §17
 */

export interface ArgumentRefinementPromptInput {
  rawText: string;
  stance: 'AFFIRMATIVE' | 'NEGATIVE';
  topic?: string;
  existingClaim?: string;
  existingReasoning?: string;
  existingEvidenceSuggestion?: string;
  language?: string;
}

export interface ArgumentRefinementPromptResult {
  systemPrompt: string;
  userPrompt: string;
}

const STANCE_LABEL: Record<'AFFIRMATIVE' | 'NEGATIVE', string> = {
  AFFIRMATIVE: 'ỦNG HỘ (AFFIRMATIVE)',
  NEGATIVE: 'PHẢN ĐỐI (NEGATIVE)',
};

/**
 * Builds the system prompt for argument refinement.
 * Instructs the model to output ONLY valid JSON conforming to the C-R-E schema.
 */
function buildSystemPrompt(language: string): string {
  const contentLang = language === 'vi'
    ? 'Vietnamese (tiếng Việt)'
    : language === 'en'
    ? 'English'
    : 'the same language as the topic';

  return `You are a world-class debate coaching assistant specializing in argument refinement.

YOUR SOLE TASK: Take a user's raw idea or draft argument and refine it into a well-structured C-R-E (Claim - Reasoning - Evidence Suggestion) argument.

═══════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════

SEMANTIC PRESERVATION (HIGHEST PRIORITY):
- You MUST preserve the user's original MEANING, INTENT, and STANCE.
- You MUST NOT reverse, weaken, or drift the user's position.
- If the user supports something, your output MUST support it. If they oppose, your output MUST oppose it.
- You may improve grammar, clarity, logical structure, and argumentative precision.
- You MUST NOT replace the user's argument with a completely different argument, even if yours is "better".
- You MUST NOT remove key points the user explicitly wants to emphasize.
- You MUST NOT add ethically or politically controversial premises beyond the user's original scope.

EVIDENCE SAFETY (CRITICAL):
- The "evidenceSuggestion" field is a SEARCH DIRECTION — a guide for what kind of evidence to look for.
- You MUST use framing like: "Tìm các nghiên cứu về...", "Đối chiếu dữ liệu từ...", "Tham khảo báo cáo của..."
- You MUST NEVER invent specific statistics (e.g., "87.5% of students...").
- You MUST NEVER invent specific study names, researcher names, or institution names that you cannot verify.
- You MUST NEVER fabricate URLs, DOIs, or citations.
- You MUST NEVER fabricate organization names that do not exist.
- If you cannot suggest evidence directions, return a general methodological suggestion or an empty string.

OUTPUT FORMAT (STRICT):
- Your ENTIRE response MUST be a single valid JSON object. Nothing else.
- NO markdown code fences. NO \`\`\`json. NO preamble. NO explanation outside JSON.
- Start with { and end with }.
- JSON key names MUST be in English (exactly as shown below).
- JSON values (content) MUST be in ${contentLang}.

EXACT JSON SCHEMA:
{
  "claim": "A clear, direct, debatable assertion in 1-2 concise sentences (15-30 words). Must reflect the user's core message.",
  "reasoning": "A logical cause-and-effect explanation in 2-3 sentences (35-70 words). Explains WHY the claim matters and HOW the logic flows.",
  "evidenceSuggestion": "A methodological search direction in 1-2 sentences. Suggests WHAT TYPE of evidence to find, not actual evidence.",
  "refinementNote": "1-2 concise sentences explaining what was improved (structure, clarity, logic) compared to the original input."
}

QUALITY GUIDELINES:
- "claim" should be sharp, assertive, and directly tied to the debate motion and stance.
- "reasoning" should show clear causal chain: A leads to B, and B matters because of C.
- "evidenceSuggestion" should point to credible, verifiable evidence categories (academic reports, government data, international organizations).
- "refinementNote" should honestly describe what you changed and why, without being verbose.`;
}

/**
 * Builds the user prompt with raw text, stance, topic, and optional existing C-R-E context.
 */
function buildUserPrompt(input: ArgumentRefinementPromptInput): string {
  const stanceLabel = STANCE_LABEL[input.stance];
  const parts: string[] = [];

  if (input.topic && input.topic.trim()) {
    parts.push(`Kiến nghị / Motion: ${input.topic.trim()}`);
  }

  parts.push(`Phe / Stance: ${stanceLabel}`);
  parts.push(`Ý tưởng thô / Raw idea: ${input.rawText.trim()}`);

  if (input.existingClaim && input.existingClaim.trim()) {
    parts.push(`Claim hiện tại / Existing Claim: ${input.existingClaim.trim()}`);
  }
  if (input.existingReasoning && input.existingReasoning.trim()) {
    parts.push(`Reasoning hiện tại / Existing Reasoning: ${input.existingReasoning.trim()}`);
  }
  if (input.existingEvidenceSuggestion && input.existingEvidenceSuggestion.trim()) {
    parts.push(`Evidence Suggestion hiện tại / Existing Evidence: ${input.existingEvidenceSuggestion.trim()}`);
  }

  parts.push('\nRefine this into a structured C-R-E argument JSON as specified. Preserve the user\'s stance and core meaning.');

  return parts.join('\n');
}

export function buildArgumentRefinementPrompt(input: ArgumentRefinementPromptInput): ArgumentRefinementPromptResult {
  return {
    systemPrompt: buildSystemPrompt(input.language ?? ''),
    userPrompt: buildUserPrompt(input),
  };
}
