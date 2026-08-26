/**
 * Generic OpenAI-Compatible Chat Completions Client
 *
 * Primary provider: Beeknoee (Antigravity) Gateway.
 * Fallback chain: BEEKNOEE_* → OPENAI_* → hardcoded Groq defaults.
 *
 * Environment variable resolution order:
 *   1. .env.local  (highest priority — Beeknoee credentials)
 *   2. .env        (project-level defaults)
 *   3. process.env (system environment)
 *
 * Variables consumed:
 *   BEEKNOEE_API_KEY   — Beeknoee gateway API key
 *   BEEKNOEE_BASE_URL  — Beeknoee gateway base URL
 *   MODEL_LOGIC_COACH  — Model for Logic Coach (used in debateController)
 *   MODEL_OPPONENT     — Model for AI Opponent
 *   OPENAI_API_KEY     — Fallback API key (Groq)
 *   OPENAI_BASE_URL    — Fallback base URL (Groq)
 *   AI_MODEL           — Fallback default model
 */

import path from 'path';
import dotenv from 'dotenv';

// Load .env.local first (Beeknoee credentials), then .env as fallback.
// `override: false` means already-set vars are NOT overwritten by the second call,
// so .env.local wins on any key collision.
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpenAIChatRequest {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export interface OpenAIChatResult {
  content: string;
  finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  /** Identifies the gateway that served this request — used by aiGateway telemetry. */
  _gateway?: string;
}

interface OpenAIApiResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
  };
  error?: {
    message?: string;
    code?: unknown;
    type?: string;
  };
}

// ─── Configuration Resolvers ─────────────────────────────────────────────────

const CANONICAL_GEMINI_KEY = 'AQ.Ab8RN6LM3b3gRt3YQx1HEUNkkKycBPgWyWqWqrI1AM_ujmWPMg';
const CANONICAL_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';

/**
 * Resolved base URL.
 * Strictly targets Google Gemini Generative Language OpenAI endpoint.
 */
export function getOpenAIBaseUrl(): string {
  const url = process.env.GEMINI_BASE_URL;
  if (url && url.includes('googleapis.com')) return url;
  return CANONICAL_GEMINI_BASE_URL;
}

/**
 * Resolved model for general AI calls.
 * Priority: AI_MODEL → gemini-3.6-flash.
 */
export function getOpenAIModel(): string {
  return process.env.AI_MODEL || 'gemini-3.6-flash';
}

/**
 * Resolved model for Logic Coach specifically.
 * Reads MODEL_LOGIC_COACH → AI_MODEL → gemini-3.6-flash.
 */
export function getLogicCoachModel(): string {
  return process.env.MODEL_LOGIC_COACH || process.env.AI_MODEL || 'gemini-3.6-flash';
}

/**
 * Resolved model for AI Opponent specifically.
 * Reads MODEL_OPPONENT → AI_MODEL → gemini-3.6-flash.
 */
export function getOpponentModel(): string {
  return process.env.MODEL_OPPONENT || process.env.AI_MODEL || 'gemini-3.6-flash';
}

/**
 * Resolved fallback model when primary model hits rate limit (429) or 503/404.
 * Reads MODEL_FALLBACK → gemini-2.5-flash.
 */
export function getFallbackModel(): string {
  return process.env.MODEL_FALLBACK || 'gemini-3.5-flash';
}

/**
 * Resolved API key.
 * Strictly validates Gemini key and rejects stale Groq/Beeknoee keys.
 */
export function getOpenAIApiKey(): string {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.startsWith('AQ.')) return geminiKey;

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.startsWith('AQ.')) return openaiKey;

  return CANONICAL_GEMINI_KEY;
}

/**
 * Returns the gateway name for telemetry tagging.
 */
export function getGatewayName(): string {
  const url = getOpenAIBaseUrl();
  if (url.includes('googleapis.com')) return 'gemini';
  if (url.includes('groq')) return 'groq';
  return 'openai-compatible';
}

// ─── Safe JSON Extractor ─────────────────────────────────────────────────────

/**
 * Strip markdown code fences and extract the outermost JSON object.
 *
 * Handles:
 *   - ```json\n{...}\n```
 *   - ```\n{...}\n```
 *   - Raw JSON with leading/trailing prose
 *
 * Never throws — returns null if no valid JSON object can be extracted.
 */
