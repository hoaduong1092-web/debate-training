/**
 * Speech Draft Prompt Builder — Assistant Domain
 *
 * Generates a structured system + user prompt for AI to produce a
 * speech draft / outline in strict JSON format.
 *
 * Output JSON schema (Task §1.A):
 * {
 *   title: string,
 *   hook: string,
 *   arguments: Array<{ claim, reasoning, evidence_suggestion }>,
 *   counterarguments: Array<{ opposing_point, rebuttal_strategy }>,
 *   conclusion: string
 * }
 *
 * Spec: 02_DOMAIN_SPEC.md §7.2, 04_API_SPEC.md §5
 */

export interface SpeechDraftPromptInput {
  topic: string;
  stance: 'AFFIRMATIVE' | 'NEGATIVE';
  rawIdeas?: string;
  language?: string;
}

export interface SpeechDraftPromptResult {
  systemPrompt: string;
  userPrompt: string;
}

const STANCE_LABEL: Record<'AFFIRMATIVE' | 'NEGATIVE', string> = {
  AFFIRMATIVE: 'ỦNG HỘ (AFFIRMATIVE)',
  NEGATIVE: 'PHẢN ĐỐI (NEGATIVE)',
};

/**
 * Builds the system prompt for speech draft generation.
 * Instructs the model to output ONLY valid JSON conforming to the schema.
 */
function buildSystemPrompt(language: string): string {
  const contentLang = language === 'vi'
    ? 'Vietnamese (tiếng Việt)'
    : language === 'en'
    ? 'English'
    : 'the same language as the topic';

  return `You are an expert debate coach. Your task: generate a structured speech draft JSON.

CRITICAL OUTPUT RULES — READ CAREFULLY:
1. OUTPUT ONLY VALID JSON. Your response MUST start with { and end with }. NO text before or after.
2. NO markdown code fences (no \`\`\`json). NO preamble. NO explanation outside the JSON.
3. JSON KEY NAMES MUST ALWAYS BE IN ENGLISH (exactly as shown below). NEVER translate key names.
4. JSON VALUES (the content) should be in ${contentLang}.

LENGTH & BUDGET GUIDELINES:
- "arguments": Exactly 2-3 focused arguments. Keep each field concise, crisp, and impactful (1-2 sentences for claim, 2-3 sentences for reasoning, 1 sentence for evidence_suggestion).
- "counterarguments": Exactly 1-2 major counterarguments with focused rebuttal strategy (1-2 sentences each).
- "conclusion": 1-2 powerful, complete concluding sentences summarizing the entire message and call to action.
- IMPORTANT: Ensure the conclusion sentence is FULLY AND COMPLETELY written out before closing the JSON object. Never stop mid-sentence.

EXACT SCHEMA — use these EXACT key names, no exceptions:
{
  "title": "concise speech title",
  "hook": "compelling opening statement (1-2 sentences)",
  "arguments": [
    {
      "claim": "debatable assertion",
      "reasoning": "logical explanation supporting the claim",
      "evidence_suggestion": "recommended type of evidence or data source"
    }
  ],
  "counterarguments": [
    {
      "opposing_point": "expected argument from the opposing side",
      "rebuttal_strategy": "how to counter this argument effectively"
    }
  ],
  "conclusion": "strong, complete closing statement"
}

Provide 2-3 "arguments" and 1-2 "counterarguments".
YOUR ENTIRE RESPONSE MUST BE A SINGLE VALID JSON OBJECT.`;
}

/**
 * Builds the user prompt with topic, stance, and optional raw ideas.
 */
function buildUserPrompt(input: SpeechDraftPromptInput): string {
  const stanceLabel = STANCE_LABEL[input.stance];
  let prompt = `Kiến nghị / Motion: ${input.topic}\nPhe / Stance: ${stanceLabel}`;

  if (input.rawIdeas && input.rawIdeas.trim()) {
    prompt += `\nÝ tưởng thô / Raw ideas: ${input.rawIdeas.trim()}`;
  }

  prompt += '\n\nGenerate a structured speech draft JSON as specified.';
  return prompt;
}

export function buildSpeechDraftPrompt(input: SpeechDraftPromptInput): SpeechDraftPromptResult {
  return {
    systemPrompt: buildSystemPrompt(input.language ?? ''),
    userPrompt: buildUserPrompt(input),
  };
}
