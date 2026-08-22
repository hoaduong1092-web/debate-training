/**
 * Motion Analysis Prompt Builder — Assistant Domain
 *
 * Generates system + user prompt for AI to produce a multi-perspective
 * motion analysis report in strict JSON format.
 *
 * Output JSON schema (Task §1.B):
 * {
 *   motion_title: string,
 *   core_conflict: string,
 *   stakeholders: string[],
 *   affirmative_cases: Array<{ claim, key_argument, burden_of_proof }>,
 *   negative_cases: Array<{ claim, key_argument, burden_of_proof }>,
 *   rebuttal_vectors: string[]
 * }
 *
 * Spec: 02_DOMAIN_SPEC.md §7.3, 04_API_SPEC.md §5
 */

export interface MotionAnalysisPromptInput {
  topic: string;
  context?: string;
  language?: string;
}

export interface MotionAnalysisPromptResult {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Builds the system prompt for motion analysis.
 * Instructs the model to output ONLY valid JSON conforming to the schema.
 */
function buildSystemPrompt(language: string): string {
  const contentLang = language === 'vi'
    ? 'Vietnamese (tiếng Việt)'
    : language === 'en'
    ? 'English'
    : 'the same language as the topic';

  return `You are an expert debate analyst. Your task: generate a multi-perspective motion analysis JSON.

CRITICAL OUTPUT RULES — READ CAREFULLY:
1. OUTPUT ONLY VALID JSON. Your response MUST start with { and end with }. NO text before or after.
2. NO markdown code fences (no \`\`\`json). NO preamble. NO explanation outside the JSON.
3. JSON KEY NAMES MUST ALWAYS BE IN ENGLISH (exactly as shown below). NEVER translate key names.
4. JSON VALUES (the content) should be in ${contentLang}.

EXACT SCHEMA — use these EXACT key names, no exceptions:
{
  "motion_title": "the formal motion/topic statement",
  "core_conflict": "fundamental values or interests in tension between the two sides",
  "stakeholders": ["each affected party or group"],
  "affirmative_cases": [
    {
      "claim": "the affirmative position",
      "key_argument": "strongest supporting argument for this position",
      "burden_of_proof": "what the affirmative side must prove"
    }
  ],
  "negative_cases": [
    {
      "claim": "the negative position",
      "key_argument": "strongest supporting argument for this position",
      "burden_of_proof": "what the negative side must prove"
    }
  ],
  "rebuttal_vectors": ["critical clash point or question between the two sides"]
}

Provide 2-3 "affirmative_cases", 2-3 "negative_cases", 3-5 "stakeholders", 3-4 "rebuttal_vectors".
Analysis must be balanced — do NOT favor one side.
YOUR ENTIRE RESPONSE MUST BE A SINGLE VALID JSON OBJECT.`;
}

/**
 * Builds the user prompt with topic and optional context.
 */
function buildUserPrompt(input: MotionAnalysisPromptInput): string {
  let prompt = `Chủ đề kiến nghị / Motion: ${input.topic}`;

  if (input.context && input.context.trim()) {
    prompt += `\nBối cảnh / Context: ${input.context.trim()}`;
  }

  prompt += '\n\nGenerate a comprehensive multi-perspective motion analysis JSON as specified.';
  return prompt;
}

export function buildMotionAnalysisPrompt(input: MotionAnalysisPromptInput): MotionAnalysisPromptResult {
  return {
    systemPrompt: buildSystemPrompt(input.language ?? ''),
    userPrompt: buildUserPrompt(input),
  };
}
