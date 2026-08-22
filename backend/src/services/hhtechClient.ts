/**
 * HHTECH OpenAI-compatible chat completions client.
 *
 * Replaces the previous Google Gemini provider while preserving the existing
 * Logic Coach C-R-E response contract and aiGateway telemetry pipeline.
 * The API key is read from the environment only and is never hard-coded/logged.
 */

export interface HHTechChatRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Maximum output tokens. Defaults to 1024 if not specified. */
  max_tokens?: number;
}

export interface HHTechChatResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface HHTechApiResponse {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
  };
}

export function getHHTechModel(): string {
  return process.env.HHTECH_MODEL || 'claude-sonnet-5';
}

/** LLM request timeout — 60 seconds. */
const LLM_TIMEOUT_MS = 60_000;

export async function createHHTechChatCompletion(
  request: HHTechChatRequest,
): Promise<HHTechChatResult> {
  const apiKey = process.env.HHTECH_API_KEY;
  const baseUrl = process.env.HHTECH_BASE_URL || 'https://hhtechapi.com/v1';

  if (!apiKey) {
    throw new Error('HHTECH_API_KEY is not configured.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        max_tokens: request.max_tokens ?? 1024,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // Log structured error so root cause is immediately visible in server logs.
      console.error('[HHTECH_HTTP_ERROR]', {
        status: response.status,
        model: request.model,
        detail: detail.slice(0, 300),
        hint: response.status === 401
          ? 'API key invalid or expired — update HHTECH_API_KEY in .env'
          : response.status === 429
          ? 'Rate-limited — reduce request frequency or upgrade plan'
          : response.status >= 500
          ? 'HHTECH provider error — transient, retry may help'
          : 'Check HHTECH API docs',
      });
      throw new Error(`HHTECH API error (${response.status}): ${detail.slice(0, 300)}`);
    }

    const payload = (await response.json()) as HHTechApiResponse;
    const rawContent = payload.choices?.[0]?.message?.content;
    const content =
      typeof rawContent === 'string' ? rawContent : rawContent != null ? String(rawContent) : '';

    const usage = payload.usage ?? {};
    return {
      content,
      usage: {
        prompt_tokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
        completion_tokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
      },
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error('[HHTECH_TIMEOUT]', {
        model: request.model,
        timeout_ms: LLM_TIMEOUT_MS,
        hint: 'LLM inference exceeded 60s — consider reducing max_tokens or history size',
      });
      throw new Error(`HHTECH request timed out after ${LLM_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
