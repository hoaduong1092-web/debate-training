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
  safeExtractJSON,
} from '../services/openAICompatibleClient';
import { buildSpeechDraftPrompt } from '../prompts/speechDraft';
import { buildMotionAnalysisPrompt } from '../prompts/motionAnalysis';
import { buildArgumentRefinementPrompt } from '../prompts/argumentRefinement';
import {
  parseSpeechDraft,
  parseMotionAnalysis,
  parseArgumentRefinement,
  RefinedArgumentResult,
} from '../services/assistantParser';

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

    // 6. Detect upstream billing / insufficient balance errors before parsing.
    //    Beeknoee gateway returns a human-readable error text (not JSON) when credits run out.
    if (
      aiContent &&
      (aiContent.includes('Số dư tài khoản API không đủ') ||
       aiContent.includes('insufficient') ||
       aiContent.includes('billing') ||
       aiContent.includes('Nạp thêm tại'))
    ) {
      console.warn('[ASSISTANT] AI provider billing error detected. Raw preview:', aiContent.slice(0, 300));
      res.status(502).json({
        success: false,
        error: 'AI_BILLING_ERROR',
        message: 'Hệ thống AI tạm thời không khả dụng do vấn đề cấu hình. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
      });
      return;
    }

    // 7. Schema validation — null return triggers zero-deduction path.
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

    // 6. Detect upstream billing / insufficient balance errors before parsing.
    if (
      aiContent &&
      (aiContent.includes('Số dư tài khoản API không đủ') ||
       aiContent.includes('insufficient') ||
       aiContent.includes('billing') ||
       aiContent.includes('Nạp thêm tại'))
    ) {
      console.warn('[ASSISTANT] AI provider billing error detected (Motion). Raw preview:', aiContent.slice(0, 300));
      res.status(502).json({
        success: false,
        error: 'AI_BILLING_ERROR',
        message: 'Hệ thống AI tạm thời không khả dụng do vấn đề cấu hình. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
      });
      return;
    }

    // 7. Schema validation.
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

// ─── POST /api/v1/arguments/refine ──────────────────────────────────────────

/**
 * AI Argument Refinement — refines a raw user idea into structured C-R-E format.
 *
 * HARD INVARIANTS (AI_ARGUMENT_REFINEMENT_SPEC.md):
 *   - AI NEVER modifies FinalDebateDraft directly.
 *   - Semantic core and stance MUST be preserved.
 *   - Evidence = search direction only, NEVER fabricated data.
 *   - Quota consumed ONLY after successful validation (post-validate).
 *
 * Flow (post-validate quota model):
 *  1. Resolve userId from authenticated middleware — NEVER from req.body
 *  2. Validate inputs (3 meaningful words min, 500 chars max, valid stance)
 *  3. checkQuotaAvailable(userId, 'ASSISTANT_DRAFT', 1) → 403 if not ALLOW (0 AI calls)
 *  4. Build prompt with semantic preservation + evidence safety guardrails
 *  5. executeWithMetering('Argument_Refinement') → AI generation (temperature 0.3, max_tokens 800)
 *  6. Parse & validate C-R-E JSON schema
 *  7. Semantic preservation gate: stance check + reversal detection
 *  8. Evidence safety gate: reject fabricated statistics/URLs/citations
 *  9. consumeQuota(userId, 'ASSISTANT_DRAFT', 1) — atomic conditional decrement
 * 10. Return HTTP 200 with candidate suggestion
 *
 * Spec: docs/AI_ARGUMENT_REFINEMENT_SPEC.md §11–§28
 */
