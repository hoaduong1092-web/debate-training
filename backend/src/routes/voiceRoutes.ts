/**
 * Voice Routes — REST endpoints for Voice Coach module.
 *
 * POST /api/v1/voice/analyze
 *   Accepts raw audio blob, returns WPM + filler words metrics.
 *   Content-Type: application/octet-stream
 *   Query: ?duration_ms=N&language=vi|en|mixed
 *
 * GET /api/v1/voice/health
 *   Returns voice service status (Whisper configured or mock mode).
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { analyzeVoice } from '../controllers/voiceController';
import { VoiceStudioClient } from '../services/voiceStudioClient';
import {
  createVoiceSessionHandler,
  getVoiceSessionHandler,
  finalizeVoiceSessionHandler,
  abortVoiceSessionHandler,
  getVoiceEntitlementHandler,
} from '../controllers/voiceSessionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── Voice Session Lifecycle & Entitlement Endpoints (Spec: 08_VOICE_ENGINE_SPEC & VOICE_QUOTA_CONTRACT v1.0) ──
router.get('/entitlement', authenticate, getVoiceEntitlementHandler);
router.post('/sessions', authenticate, createVoiceSessionHandler);
router.get('/sessions/:id', authenticate, getVoiceSessionHandler);
router.post('/sessions/:id/finalize', authenticate, finalizeVoiceSessionHandler);
router.post('/sessions/:id/abort', authenticate, abortVoiceSessionHandler);


// In-memory LRU-like cache for generated TTS audio to eliminate duplicate synthesis latency
const ttsMemoryCache = new Map<string, { buffer: Buffer; mimeType: string }>();

// Parse raw binary audio blobs (max 25MB for ~10min audio at 32kbps)
router.post(
  '/analyze',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '25mb' }),
  (req: Request, res: Response) => {
    void analyzeVoice(req, res);
  },
);

// GET /api/v1/voice/tts?text=...&lang=vi — 100% Strictly VoiceStudio Local Audio Stream
router.get('/tts', async (req: Request, res: Response) => {
  try {
    const text = String(req.query.text || '').trim();
    const lang = String(req.query.lang || 'vi').trim();
    const voiceId = String(req.query.voice || 'default_vi').trim();
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }

    const cacheKey = `${voiceId}_${lang}_${text}`;
    if (ttsMemoryCache.has(cacheKey)) {
      const cached = ttsMemoryCache.get(cacheKey)!;
      res.setHeader('Content-Type', cached.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Length', cached.buffer.length);
      res.setHeader('X-TTS-Cache', 'HIT');
      return res.send(cached.buffer);
    }

    // Strictly synthesize from local VoiceStudio microservice (100% ONLY VoiceStudio)
    const vsRes = await VoiceStudioClient.generateTTS(text, voiceId, lang);
    if (vsRes.success && vsRes.audioBuffer) {
      if (ttsMemoryCache.size > 200) {
        ttsMemoryCache.delete(ttsMemoryCache.keys().next().value as string);
      }
      ttsMemoryCache.set(cacheKey, {
        buffer: vsRes.audioBuffer,
        mimeType: vsRes.mimeType || 'audio/mpeg',
      });

      res.setHeader('Content-Type', vsRes.mimeType || 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Length', vsRes.audioBuffer.length);
      res.setHeader('X-TTS-Cache', 'MISS');
      return res.send(vsRes.audioBuffer);
    }

    return res.status(503).json({
      success: false,
      error: 'VOICESTUDIO_GENERATION_FAILED',
      detail: vsRes.error || 'VoiceStudio microservice failed to synthesize',
    });
  } catch (error: any) {
    console.error('[TTS_VOICESTUDIO_ERROR]', error);
    res.status(500).json({ error: error.message || 'VoiceStudio error' });
  }
});

// Health check — shows whether Whisper STT is configured
router.get('/health', (_req: Request, res: Response) => {
  const hasWhisper = Boolean(process.env.WHISPER_API_KEY);
  res.json({
    status: 'OK',
    stt_mode: hasWhisper ? 'whisper' : 'mock',
    websocket_port: 4001,
    endpoints: {
      http: 'POST /api/v1/voice/analyze?duration_ms=N&language=vi',
      tts: 'GET /api/v1/voice/tts?text=...&lang=vi',
      websocket: 'ws://localhost:4001',
    },
  });
});

export default router;
