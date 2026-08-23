/**
 * AI Opponent — Service Layer
 *
 * Executes the AI Opponent LLM call via Beeknoee Gateway using MODEL_OPPONENT.
 * Returns plain text counterargument (not JSON).
 *
 * Provider: Beeknoee (BEEKNOEE_API_KEY / BEEKNOEE_BASE_URL)
 * Model:    MODEL_OPPONENT env var → fallback "claude-sonnet-4-6" (Free Quota)
 *
 * Spec Reference: 17_AI_OPPONENT_SPEC.md §2, §3, §4, §9
 */

import { executeWithMetering } from './aiGateway';
import {
  createOpenAIChatCompletion,
  getOpponentModel,
} from './openAICompatibleClient';
import {
  buildOpponentPrompt,
  type DebateStance,
  type HistoryEntry,
} from '../prompts/opponent';
import {
  validateOpponentResponse,
  logSafetyViolation,
} from './opponentSafety';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpponentInput {
  userId: string;
  sessionId: string;
  topic: string;
  userSide: DebateStance;
  content: string;
  history: HistoryEntry[];
  turnNumber: number;
  characterId: string | null;
  targetArgument?: {
    argumentId?: string;
    order?: number;
    claim: string;
    reasoning?: string;
    evidenceSuggestion?: string;
  };
}

export interface OpponentResult {
  text: string;
  character_id: string | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  execution_ms: number;
  safety_filtered: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OPPONENT_MODEL = getOpponentModel();

/**
 * Max tokens for opponent response.
 * Vietnamese 100-200 word rebuttal ≈ 200-350 tokens.
 * 600 gives safe headroom while reducing inference latency vs 1000.
 */
const OPPONENT_MAX_TOKENS = 800;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences from opponent plain-text output.
 * Handles:
 *   - Complete fences: ```\n...\n```
 *   - Language-tagged fences: ```vietnamese\n...\n```
 *   - Partial fences at start/end
 *   - Null / empty input (returns empty string)
 */
function stripOpponentFences(raw: string | null | undefined): string {
  if (raw == null) return '';
  const text = raw.trim();
  if (!text) return '';

  // Try complete fence match first (most reliable).
  const fenceMatch = text.match(/^```(?:\w+)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Partial fence stripping at start and end.
  return text
    .replace(/^```(?:\w+)?\s*\r?\n?/, '')
    .replace(/\r?\n?```\s*$/, '')
    .trim();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an AI Opponent counterargument via Beeknoee gateway.
 *
 * Flow:
 * 1. Build structured prompts (system + turn) with labelled dialogue history.
 * 2. Call LLM — PLAIN TEXT mode, NO response_format: json_object.
 * 3. Strip markdown fences from output.
 * 4. Log raw result for diagnostics BEFORE safety filter.
 * 5. Run post-generation safety filter (Spec 17 §10).
 * 6. Return safe text with telemetry stamped as beeknoee-gateway.
 *
 * Fallback to OPPONENT_FALLBACK_MESSAGE ONLY when:
 *   - The LLM call throws a fatal network/timeout error (caller handles via Failure Matrix).
 *   - The response passes through the safety filter's EMPTY_RESPONSE check (< 5 words).
 *   The safety filter itself assigns the fallback string in those cases.
 *
 * NOTE: This function THROWS on LLM errors — the controller's Promise.allSettled
 * catches and applies the Failure Matrix.
 */
export async function generateOpponentResponse(
  input: OpponentInput,
): Promise<OpponentResult> {
  // 1. Build structured prompts.
  const { systemPrompt, userPrompt } = buildOpponentPrompt({
    topic: input.topic,
    userSide: input.userSide,
    content: input.content,
    history: input.history,
    turnNumber: input.turnNumber,
    targetArgument: input.targetArgument,
  });

  // 2. Call LLM with telemetry metering.
  //    IMPORTANT: NO response_format field → model returns free-form plain text.
  const aiResult = await executeWithMetering({
    userId: input.userId,
    sessionId: input.sessionId,
    turnNumber: input.turnNumber,
    serviceType: 'LLM_OPPONENT',
    modelName: OPPONENT_MODEL,
    taskName: 'Opponent_Rebuttal',
    apiCallFunction: async () => {
      const completion = await createOpenAIChatCompletion({
        model: OPPONENT_MODEL,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        max_tokens: OPPONENT_MAX_TOKENS,
        // Explicitly omit response_format — opponent is plain text, not JSON.
      });

      return {
        content: completion.content,
        usage: {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
        },
        _gateway: completion._gateway,
      };
    },
  });

  // 3. Normalise raw text from LLM result.
  const rawText = stripOpponentFences(
    typeof aiResult.content === 'string'
      ? aiResult.content
      : aiResult.content != null
      ? String(aiResult.content)
      : '',
  );

  // 4. Pre-safety diagnostic log — shows exactly what the model returned
  //    BEFORE any filtering so we can identify false fallback triggers.
  console.info('[OPPONENT_RAW]', {
    sessionId: input.sessionId,
    turn: input.turnNumber,
    model: OPPONENT_MODEL,
    in_tokens: (aiResult as any).usage?.prompt_tokens ?? 0,
    out_tokens: (aiResult as any).usage?.completion_tokens ?? 0,
    raw_length: rawText.length,
    raw_preview: rawText.slice(0, 120),
  });

  // 5. Post-generation safety filter (Spec 17 §10).
  const safetyResult = validateOpponentResponse(rawText);

  if (!safetyResult.safe) {
    logSafetyViolation(
      input.sessionId,
      input.turnNumber,
      safetyResult.violation_type,
      rawText.length,
    );
    // Log the specific violation type so we can tell if it's EMPTY_RESPONSE
    // (model returned too-short text) vs PROFANITY / PERSONAL_ATTACK.
    console.warn('[OPPONENT_SAFETY_FILTERED]', {
      sessionId: input.sessionId,
      turn: input.turnNumber,
      violation_type: safetyResult.violation_type,
      raw_word_count: rawText.trim().split(/\s+/).filter(Boolean).length,
    });
  }

  return {
    text: safetyResult.filtered_text,
    character_id: input.characterId,
    usage: {
      prompt_tokens: (aiResult as any).usage?.prompt_tokens ?? 0,
      completion_tokens: (aiResult as any).usage?.completion_tokens ?? 0,
    },
    execution_ms: aiResult.execution_ms,
    safety_filtered: !safetyResult.safe,
  };
}
