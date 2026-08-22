/**
 * Assistant Domain Controller
 *
 * Handles:
 *   POST /api/v1/speeches/draft  — Speech Draft / Sketch generation
 *   POST /api/v1/reports/analyze — Motion Analysis Report generation
 *
 * Quota governance (Spec 16 §7 + Task §2.3):
 *   Post-validation consume model:
 *     checkAvailable → executeWithMetering → schema validate → atomic consume
 *   Credit is ONLY permanently consumed when artifact generation succeeds
 *   AND response passes JSON schema validation.
 *
 * Spec: 02_DOMAIN_SPEC.md §7, 04_API_SPEC.md §5, 16_PLAN_QUOTA_BUSINESS_SPEC.md §7, §20, §25
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { checkQuotaAvailable, consumeQuota } from '../services/quotaManager';
import { executeWithMetering } from '../services/aiGateway';
import {
  createOpenAIChatCompletion,
  getOpenAIModel,
  getLogicCoachModel,
} from '../services/openAICompatibleClient';
import { buildSpeechDraftPrompt } from '../prompts/speechDraft';
import { buildMotionAnalysisPrompt } from '../prompts/motionAnalysis';
import { parseSpeechDraft, parseMotionAnalysis } from '../services/assistantParser';

// ─── Model Selection ─────────────────────────────────────────────────────────

/**
 * Model for Assistant generation.
 * Reads MODEL_ASSISTANT → MODEL_LOGIC_COACH fallback → default model.
 */
function getAssistantModel(): string {
  return process.env.MODEL_ASSISTANT || getLogicCoachModel() || getOpenAIModel();
}

// ─── Quota Error Helper ──────────────────────────────────────────────────────

/**
 * Maps QuotaManager error codes to HTTP 403 JSON responses.
 */
function sendQuotaError(res: Response, code: string | undefined, message: string | undefined): Response {
  const errorCode = code ?? 'QUOTA_EXCEEDED';
  return res.status(403).json({
    success: false,
    error: errorCode,
    code: errorCode,
    message: message ?? 'Assistant quota exceeded or subscription invalid.',
    dimension: 'assistant',
  });
}

// ─── POST /api/v1/speeches/draft ─────────────────────────────────────────────

/**
 * Creates a structured Speech Draft artifact.
 *
 * Flow (post-validate quota model):
 *  1. Resolve userId from authenticated middleware — NEVER from req.body
 *  2. Validate inputs
 *  3. checkQuotaAvailable(userId, 'ASSISTANT_DRAFT', 1) → 403 if not ALLOW (0 AI calls)
 *  4. Build prompt
 *  5. executeWithMetering('Speech_Draft_Generation') → AI generation
 *  6. parseSpeechDraft() — JSON schema validation → 422 on null (zero deduction)
 *  7. consumeQuota(userId, 'ASSISTANT_DRAFT', 1) — atomic conditional decrement
 *  8. Return HTTP 200 with canonical artifact
 */
export async function createSpeechDraft(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Authenticated identity — strictly from middleware, NOT req.body.
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Authentication required.' });
      return;
    }

    // 2. Input validation.
    const { topic, stance, rawIdeas, language } = req.body as {
      topic?: unknown;
      stance?: unknown;
      rawIdeas?: unknown;
      language?: unknown;
    };

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Field "topic" is required and must be a non-empty string.' });
      return;
    }
    if (!stance || (stance !== 'AFFIRMATIVE' && stance !== 'NEGATIVE')) {
      res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Field "stance" is required and must be "AFFIRMATIVE" or "NEGATIVE".' });
      return;
    }

    const safeRawIdeas = typeof rawIdeas === 'string' ? rawIdeas : undefined;
    const safeLanguage = typeof language === 'string' ? language : undefined;

    // 3. Non-consuming quota check — 403 before any AI call.
    const quotaCheck = await checkQuotaAvailable(userId, 'ASSISTANT_DRAFT', 1);
    if (quotaCheck.decision !== 'ALLOW') {
      sendQuotaError(res, quotaCheck.error?.code ?? quotaCheck.decision ?? undefined, quotaCheck.error?.message);
      return;
    }

    // 4. Build prompt.
    const { systemPrompt, userPrompt } = buildSpeechDraftPrompt({
      topic: topic.trim(),
      stance,
      rawIdeas: safeRawIdeas,
      language: safeLanguage,
    });

    // 5. AI generation with telemetry metering wrapper.
    let aiContent: string;
    try {
      const model = getAssistantModel();
      const aiResult = await executeWithMetering({
        userId,
        sessionId: 'ASSISTANT_DOMAIN',
        serviceType: 'LLM_ASSISTANT',
        modelName: model,
        taskName: 'Speech_Draft_Generation',
        apiCallFunction: async () => {
          return await createOpenAIChatCompletion({
            model,
            systemPrompt,
            userPrompt,
            temperature: 0.5, // Lower for more deterministic JSON structure
            max_tokens: 3000,
          });
        },
      });
      aiContent = aiResult.content;
    } catch (aiError: unknown) {
      const message = aiError instanceof Error ? aiError.message : String(aiError);
      console.error('[ASSISTANT] Speech Draft AI provider error:', message);
      // AI failure → zero quota deduction (post-validate semantics).
      res.status(502).json({
        success: false,
        error: 'AI_SERVICE_UNAVAILABLE',
        message: 'Hệ thống AI đang gặp sự cố tạm thời. Vui lòng thử lại sau.',
      });
      return;
    }

    // 6. Schema validation — null return triggers zero-deduction path.
    const artifact = parseSpeechDraft(aiContent);
    if (!artifact) {
      console.warn('[ASSISTANT_RAW_FAILED] Speech Draft parser returned null. Raw output preview:',
        aiContent?.slice(0, 500));
      res.status(422).json({
        success: false,
        error: 'GENERATION_FAILED',
        message: 'AI trả về kết quả không hợp lệ. Vui lòng thử lại.',
      });
      return;
    }

    // 7. Atomic quota consumption — ONLY after successful artifact generation & validation.
    const consumed = await consumeQuota(userId, 'ASSISTANT_DRAFT', 1);
    if (consumed.decision !== 'ALLOW') {
      console.warn('[ASSISTANT] Speech Draft quota consume failed after validation (race condition). userId:', userId);
      sendQuotaError(res, consumed.error?.code ?? consumed.decision ?? undefined, consumed.error?.message);
      return;
    }

    // 8. Success response.
    res.status(200).json({
      success: true,
      data: artifact,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[ASSISTANT] createSpeechDraft unexpected error:', message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message });
  }
}