export async function refineArgument(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Authenticated identity — strictly from middleware, NOT req.body.
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'UNAUTHENTICATED', message: 'Authentication required.' });
      return;
    }

    // 2. Input validation.
    const { rawText, stance, topic, existingClaim, existingReasoning, existingEvidenceSuggestion, language } = req.body as {
      rawText?: unknown;
      stance?: unknown;
      topic?: unknown;
      existingClaim?: unknown;
      existingReasoning?: unknown;
      existingEvidenceSuggestion?: unknown;
      language?: unknown;
    };

    // 2a. rawText — required, string, non-empty.
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Field "rawText" is required and must be a non-empty string.',
      });
      return;
    }

    const trimmedRawText = rawText.trim();

    // 2b. rawText max length: 500 characters.
    if (trimmedRawText.length > 500) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Field "rawText" exceeds maximum length of 500 characters.',
      });
      return;
    }

    // 2c. rawText min meaningful words: 3 words (exclude common Vietnamese filler words).
    const FILLER_WORDS = new Set(['ừm', 'à', 'thì', 'là', 'uh', 'um', 'ah', 'ờ', 'ạ', 'vâng', 'dạ', 'ừ', 'hmm']);
    const words = trimmedRawText
      .split(/\s+/)
      .filter((w) => w.length > 0 && !FILLER_WORDS.has(w.toLowerCase()));
    if (words.length < 3) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Field "rawText" must contain at least 3 meaningful words.',
      });
      return;
    }

    // 2d. Reject repetitive spam input (e.g., "aaaaaaa", "1111111").
    const uniqueChars = new Set(trimmedRawText.replace(/\s/g, '').toLowerCase());
    if (uniqueChars.size <= 2 && trimmedRawText.length > 5) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Input appears to be spam or repetitive characters.',
      });
      return;
    }

    // 2e. stance — required, strict enum validation.
    if (!stance || (stance !== 'AFFIRMATIVE' && stance !== 'NEGATIVE')) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Field "stance" is required and must be "AFFIRMATIVE" or "NEGATIVE".',
      });
      return;
    }

    const safeTopic = typeof topic === 'string' ? topic : undefined;
    const safeExistingClaim = typeof existingClaim === 'string' ? existingClaim : undefined;
    const safeExistingReasoning = typeof existingReasoning === 'string' ? existingReasoning : undefined;
    const safeExistingEvidence = typeof existingEvidenceSuggestion === 'string' ? existingEvidenceSuggestion : undefined;
    const safeLanguage = typeof language === 'string' && (language === 'vi' || language === 'en') ? language : 'vi';

    // 3. Non-consuming quota check — 403 before any AI call.
    const quotaCheck = await checkQuotaAvailable(userId, 'ASSISTANT_DRAFT', 1);
    if (quotaCheck.decision !== 'ALLOW') {
      sendQuotaError(res, quotaCheck.error?.code ?? quotaCheck.decision ?? undefined, quotaCheck.error?.message);
      return;
    }

    // 4. Build prompt with semantic preservation + evidence safety guardrails.
    const { systemPrompt, userPrompt } = buildArgumentRefinementPrompt({
      rawText: trimmedRawText,
      stance,
      topic: safeTopic,
      existingClaim: safeExistingClaim,
      existingReasoning: safeExistingReasoning,
      existingEvidenceSuggestion: safeExistingEvidence,
      language: safeLanguage,
    });

    // 5. AI generation with telemetry metering wrapper.
    let aiContent: string;
    try {
      const model = getAssistantModel();
      const aiResult = await executeWithMetering({
        userId,
        sessionId: 'ASSISTANT_REFINEMENT',
        serviceType: 'LLM_ASSISTANT',
        modelName: model,
        taskName: 'Argument_Refinement',
        apiCallFunction: async () => {
          return await createOpenAIChatCompletion({
            model,
            systemPrompt,
            userPrompt,
            temperature: 0.3, // Conservative: prioritize stability and semantic preservation
            max_tokens: 2048,
          });
        },
      });
      aiContent = aiResult.content;
    } catch (aiError: unknown) {
      const message = aiError instanceof Error ? aiError.message : String(aiError);
      console.error('[ASSISTANT] Argument Refinement AI provider error:', message);
      // AI failure → zero quota deduction (post-validate semantics).
      if (message.includes('timed out')) {
        res.status(504).json({
          success: false,
          error: 'AI_TIMEOUT',
          message: 'Thời gian phản hồi của AI quá lâu. Vui lòng thử lại.',
        });
      } else {
        res.status(502).json({
          success: false,
          error: 'AI_SERVICE_UNAVAILABLE',
          message: 'Hệ thống AI đang gặp sự cố tạm thời. Vui lòng thử lại sau.',
        });
      }
      return;
    }

    // 6. Detect upstream billing / insufficient balance errors before parsing.
    if (
      aiContent &&
      (aiContent.includes('Số dư tài khoản API không đủ') ||
       aiContent.includes('insufficient') ||
       aiContent.includes('billing') ||
       aiContent.includes('Nạp thêm tại'))
    ) {
      console.warn('[ASSISTANT] AI provider billing error detected (Refinement). Raw preview:', aiContent.slice(0, 300));
      res.status(502).json({
        success: false,
        error: 'AI_BILLING_ERROR',
        message: 'Hệ thống AI tạm thời không khả dụng do vấn đề cấu hình. Vui lòng thử lại sau hoặc liên hệ quản trị viên.',
      });
      return;
    }

    // 7. Parse AI output → extract JSON C-R-E candidate via robust normalizer.
    const parsed = parseArgumentRefinement(aiContent);
    console.log('[ASSISTANT_REFINEMENT_RAW]', aiContent?.slice(0, 500));
    console.log('[ASSISTANT_REFINEMENT_NORMALIZED]', parsed);

    if (!parsed) {
      console.warn('[ASSISTANT_RAW_FAILED] Argument Refinement parser returned null. Raw output preview:',
        aiContent?.slice(0, 500));
      res.status(422).json({
        success: false,
        error: 'INVALID_AI_OUTPUT',
        message: 'AI trả về kết quả không đúng cấu trúc C-R-E. Vui lòng thử lại.',
      });
      return;
    }

    // 8. Sanitize evidence suggestion (strip URLs/DOIs gracefully rather than throwing 422).
    parsed.evidenceSuggestion = sanitizeEvidenceSafety(parsed.evidenceSuggestion);

    // 9. Semantic Preservation Gate — deterministic stance/reversal verification.
    const semanticResult = validateSemanticPreservation(parsed, stance, trimmedRawText);
    if (!semanticResult.passed) {
      console.warn('[ASSISTANT] Semantic preservation gate FAILED:', semanticResult.reason);
      res.status(422).json({
        success: false,
        error: 'SEMANTIC_VALIDATION_FAILED',
        message: 'AI trả về kết quả vi phạm nguyên tắc bảo toàn ngữ nghĩa. Vui lòng thử lại.',
      });
      return;
    }

    // 10. Atomic quota consumption — ONLY after successful validation.
    const consumed = await consumeQuota(userId, 'ASSISTANT_DRAFT', 1);
    if (consumed.decision !== 'ALLOW') {
      console.warn('[ASSISTANT] Argument Refinement quota consume failed after validation (race condition). userId:', userId);
      sendQuotaError(res, consumed.error?.code ?? consumed.decision ?? undefined, consumed.error?.message);
      return;
    }

    // 11. Success response with canonical schema.
    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[ASSISTANT] refineArgument unexpected error:', message);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message });
  }
}

