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

/**
 * Max tokens for opponent response.
 * For Gemini Thinking models (e.g. 2.0/2.5/3.6), internal <thought> reasoning consumes 500-1500 tokens.
 * Setting max_tokens = 4000 guarantees sufficient headroom for both thought generation and a rich 250-380 word rebuttal.
 */
const OPPONENT_MAX_TOKENS = 4000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences and extraneous model prefixes from opponent output.
 * Handles:
 *   - Complete fences: ```\n...\n```
 *   - Language-tagged fences: ```vietnamese\n...\n```
 *   - Partial fences at start/end
 *   - Prefixes like "Draft:*", "Draft:", "Phản biện:", "Đối thủ AI:"
 *   - Null / empty input (returns empty string)
 */
export function stripOpponentFences(raw: string | null | undefined): string {
  if (raw == null) return '';
  let text = raw.trim();
  if (!text) return '';

  // 1. Try complete fence match first (most reliable).
  const fenceMatch = text.match(/^```(?:\w+)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // Partial fence stripping at start and end.
    text = text
      .replace(/^```(?:\w+)?\s*\r?\n?/, '')
      .replace(/\r?\n?```\s*$/, '')
      .trim();
  }

  // 2. Strip only leading role headers on the FIRST line if present (e.g. "Draft:", "Phản biện (Phe Phản đối):", "AI Opponent:")
  text = text
    .replace(/^(?:Draft\s*:?\*?|Phản\s*biện\s*(?:\([^\)\n]+\))?\s*:|AI\s*(?:Opponent)?\s*:|Đối\s*thủ\s*(?:AI)?\s*:|###\s*[^\n]+\n+)\s*/i, '')
    .trim();

  return text;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate an AI Opponent counterargument via Beeknoee/Gemini gateway.
 *
 * Flow:
 * 1. Build structured prompts (system + turn) with labelled dialogue history and proportional guidance.
 * 2. Call LLM — PLAIN TEXT mode, NO response_format: json_object.
 * 3. Strip markdown fences and prefixes from output.
 * 4. Log raw result for diagnostics BEFORE safety filter.
 * 5. Run post-generation safety filter (Spec 17 §10).
 * 6. Return safe text with telemetry.
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
  const opponentModel = getOpponentModel();

  // 1. Build structured prompts.
  const { systemPrompt, userPrompt } = buildOpponentPrompt({
    topic: input.topic,
    userSide: input.userSide,
    content: input.content,
    history: input.history,
    turnNumber: input.turnNumber,
    targetArgument: input.targetArgument,
  });

  // Helper for invoking LLM via metering wrapper
  const executeCall = async (taskName: string, extraInstruction?: string) => {
    return await executeWithMetering({
      userId: input.userId,
      sessionId: input.sessionId,
      turnNumber: input.turnNumber,
      serviceType: 'LLM_OPPONENT',
      modelName: opponentModel,
      taskName,
      apiCallFunction: async () => {
        const completion = await createOpenAIChatCompletion({
          model: opponentModel,
          systemPrompt: extraInstruction ? `${systemPrompt}\n\n${extraInstruction}` : systemPrompt,
          userPrompt,
          temperature: 0.7,
          max_tokens: OPPONENT_MAX_TOKENS,
        });

        return {
          content: completion.content,
          finish_reason: completion.finish_reason || 'stop',
          usage: {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
          },
          _gateway: completion._gateway,
        };
      },
    });
  };

  // 2. Call LLM (Attempt 1)
  let aiResult = await executeCall('Opponent_Rebuttal');
  let rawText = stripOpponentFences(
    typeof aiResult.content === 'string'
      ? aiResult.content
      : aiResult.content != null
      ? String(aiResult.content)
      : '',
  );

  console.info('[OPPONENT_RAW]', {
    sessionId: input.sessionId,
    turn: input.turnNumber,
    model: opponentModel,
    finish_reason: aiResult.finish_reason,
    in_tokens: (aiResult as any).usage?.prompt_tokens ?? 0,
    out_tokens: (aiResult as any).usage?.completion_tokens ?? 0,
    raw_length: rawText.length,
    raw_preview: rawText.slice(0, 120),
  });

  let safetyResult = validateOpponentResponse(rawText, aiResult.finish_reason);

  // 3. Controlled Single Retry if response was truncated or empty
  if (
    !safetyResult.safe &&
    (safetyResult.violation_type === 'TRUNCATED_RESPONSE' ||
      safetyResult.violation_type === 'INCOMPLETE_SENTENCE' ||
      safetyResult.violation_type === 'EMPTY_RESPONSE')
  ) {
    console.warn('[OPPONENT_RETRY_TRIGGERED]', {
      sessionId: input.sessionId,
      turn: input.turnNumber,
      reason: safetyResult.violation_type,
      finish_reason: aiResult.finish_reason,
    });

    try {
      const retryResult = await executeCall(
        'Opponent_Rebuttal_Retry',
        'YÊU CẦU BẮT BUỘC: Hãy trình bày phản biện cô đọng, súc tích và HOÀN TẤT TRỌN VẸN toàn bộ câu, tuyệt đối không để câu bị ngắt quãng giữa chừng.',
      );
      const retryRawText = stripOpponentFences(
        typeof retryResult.content === 'string'
          ? retryResult.content
          : retryResult.content != null
          ? String(retryResult.content)
          : '',
      );

      const retrySafety = validateOpponentResponse(retryRawText, retryResult.finish_reason);
      if (retrySafety.safe) {
        console.info('[OPPONENT_RETRY_SUCCESS]', {
          sessionId: input.sessionId,
          turn: input.turnNumber,
          finish_reason: retryResult.finish_reason,
          raw_length: retryRawText.length,
        });
        aiResult = retryResult;
        rawText = retryRawText;
        safetyResult = retrySafety;
      } else {
        console.error('[OPPONENT_RETRY_FAILED]', {
          sessionId: input.sessionId,
          turn: input.turnNumber,
          violation_type: retrySafety.violation_type,
          finish_reason: retryResult.finish_reason,
        });
        // Explicit failure: do NOT return partial text as success
        const err = new Error(`OPPONENT_TRUNCATED: AI response truncated by provider (${retrySafety.violation_type}) after retry.`);
        (err as any).code = 'OPPONENT_TRUNCATED';
        throw err;
      }
    } catch (retryErr: any) {
      if (retryErr?.code === 'OPPONENT_TRUNCATED') throw retryErr;
      console.error('[OPPONENT_RETRY_ERROR]', retryErr?.message || retryErr);
      const err = new Error(`OPPONENT_TRUNCATED: AI Opponent call failed during completion retry.`);
      (err as any).code = 'OPPONENT_TRUNCATED';
      throw err;
    }
  }

  // 4. Handle remaining safety violations (Profanity / Personal Attack)
  if (!safetyResult.safe) {
    logSafetyViolation(
      input.sessionId,
      input.turnNumber,
      safetyResult.violation_type,
      rawText.length,
    );
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