export function safeExtractJSON(raw: string): string | null {
  if (!raw || !raw.trim()) return null;

  // 1. Strip code fences.
  let text = raw.trim();
  const fenceMatch = text.match(/^```(?:json|JSON)?\s*\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // Partial fence stripping
    text = text.replace(/^```(?:json|JSON)?\s*\r?\n?/, '').replace(/\r?\n?```\s*$/, '').trim();
  }

  // 2. Find outermost { ... } respecting strings.
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { depth++; continue; }
    if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

// ─── LLM Client ──────────────────────────────────────────────────────────────

/** LLM request timeout - 120 seconds.
 *  Rationale: Opponent + Coach run in parallel via Promise.allSettled.
 *  Each call to Beeknoee/Gemini takes ~10-45s depending on input size.
 *  120s provides safe headroom for parallel execution. */
const LLM_TIMEOUT_MS = 120_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function executeSingleChatCompletion(
  endpoint: string,
  headers: Record<string, string>,
  payloadBody: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; payload?: OpenAIApiResponse; detail?: string; error?: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return { ok: false, status: response.status, detail };
    }

    const payload = (await response.json()) as OpenAIApiResponse;
    return { ok: true, status: response.status, payload };
  } catch (err: any) {
    return { ok: false, status: 0, error: err };
  } finally {
    clearTimeout(timer);
  }
}

let mockChatCompletionFn: ((request: OpenAIChatRequest, isFallback?: boolean) => Promise<OpenAIChatResult>) | null = null;

export function setMockChatCompletion(fn: typeof mockChatCompletionFn): void {
  mockChatCompletionFn = fn;
}

export async function createOpenAIChatCompletion(
  request: OpenAIChatRequest,
  isFallbackAttempt = false,
): Promise<OpenAIChatResult> {
  if (mockChatCompletionFn) {
    return await mockChatCompletionFn(request, isFallbackAttempt);
  }

  const apiKey = getOpenAIApiKey();
  const baseUrl = getOpenAIBaseUrl();
  const model = request.model || getOpenAIModel();
  const gateway = getGatewayName();

  if (!apiKey) {
    throw new Error(
      'No AI API key configured. Set GEMINI_API_KEY, BEEKNOEE_API_KEY or OPENAI_API_KEY in .env.',
    );
  }

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const payloadBody: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    temperature: request.temperature ?? 0.7,
    max_tokens: request.max_tokens ?? 4000,
  };

  if (request.response_format) {
    payloadBody.response_format = request.response_format;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'x-goog-api-key': apiKey,
  };

  // OpenRouter-only attribution headers.
  if (baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://ai-debate-master.app';
    headers['X-Title'] = 'AI Debate Master';
  }

  const MAX_RETRIES = 2;
  let lastStatus = 0;
  let lastDetail = '';
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoffMs = attempt === 1 ? 600 + Math.random() * 200 : 1500 + Math.random() * 300;
      console.warn(`[AI_RETRY] model="${model}" attempt=${attempt}/${MAX_RETRIES} status=${lastStatus} backoff=${Math.round(backoffMs)}ms`);
      await sleep(backoffMs);
    }

    const execRes = await executeSingleChatCompletion(endpoint, headers, payloadBody, LLM_TIMEOUT_MS);

    if (execRes.ok && execRes.payload) {
      const payload = execRes.payload;
      if (payload.error) {
        throw new Error(`AI Provider error: ${payload.error.message || JSON.stringify(payload.error)}`);
      }

      const firstChoice = payload.choices?.[0] as any;
      const finishReason = firstChoice?.finish_reason;
      if (finishReason === 'length') {
        console.warn('[AI_TRUNCATION_WARNING]', {
          model,
          max_tokens: payloadBody.max_tokens,
          finish_reason: finishReason,
          prompt_tokens: payload.usage?.prompt_tokens,
          completion_tokens: payload.usage?.completion_tokens,
          hint: 'Output was truncated because completion reached max_tokens limit.',
        });
      }

      const rawContent = firstChoice?.message?.content;
      let content =
        typeof rawContent === 'string' ? rawContent : rawContent != null ? String(rawContent) : '';

      // Strip <thought>...</thought> reasoning blocks if returned by thinking models
      if (content.includes('</thought>')) {
        content = content.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      }

      // Detect upstream rate-limit or blocked messages returned with HTTP 200
      if (
        (payload as any).id?.startsWith('blocked-') ||
        content.startsWith('⚠️') ||
        content.includes('Quá nhiều yêu cầu song song') ||
        content.includes('Số dư tài khoản API không đủ')
      ) {
        lastStatus = 429;
        lastDetail = content;
        continue;
      }

      const usage = payload.usage ?? {};
      return {
        content,
        finish_reason: typeof finishReason === 'string' ? finishReason : 'stop',
        usage: {
          prompt_tokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
          completion_tokens:
            typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
        },
        _gateway: gateway,
      };
    }

    lastStatus = execRes.status;
    lastDetail = execRes.detail || '';
    lastError = execRes.error;

    const isRetryable = lastStatus === 429 || lastStatus === 503 || lastStatus === 500 || (lastError && lastError.name === 'FetchError');
    if (!isRetryable) {
      break; // Non-retryable status like 400, 401, 404
    }
  }

  // If retries failed on retryable or 404 error, attempt failover to configured fallback model
  const fallbackModel = getFallbackModel();
  if (!isFallbackAttempt && fallbackModel && fallbackModel !== model) {
    console.warn(`[AI_FALLBACK_TRIGGERED] Primary model "${model}" failed (status=${lastStatus}). Failing over to "${fallbackModel}"...`);
    return await createOpenAIChatCompletion(
      {
        ...request,
        model: fallbackModel,
      },
      true,
    );
  }

  if (lastError?.name === 'AbortError') {
    console.error('[AI_PROVIDER_TIMEOUT]', {
      gateway,
      baseUrl,
      model,
      timeout_ms: LLM_TIMEOUT_MS,
    });
    throw new Error(`AI Provider request timed out after ${LLM_TIMEOUT_MS}ms`);
  }

  console.error('[AI_PROVIDER_HTTP_ERROR]', {
    gateway,
    status: lastStatus,
    baseUrl,
    model,
    detail: lastDetail.slice(0, 300),
    hint: lastStatus === 401
      ? 'API key invalid — check GEMINI_API_KEY/BEEKNOEE_API_KEY in .env'
      : lastStatus === 404
      ? `Model "${model}" not found on ${baseUrl}`
      : lastStatus === 429
      ? 'Rate limit exceeded after retries'
      : lastStatus >= 500
      ? 'Upstream provider error'
      : 'Check provider configuration',
  });

  throw new Error(`AI Provider HTTP ${lastStatus}: ${lastDetail.slice(0, 300) || (lastError?.message ?? 'Unknown error')}`);
}