// ─── POST /api/v1/reports/analyze ────────────────────────────────────────────

/**
 * Creates a structured Motion Analysis Report artifact.
 *
 * Same post-validate quota flow as createSpeechDraft.
 */
export async function createMotionAnalysis(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Authenticated identity — strictly from middleware, NOT req.body.
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Authentication required.' });
      return;
    }

    // 2. Input validation.
    const { topic, context, language } = req.body as {
      topic?: unknown;
      context?: unknown;
      language?: unknown;
    };

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Field "topic" is required and must be a non-empty string.' });
      return;
    }

    const safeContext = typeof context === 'string' ? context : undefined;
    const safeLanguage = typeof language === 'string' ? language : undefined;

    // 3. Non-consuming quota check — 403 before any AI call.
    const quotaCheck = await checkQuotaAvailable(userId, 'ASSISTANT_DRAFT', 1);
    if (quotaCheck.decision !== 'ALLOW') {
      sendQuotaError(res, quotaCheck.error?.code ?? quotaCheck.decision ?? undefined, quotaCheck.error?.message);
      return;
    }

    // 4. Build prompt.
    const { systemPrompt, userPrompt } = buildMotionAnalysisPrompt({
      topic: topic.trim(),
      context: safeContext,
      language: safeLanguage,
    });

    // 5. AI generation with telemetry metering wrapper.
    let aiContent: string;
    try {
      const model = getAssistantModel();
      const aiResult = await executeWithMetering({
        userId,
        sessionId: 'ASSISTANT_DOMAIN',
        serviceType: 'LLM_ASSISTANT',
        modelName: model,
        taskName: 'Motion_Analysis_Report',
        apiCallFunction: async () => {
          return await createOpenAIChatCompletion({
            model,
            systemPrompt,
            userPrompt,
            temperature: 0.5, // Lower for more deterministic JSON structure
            max_tokens: 3000,
          });
        },
      });
      aiContent = aiResult.content;
    } catch (aiError: unknown) {
      const message = aiError instanceof Error ? aiError.message : String(aiError);
      console.error('[ASSISTANT] Motion Analysis AI provider error:', message);
      res.status(502).json({
        success: false,
        error: 'AI_SERVICE_UNAVAILABLE',
        message: 'Hệ thống AI đang gặp sự cố tạm thời. Vui lòng thử lại sau.',
      });
      return;
    }

    // 6. Schema validation.
    const artifact = parseMotionAnalysis(aiContent);
    if (!artifact) {
      console.warn('[ASSISTANT_RAW_FAILED] Motion Analysis parser returned null. Raw output preview:',
        aiContent?.slice(0, 500));
      res.status(422).json({
        success: false,
        error: 'GENERATION_FAILED',
        message: 'AI trả về kết quả không hợp lệ. Vui lòng thử lại.',
      });
      return;
    }

    // 7. Atomic quota consumption — ONLY after successful artifact.
    const consumed = await consumeQuota(userId, 'ASSISTANT_DRAFT', 1);
    if (consumed.decision !== 'ALLOW') {
      console.warn('[ASSISTANT] Motion Analysis quota consume failed after validation (race condition). userId:', userId);
      sendQuotaError(res, consumed.error?.code ?? consumed.decision ?? undefined, consumed.error?.message);
      return;
    }

    // 8. Success response.
    res.status(200).json({
      success: true,
      data: artifact,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[ASSISTANT] createMotionAnalysis unexpected error:', message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message });
  }
}

/** Aliases conforming to Step 3.2 specification */
export const handleCreateSpeechDraft = createSpeechDraft;
export const handleAnalyzeMotion = createMotionAnalysis;

