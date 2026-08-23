/**
 * whisperClient.ts -- Production Speech-to-Text via OpenAI Whisper API
 *
 * Reads configuration from environment:
 *   WHISPER_API_KEY   -- Primary key; falls back to OPENAI_API_KEY if absent.
 *   WHISPER_BASE_URL  -- Optional endpoint override (Faster-Whisper server etc.)
 *                        Defaults to official OpenAI API.
 *   WHISPER_MODEL     -- Model name, defaults to "whisper-1".
 *
 * Graceful degradation:
 *   - If no API key is configured  -> returns mock transcript (never throws).
 *   - If the Whisper API call fails -> logs the error, returns mock transcript.
 *
 * Zero live calls during compilation. All side effects are inside
 * the async transcribeBuffer() function.
 */

import OpenAI, { toFile } from 'openai';
import { mockTranscribe } from './voiceProcessor.js';

// ---- Environment resolution --------------------------------------------------

/**
 * Priority order for API key:
 *   1. WHISPER_API_KEY    (dedicated Whisper key)
 *   2. OPENAI_API_KEY     (shared OpenAI / Groq key)
 *   3. BEEKNOEE_API_KEY   (Beeknoee gateway key — last resort)
 */
function resolveApiKey(): string | null {
  const key =
    process.env['WHISPER_API_KEY'] ??
    process.env['OPENAI_API_KEY'] ??
    process.env['BEEKNOEE_API_KEY'] ??
    null;
  // Reject empty strings
  return key && key.trim().length > 0 ? key.trim() : null;
}

/**
 * Priority order for base URL:
 *   1. WHISPER_BASE_URL   (explicit Whisper endpoint)
 *   2. OPENAI_BASE_URL    (shared OpenAI-compatible endpoint)
 *   3. undefined          → SDK defaults to https://api.openai.com/v1
 */
function resolveBaseUrl(): string | undefined {
  const url =
    process.env['WHISPER_BASE_URL']?.trim() ??
    process.env['OPENAI_BASE_URL']?.trim();
  return url && url.length > 0 ? url : undefined;
}

function resolveModel(): string {
  return (process.env['WHISPER_MODEL'] ?? 'whisper-1').trim();
}

// ---- Lazy client initialisation ----------------------------------------------

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;
  if (!_client) {
    _client = new OpenAI({ apiKey, baseURL: resolveBaseUrl() });
  }
  return _client;
}

// ---- Public API --------------------------------------------------------------

export type SttSource = 'whisper' | 'mock';

export interface SttResult {
  transcript: string;
  stt_source: SttSource;
  fallback_reason?: string;
}

/**
 * Transcribe raw audio bytes using Whisper API.
 * Always resolves -- never rejects.
 *
 * Strict STT Integrity (INVARIANT-SCORE-07):
 * STT failure or missing credentials must NEVER fabricate sample speech content
 * ("đồng phục học sinh"). It must return an empty transcript with an explicit
 * failure reason.
 */
export async function transcribeBuffer(
  audioBuffer: Buffer | null,
  duration_ms: number,
  language: 'vi' | 'en' | 'mixed' = 'vi',
): Promise<SttResult> {
  const client = getClient();

  if (!client) {
    if (process.env['NODE_ENV'] === 'test' && process.env['ENABLE_MOCK_STT'] === 'true') {
      const mock = mockTranscribe(duration_ms);
      return { transcript: mock.transcript, stt_source: 'mock', fallback_reason: 'Test mock STT' };
    }
    console.warn('[WHISPER_STT] No API key configured. Returning empty transcript.');
    return { transcript: '', stt_source: 'whisper', fallback_reason: 'STT_NOT_CONFIGURED' };
  }

  if (!audioBuffer || audioBuffer.length < 100) {
    console.warn('[WHISPER_STT] Audio buffer empty or too small.');
    return { transcript: '', stt_source: 'whisper', fallback_reason: 'STT_EMPTY_BUFFER' };
  }

  try {
    const model = resolveModel();
    const whisperLang = language === 'en' ? 'en' : 'vi';

    const file = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' });

    const response = await client.audio.transcriptions.create({
      file,
      model,
      language: whisperLang,
      temperature: 0.2,
    });

    const transcript = response.text?.trim() ?? '';

    if (!transcript) {
      console.warn('[WHISPER_STT] Empty transcript returned from API.');
      return { transcript: '', stt_source: 'whisper', fallback_reason: 'STT_EMPTY_TRANSCRIPT' };
    }

    console.info(`[WHISPER_STT] OK -- ${transcript.split(/\s+/).length} words via ${model}`);
    return { transcript, stt_source: 'whisper' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[WHISPER_STT] API call failed: ${message}.`);
    return { transcript: '', stt_source: 'whisper', fallback_reason: `STT_API_ERROR: ${message}` };
  }
}

/**
 * Returns engine status for health checks / startup logging.
 * No API calls are made.
 */
export function getWhisperStatus(): {
  configured: boolean;
  model: string;
  baseUrl: string | undefined;
  engine: string;
} {
  const apiKey = resolveApiKey();
  const baseUrl = resolveBaseUrl();
  const model = resolveModel();
  const engine = baseUrl
    ? `Faster-Whisper-compatible (${baseUrl})`
    : 'OpenAI Whisper (official API)';
  return { configured: apiKey !== null, model, baseUrl, engine };
}
