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
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  /** Identifies the gateway that served this request — used by aiGateway telemetry. */
  _gateway?: string;
}

interface OpenAIApiResponse {
  choices?: Array<{
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

/**
 * Resolved base URL.
 * Priority: BEEKNOEE_BASE_URL → OPENAI_BASE_URL → Groq fallback.
 */
export function getOpenAIBaseUrl(): string {
  return (
    process.env.BEEKNOEE_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://api.groq.com/openai/v1'
  );
}

/**
 * Resolved model for general AI calls.
 * Priority: AI_MODEL → hardcoded fallback.
 */
export function getOpenAIModel(): string {
  return process.env.AI_MODEL || 'llama-3.3-70b-versatile';
}

/**
 * Resolved model for Logic Coach specifically.
 * Reads MODEL_LOGIC_COACH → claude-sonnet-4-6 (Free Quota on Beeknoee).
 */
export function getLogicCoachModel(): string {
  return process.env.MODEL_LOGIC_COACH || 'claude-sonnet-4-6';
}

/**
 * Resolved model for AI Opponent specifically.
 * Reads MODEL_OPPONENT → claude-sonnet-4-6 (Free Quota on Beeknoee).
 */
export function getOpponentModel(): string {
  return process.env.MODEL_OPPONENT || 'claude-sonnet-4-6';
}

/**
 * Resolved API key.
 * Priority: BEEKNOEE_API_KEY → OPENAI_API_KEY → empty string.
 */
export function getOpenAIApiKey(): string {
  return process.env.BEEKNOEE_API_KEY || process.env.OPENAI_API_KEY || '';
}

/**
 * Returns the gateway name for telemetry tagging.
 * 'beeknoee' when BEEKNOEE_BASE_URL is configured, otherwise 'openai-compatible'.
 */
export function getGatewayName(): string {
  return process.env.BEEKNOEE_BASE_URL ? 'beeknoee' : 'openai-compatible';
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
 *  Each call to Beeknoee claude-sonnet-4-6 takes ~16-45s depending on
 *  input size. 120s provides safe headroom for both parallel calls. */
const LLM_TIMEOUT_MS = 120_000;

export async function createOpenAIChatCompletion(
  request: OpenAIChatRequest,
): Promise<OpenAIChatResult> {
  const apiKey = getOpenAIApiKey();
  const baseUrl = getOpenAIBaseUrl();
  const model = request.model || getOpenAIModel();
  const gateway = getGatewayName();

  if (!apiKey) {
    throw new Error(
      'No AI API key configured. Set BEEKNOEE_API_KEY or OPENAI_API_KEY in .env.local or .env.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  try {
    const payloadBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 1024,
    };

    if (request.response_format) {
      payloadBody.response_format = request.response_format;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };

    // OpenRouter-only attribution headers.
    if (baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = 'https://ai-debate-master.app';
      headers['X-Title'] = 'AI Debate Master';
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payloadBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[AI_PROVIDER_HTTP_ERROR]', {
        gateway,
        status: response.status,
        baseUrl,
        model,
        detail: detail.slice(0, 300),
        hint: response.status === 401
          ? 'API key invalid — check BEEKNOEE_API_KEY in .env.local'
          : response.status === 404
          ? `Model "${model}" not found on ${baseUrl}`
          : response.status === 429
          ? 'Rate limit exceeded'
          : response.status >= 500
          ? 'Upstream provider error'
          : 'Check provider configuration',
      });
      throw new Error(`AI Provider HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as OpenAIApiResponse;
    if (payload.error) {
      throw new Error(
        `AI Provider error: ${payload.error.message || JSON.stringify(payload.error)}`,
      );
    }

    const rawContent = payload.choices?.[0]?.message?.content;
    const content =
      typeof rawContent === 'string' ? rawContent : rawContent != null ? String(rawContent) : '';

    const usage = payload.usage ?? {};
    return {
      content,
      usage: {
        prompt_tokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
        completion_tokens:
          typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
      },
      _gateway: gateway,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error('[AI_PROVIDER_TIMEOUT]', {
        gateway,
        baseUrl,
        model,
        timeout_ms: LLM_TIMEOUT_MS,
      });
      throw new Error(`AI Provider request timed out after ${LLM_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