export const handleRefineArgument = refineArgument;

// ─── Semantic & Evidence Safety Normalizers ─────────────────────────────────

function sanitizeEvidenceSafety(evidence: string): string {
  if (!evidence || typeof evidence !== 'string') return '';
  let clean = evidence.trim();
  // Strip raw URLs to clean domain/name
  clean = clean.replace(/https?:\/\/(?:www\.)?([^\s/]+)[^\s]*/gi, '$1');
  clean = clean.replace(/www\.([^\s/]+)[^\s]*/gi, '$1');
  // Strip DOI references
  clean = clean.replace(/\b(?:doi|DOI)\s*:\s*10\.\d{4,}\/[^\s]+/g, '');
  return clean.trim();
}

function validateSemanticPreservation(
  candidate: RefinedArgumentResult,
  requestedStance: 'AFFIRMATIVE' | 'NEGATIVE',
  originalRawText: string,
): { passed: boolean; reason?: string } {
  // Gate 1: Non-empty substantive content.
  if (candidate.claim.trim().length < 5) {
    return { passed: false, reason: 'Claim is too short to be meaningful.' };
  }
  if (candidate.reasoning.trim().length < 10) {
    return { passed: false, reason: 'Reasoning is too short to be meaningful.' };
  }

  const claimLower = candidate.claim.toLowerCase().trim();

  // Gate 2: Stance reversal detection (strictly on explicit claim opening)
  if (requestedStance === 'AFFIRMATIVE') {
    const strongNegationOpeners = [
      'chúng tôi phản đối', 'phe phản đối', 'we oppose', 'we are against'
    ];
    for (const pattern of strongNegationOpeners) {
      if (claimLower.startsWith(pattern)) {
        return { passed: false, reason: `Stance reversal detected: AFFIRMATIVE request but claim starts with "${pattern}"` };
      }
    }
  } else {
    const strongAffirmationOpeners = [
      'chúng tôi ủng hộ', 'phe ủng hộ', 'we support', 'we are in favor'
    ];
    for (const pattern of strongAffirmationOpeners) {
      if (claimLower.startsWith(pattern)) {
        return { passed: false, reason: `Stance reversal detected: NEGATIVE request but claim starts with "${pattern}"` };
      }
    }
  }

  return { passed: true };
}
