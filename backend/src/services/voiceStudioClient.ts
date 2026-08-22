/**
 * voiceStudioClient.ts — Local VoiceStudio (by debpalash) Microservice Client
 *
 * Architecture:
 *   - Connects to local Python VoiceStudio microservice (default: http://localhost:8000).
 *   - Provides local offline Text-to-Speech (TTS) generation for AI Opponent rebuttals.
 *   - Provides local Speech-to-Text (STT) and DSP Voice Coach analytics (WPM, fillers, pauses).
 *   - Adheres strictly to V15: 0 external API cost, pedagogical quality, graceful fallback.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface TTSResult {
  success: boolean;
  audioPath?: string;
  audioBuffer?: Buffer;
  mimeType?: string;
  durationSeconds?: number;
  error?: string;
}

export interface VoiceAnalysisResult {
  success: boolean;
  transcript?: string;
  wpm?: number;
  wordCount?: number;
  fillerCount?: number;
  pauseCount?: number;
  durationMs?: number;
  sttSource?: 'voicestudio' | 'whisper' | 'fallback';
  error?: string;
}

const VOICESTUDIO_URL = process.env.VOICESTUDIO_URL || 'http://127.0.0.1:8000';
const AUDIO_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'audio');

// Ensure upload directory exists
try {
  if (!fs.existsSync(AUDIO_UPLOAD_DIR)) {
    fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[VOICESTUDIO] Could not create audio upload dir:', e);
}

let lastHealthCheckTime = 0;
let cachedIsAvailable = false;

/**
 * Health check to verify if VoiceStudio microservice is running.
 * Cached for 10s with 300ms timeout to prevent latency penalty when offline.
 */
export async function isVoiceStudioAvailable(): Promise<boolean> {
  const now = Date.now();
  if (cachedIsAvailable && now - lastHealthCheckTime < 10000) {
    return true;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${VOICESTUDIO_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);
    cachedIsAvailable = res ? res.ok : false;
    lastHealthCheckTime = now;
    return cachedIsAvailable;
  } catch {
    cachedIsAvailable = false;
    lastHealthCheckTime = now;
    return false;
  }
}

/**
 * Generate natural Vietnamese / English TTS audio from VoiceStudio.
 *
 * @param text Content to synthesize
 * @param voiceId Character persona or voice identifier
 * @param lang Target language code ('vi' | 'en')
 */
export async function generateTTS(
  text: string,
  voiceId: string = 'default_vi',
  lang: string = 'vi',
): Promise<TTSResult> {
  if (!text || !text.trim()) {
    return { success: false, error: 'Empty text provided' };
  }

  // Quick 0ms check: if VoiceStudio is offline, skip immediately
  const isUp = await isVoiceStudioAvailable();
  if (!isUp) {
    return { success: false, error: 'VoiceStudio microservice is offline' };
  }

  // Clean Markdown & format text for rapid neural TTS delivery
  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // 1. Call dedicated VoiceStudio TTS endpoint
    let res: globalThis.Response | null = null;
    try {
      res = await fetch(`${VOICESTUDIO_URL}/api/v1/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/wav, audio/mpeg, audio/ogg, application/json' },
        body: JSON.stringify({ text: cleanText, voice_id: voiceId, lang, speed: 1.05 }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      console.warn('[VOICESTUDIO] Primary /api/v1/tts fetch notice:', fetchErr.message);
    }

    // Fallback: POST /tts
    if (!res || !res.ok) {
      try {
        res = await fetch(`${VOICESTUDIO_URL}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'audio/wav, audio/mpeg, audio/ogg, application/json' },
          body: JSON.stringify({ text: cleanText, voice: voiceId, language: lang }),
          signal: controller.signal,
        });
      } catch {}
    }

    clearTimeout(timeout);

    if (!res || !res.ok) {
      return {
        success: false,
        error: `VoiceStudio microservice is not responding on ${VOICESTUDIO_URL}`,
      };
    }

    const contentType = res.headers.get('content-type') || '';

    // Handle JSON response containing base64 audio
    if (contentType.includes('application/json')) {
      const data: any = await res.json();
      if (data.audio_base64) {
        const audioBuf = Buffer.from(data.audio_base64, 'base64');
        const ext = data.format || 'wav';
        const filename = `vs_tts_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
        const filePath = path.join(AUDIO_UPLOAD_DIR, filename);
        await fs.promises.writeFile(filePath, audioBuf);

        return {
          success: true,
          audioPath: `/uploads/audio/${filename}`,
          audioBuffer: audioBuf,
          mimeType: `audio/${ext}`,
          durationSeconds: data.duration,
        };
      }
    }

    // Handle binary audio stream
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = Buffer.from(arrayBuf);
    const ext = contentType.includes('mpeg') || contentType.includes('mp3') ? 'mp3' : 'wav';
    const filename = `vs_tts_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(AUDIO_UPLOAD_DIR, filename);
    await fs.promises.writeFile(filePath, audioBuf);

    return {
      success: true,
      audioPath: `/uploads/audio/${filename}`,
      audioBuffer: audioBuf,
      mimeType: contentType || `audio/${ext}`,
    };
  } catch (error: any) {
    console.warn('[VOICESTUDIO_TTS] Local VoiceStudio service unavailable, falling back:', error.message);
    return {
      success: false,
      error: error.message || 'VoiceStudio connection failed',
    };
  }
}

/**
 * Analyze speech recording using VoiceStudio (STT + Voice DSP metrics).
 *
 * @param audioBuffer Raw binary audio recording
 * @param durationMs Recording duration in milliseconds
 * @param language Target spoken language
 */
export async function analyzeVoice(
  audioBuffer: Buffer,
  durationMs: number = 3000,
  language: string = 'vi',
): Promise<VoiceAnalysisResult> {
  if (!audioBuffer || audioBuffer.length === 0) {
    return { success: false, error: 'Empty audio buffer' };
  }

  // Quick 0ms check: if VoiceStudio is offline, skip immediately to Whisper
  const isUp = await isVoiceStudioAvailable();
  if (!isUp) {
    return { success: false, error: 'VoiceStudio microservice is offline' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
    formData.append('audio', blob, 'recording.webm');
    formData.append('duration_ms', String(durationMs));
    formData.append('language', language);

    const res = await fetch(`${VOICESTUDIO_URL}/api/v1/voice/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    }).catch(async () => {
      // Fallback route: POST /analyze
      return fetch(`${VOICESTUDIO_URL}/analyze`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        error: `VoiceStudio analyze failed: ${res.status}`,
      };
    }

    const data: any = await res.json();
    return {
      success: true,
      transcript: data.transcript || '',
      wpm: data.wpm || Math.round(((data.word_count || 0) / (durationMs / 1000)) * 60),
      wordCount: data.word_count || (data.transcript ? data.transcript.split(/\s+/).length : 0),
      fillerCount: data.filler_count ?? data.fillers ?? 0,
      pauseCount: data.pause_count ?? 0,
      durationMs: data.duration_ms || durationMs,
      sttSource: 'voicestudio',
    };
  } catch (error: any) {
    console.warn('[VOICESTUDIO_STT] Local VoiceStudio analysis unavailable, fallback active:', error.message);
    return {
      success: false,
      error: error.message || 'VoiceStudio analysis connection failed',
    };
  }
}

export const VoiceStudioClient = {
  isAvailable: isVoiceStudioAvailable,
  generateTTS,
  analyzeVoice,
};

export default VoiceStudioClient;
