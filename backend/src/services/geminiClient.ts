/**
 * Gemini API Client Initialization & Provider Adapter
 *
 * Environment variable resolution order:
 *   1. .env.local  (highest priority)
 *   2. .env        (project-level defaults)
 *   3. process.env (system environment)
 *
 * Variables consumed:
 *   GEMINI_API_KEY / GOOGLE_API_KEY — Gemini API Key
 *   GEMINI_MODEL                    — Gemini Model (defaults to 'gemini-1.5-flash')
 */

import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Ensure dotenv is initialized at top-level before reading environment variables.
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface GeminiChatRequest {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiChatResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

/**
 * Resolves Gemini API key from process.env.GEMINI_API_KEY or process.env.GOOGLE_API_KEY.
 * Never logs or prints the API key.
 */
export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

/**
 * Resolves target Gemini model name.
 * Default: 'gemini-1.5-flash'
 */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
}

/**
 * Initializes and returns a GoogleGenAI client instance with explicit apiKey.
 */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured in .env.local or .env');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Executes a Gemini content generation request with strict error handling for HTTP 403 / PERMISSION_DENIED.
 */
export async function createGeminiChatCompletion(
  request: GeminiChatRequest,
): Promise<GeminiChatResult> {
  const apiKey = getGeminiApiKey();
  const modelName = request.model || getGeminiModel();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1024,
      },
    });

    const content = response.text ?? '';
    const usageMetadata = response.usageMetadata;
    const promptTokens = usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = usageMetadata?.candidatesTokenCount ?? 0;

    return {
      content,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      },
    };
  } catch (error: any) {
    const status = error?.status || error?.statusCode || error?.response?.status;
    const message = String(error?.message || error || '');

    if (
      status === 403 ||
      message.includes('403') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('caller does not have permission')
    ) {
      console.error(
        '[GEMINI_AUTH_ERROR] API key does not have permission for the requested model/service.',
      );
    }

    throw error;
  }
}