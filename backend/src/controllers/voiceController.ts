/**
 * Voice Controller — HTTP + WebSocket Audio Processing Endpoint
 *
 * HTTP POST /api/v1/voice/analyze
 *   Accepts raw audio blob, returns VoiceMetrics JSON after recording ends.
 *
 * WebSocket ws://host:4001
 *   Live audio chunk streaming with server-side 15-minute / entitlement timer enforcement.
 *   Emits VOICE_SIGNAL frames every SIGNAL_INTERVAL_MS while recording is active.
 *   Emits VOICE_SESSION_EXPIRING_SOON at (maxAllowedMs - 30s).
 *   Emits VOICE_SESSION_CAP_REACHED at maxAllowedMs and enforces server-side cutoff.
 *
 * Spec Reference: docs/VOICE_QUOTA_CONTRACT_v1.0.md & 08_VOICE_ENGINE_SPEC.md
 * Phase: B5 — Server-Side 15-Minute Cap & Boundary Guards
 */

import { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { PrismaClient } from '@prisma/client';
import {
  computeVoiceMetrics,
  VoiceMetrics,
  VoiceSignal,
  VoiceSessionState,
  createSessionState,
  generateSignal,
} from '../services/voiceProcessor.js';
import { transcribeBuffer, getWhisperStatus } from '../services/whisperClient.js';
import { VoiceStudioClient } from '../services/voiceStudioClient.js';
import { VoiceSessionService, MAX_SESSION_DURATION_MS } from '../services/voiceSessionService.js';
import {
  VoiceSessionExpiringSoonMessage,
  VoiceSessionCapReachedMessage,
} from '../types/voiceSessionTypes.js';

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

/** Emit a VOICE_SIGNAL frame every 3 seconds while recording. */
const SIGNAL_INTERVAL_MS = 3_000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoiceAnalyzeResponse {
  success: boolean;
  transcript: string;
  metrics: VoiceMetrics;
  stt_source: 'voicestudio' | 'whisper' | 'mock';
}

interface WsIncomingMessage {
  type: 'start' | 'chunk' | 'pause' | 'end' | 'stop' | 'ping';
  /** Canonical VoiceSession ID */
  voiceSessionId?: string;
  voice_session_id?: string;
  userId?: string;
  user_id?: string;
  maxAllowedMs?: number;
  max_allowed_ms?: number;
  /** Base64-encoded audio chunk (for type='chunk'). */
  audio?: string;
  /** Total recording duration in ms (for type='end' or 'stop'). */
  duration_ms?: number;
  durationMs?: number;
  /** Session language (for type='start'). */
  language?: 'vi' | 'en' | 'mixed';
}

type WsOutgoingMessage =
  | { type: 'ready' }
  | { type: 'pong' }
  | { type: 'error'; error: string }
  | { type: 'metrics'; metrics: VoiceMetrics; transcript: string; stt_source: 'voicestudio' | 'whisper' | 'mock' }
  | VoiceSessionExpiringSoonMessage
  | VoiceSessionCapReachedMessage
  | VoiceSignal;

// ─── STT Dispatcher ──────────────────────────────────────────────────────────

/**
 * Routes audio transcription to Whisper API (if configured) or mock STT.
 */
async function transcribeAudio(
  audioBuffer: Buffer | null,
  duration_ms: number,
  language: 'vi' | 'en' | 'mixed',
): Promise<{ transcript: string; stt_source: 'voicestudio' | 'whisper' | 'mock' }> {
  const result = await transcribeBuffer(audioBuffer, duration_ms, language);

  if (result.fallback_reason) {
    console.warn(`[VOICE_STT] Fallback active — reason: ${result.fallback_reason}`);
  }

  return { transcript: result.transcript, stt_source: result.stt_source };
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────

export async function analyzeVoice(req: Request, res: Response): Promise<void> {
  try {
    const rawDuration = parseInt(String(req.query['duration_ms'] ?? '0'), 10);
    const duration_ms = rawDuration >= 500 ? rawDuration : 3000;
    const language = (['vi', 'en', 'mixed'].includes(String(req.query['language']))
      ? String(req.query['language'])
      : 'vi') as 'vi' | 'en' | 'mixed';

    const audioBuffer: Buffer | null =
      Buffer.isBuffer(req.body) && (req.body as Buffer).length > 0
        ? (req.body as Buffer)
        : null;

    // 1. Try local VoiceStudio microservice first
    if (audioBuffer) {
      try {
        const vsResult = await VoiceStudioClient.analyzeVoice(audioBuffer, duration_ms, language);
        if (
          vsResult.success &&
          vsResult.transcript &&
          vsResult.transcript.trim().length > 0 &&
          !vsResult.transcript.includes('Local VoiceStudio')
        ) {
          const metrics = computeVoiceMetrics(vsResult.transcript, duration_ms, language);
          if (typeof vsResult.wpm === 'number' && vsResult.wpm > 0) {
            metrics.wpm = vsResult.wpm;
          }
          if (typeof vsResult.fillerCount === 'number') {
            metrics.filler_count = vsResult.fillerCount;
          }
          console.info('[VOICE_ANALYZE_VOICESTUDIO]', {
            duration_ms,
            wpm: metrics.wpm,
            filler_count: metrics.filler_count,
            stt_source: 'voicestudio',
          });
          res.json({
            success: true,
            transcript: vsResult.transcript,
            metrics,
            stt_source: 'voicestudio',
          });
          return;
        }
      } catch (e: any) {
        console.warn('[VOICE_ANALYZE] VoiceStudio analyze offline, fallback to Whisper:', e.message);
      }
    }

    const { transcript, stt_source } = await transcribeAudio(audioBuffer, duration_ms, language);
    const metrics = computeVoiceMetrics(transcript, duration_ms, language);

    const responseBody: VoiceAnalyzeResponse = { success: true, transcript, metrics, stt_source };

    console.info('[VOICE_ANALYZE]', {
      duration_ms,
      wpm: metrics.wpm,
      word_count: metrics.word_count,
      filler_count: metrics.filler_count,
      stt_source,
    });

    res.json(responseBody);
  } catch (err) {
    console.error('[VOICE_ANALYZE_ERROR]', err);
    res.status(500).json({ success: false, error: 'Voice analysis failed.' });
  }
}

// ─── WebSocket Session Stream Manager ─────────────────────────────────────────

/**
 * Per-connection live audio stream session with Server-Side Cap & Boundary Timers.
 */
export class WsVoiceStream {
  readonly audioChunks: string[] = [];
  state: VoiceSessionState;
  voiceSessionId: string | null = null;
  userId: string | null = null;
  maxAllowedMs: number = MAX_SESSION_DURATION_MS;

  private signalTimer: ReturnType<typeof setInterval> | null = null;
  private warningTimer: ReturnType<typeof setTimeout> | null = null;
  private cutoffTimer: ReturnType<typeof setTimeout> | null = null;
  private ws: WebSocket;
  private active = false;

  constructor(
    ws: WebSocket,
    language: 'vi' | 'en' | 'mixed' = 'vi',
    voiceSessionId: string | null = null,
    userId: string | null = null,
    maxAllowedMs: number = MAX_SESSION_DURATION_MS,
  ) {
    this.ws = ws;
    this.state = createSessionState(language);
    this.voiceSessionId = voiceSessionId;
    this.userId = userId;
    this.maxAllowedMs = Math.min(MAX_SESSION_DURATION_MS, Math.max(0, maxAllowedMs));
  }

  /**
   * Attaches server-side lifecycle timers to the active VoiceSession.
   * Emits VOICE_SESSION_EXPIRING_SOON at (maxAllowedMs - 30s) if maxAllowedMs > 30s.
   * Emits VOICE_SESSION_CAP_REACHED and terminates stream at maxAllowedMs.
   */
  attachSession(
    voiceSessionId: string,
    maxAllowedMs: number = MAX_SESSION_DURATION_MS,
    userId: string | null = null,
  ): void {
    this.clearTimers();
    this.voiceSessionId = voiceSessionId;
    if (userId) this.userId = userId;
    this.maxAllowedMs = Math.min(MAX_SESSION_DURATION_MS, Math.max(0, maxAllowedMs));

    // 1. Schedule 30-Second Warning (Invariant B5-09)
    const warningOffsetMs = this.maxAllowedMs - 30_000;
    if (warningOffsetMs > 0) {
      this.warningTimer = setTimeout(() => {
        if (this.ws.readyState === WebSocket.OPEN && this.voiceSessionId) {
          const warningMsg: VoiceSessionExpiringSoonMessage = {
            type: 'VOICE_SESSION_EXPIRING_SOON',
            voiceSessionId: this.voiceSessionId,
            maxAllowedMs: this.maxAllowedMs,
            remainingMs: 30_000,
          };
          this.ws.send(JSON.stringify(warningMsg));
        }
      }, warningOffsetMs);
    }

    // 2. Schedule Hard Cutoff Timer (Invariant B5-10)
    this.cutoffTimer = setTimeout(async () => {
      await this.triggerServerCutoff();
    }, this.maxAllowedMs);
  }

  /** Clears all background warning and cutoff timers to prevent leaks. */
  clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.cutoffTimer) {
      clearTimeout(this.cutoffTimer);
      this.cutoffTimer = null;
    }
  }

  /**
   * Enforces server cutoff when session duration reaches maxAllowedMs.
   * Emits VOICE_SESSION_CAP_REACHED, finalizes session, and cleanly closes socket.
   */
  async triggerServerCutoff(): Promise<void> {
    this.stopSignalEmitter();
    this.clearTimers();

    if (this.ws.readyState === WebSocket.OPEN && this.voiceSessionId) {
      const capMsg: VoiceSessionCapReachedMessage = {
        type: 'VOICE_SESSION_CAP_REACHED',
        voiceSessionId: this.voiceSessionId,
        maxAllowedMs: this.maxAllowedMs,
        reason: this.maxAllowedMs >= MAX_SESSION_DURATION_MS ? 'TECHNICAL_15M_CAP' : 'ENTITLEMENT_EXHAUSTED',
      };
      try {
        this.ws.send(JSON.stringify(capMsg));
      } catch {}
    }

    // Automatic server-side finalization
    if (this.voiceSessionId && this.userId) {
      try {
        await VoiceSessionService.finalizeVoiceSession({
          voiceSessionId: this.voiceSessionId,
          userId: this.userId,
          reason: 'SERVER_CUTOFF',
        });
      } catch (err: any) {
        console.warn('[VOICE_WS_CUTOFF_FINALIZE_WARN]', err?.message);
      }
    }

    // Gracefully close WebSocket with normal code 1000
    try {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'VOICE_SESSION_CAP_REACHED');
      }
    } catch {}
  }

  /**
   * Handles unexpected client disconnect by triggering server-side finalization.
   */
  async handleDisconnect(): Promise<void> {
    this.stopSignalEmitter();
    this.clearTimers();

    if (this.voiceSessionId && this.userId) {
      try {
        await VoiceSessionService.finalizeVoiceSession({
          voiceSessionId: this.voiceSessionId,
          userId: this.userId,
          reason: 'CLIENT_DISCONNECT',
        });
      } catch (err: any) {
        // Idempotency handles already-finalized sessions safely
      }
    }
  }

  /** Begin emitting live VOICE_SIGNAL frames every SIGNAL_INTERVAL_MS. */
  startSignalEmitter(): void {
    if (this.active) return;
    this.active = true;
    this.signalTimer = setInterval(() => {
      if (this.ws.readyState !== WebSocket.OPEN) {
        this.stopSignalEmitter();
        return;
      }
      const signal = generateSignal(this.state);
      const out: WsOutgoingMessage = signal;
      this.ws.send(JSON.stringify(out));
    }, SIGNAL_INTERVAL_MS);
  }

  /** Stop signal emitter (on 'end', 'close', or error). */
  stopSignalEmitter(): void {
    this.active = false;
    if (this.signalTimer) {
      clearInterval(this.signalTimer);
      this.signalTimer = null;
    }
  }

  /** Mark a pause so the 40-second continuous-speech timer resets. */
  markPause(): void {
    this.state.lastPauseMs = Date.now();
  }

  /** Reset for next recording (keep language preference). */
  reset(
    language?: 'vi' | 'en' | 'mixed',
    voiceSessionId?: string | null,
    userId?: string | null,
    maxAllowedMs?: number,
  ): void {
    this.stopSignalEmitter();
    this.clearTimers();
    this.audioChunks.length = 0;
    this.state = createSessionState(language ?? this.state.language);
    if (voiceSessionId !== undefined) {
      this.voiceSessionId = voiceSessionId;
    }
    if (userId !== undefined) {
      this.userId = userId;
    }
    if (maxAllowedMs !== undefined) {
      this.maxAllowedMs = Math.min(MAX_SESSION_DURATION_MS, Math.max(0, maxAllowedMs));
    }
    if (this.voiceSessionId) {
      this.attachSession(this.voiceSessionId, this.maxAllowedMs, this.userId);
    }
  }

  destroy(): void {
    this.stopSignalEmitter();
    this.clearTimers();
    this.audioChunks.length = 0;
  }
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────

export function createVoiceWebSocketServer(port: number = 4001): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on('listening', () => {
    const status = getWhisperStatus();
    console.info(`[VOICE_WS] WebSocket server listening on ws://localhost:${port}`);
    console.info(`[VOICE_WS] VOICE_SIGNAL emitted every ${SIGNAL_INTERVAL_MS / 1000}s per session`);
    console.info('[VOICE_STT] Engine:', status.engine);
    console.info('[VOICE_STT] Model:', status.model);
    console.info('[VOICE_STT] Key configured:', status.configured ? 'YES (production mode)' : 'NO (mock mode)');
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.info('[VOICE_WS] Client connected');

    // Extract voiceSessionId and userId from query parameters if provided
    let queryVoiceSessionId: string | null = null;
    let queryUserId: string | null = null;
    let queryMaxAllowedMs: number = MAX_SESSION_DURATION_MS;

    try {
      const url = new URL(req.url ?? '', `http://${req.headers.host || 'localhost'}`);
      queryVoiceSessionId = url.searchParams.get('voiceSessionId') || url.searchParams.get('voice_session_id');
      queryUserId = url.searchParams.get('userId') || url.searchParams.get('user_id');
      const maxMsParam = url.searchParams.get('maxAllowedMs') || url.searchParams.get('max_allowed_ms');
      if (maxMsParam) {
        const parsed = parseInt(maxMsParam, 10);
        if (Number.isFinite(parsed) && parsed > 0) queryMaxAllowedMs = parsed;
      }
    } catch {}

    const stream = new WsVoiceStream(ws, 'vi', queryVoiceSessionId, queryUserId, queryMaxAllowedMs);
    if (queryVoiceSessionId) {
      stream.attachSession(queryVoiceSessionId, queryMaxAllowedMs, queryUserId);
    }

    const send = (msg: WsOutgoingMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    // Notify client ready
    send({ type: 'ready' });

    ws.on('message', async (data: Buffer | string) => {
      let message: WsIncomingMessage;
      try {
        message = JSON.parse(
          typeof data === 'string' ? data : data.toString('utf8'),
        ) as WsIncomingMessage;
      } catch {
        send({ type: 'error', error: 'Invalid JSON message' });
        return;
      }

      switch (message.type) {
        case 'ping': {
          send({ type: 'pong' });
          break;
        }

        case 'start': {
          const lang = (message.language ?? 'vi') as 'vi' | 'en' | 'mixed';
          const incomingVoiceSessionId = message.voiceSessionId || message.voice_session_id || queryVoiceSessionId;
          const incomingUserId = message.userId || message.user_id || queryUserId;
          const incomingMaxAllowedMs = message.maxAllowedMs || message.max_allowed_ms || queryMaxAllowedMs;

          stream.reset(lang, incomingVoiceSessionId, incomingUserId, incomingMaxAllowedMs);
          stream.startSignalEmitter();
          console.info(`[VOICE_WS] Recording started (language: ${lang}, voiceSessionId: ${stream.voiceSessionId || 'none'})`);
          break;
        }

        case 'chunk': {
          if (message.audio) {
            stream.audioChunks.push(message.audio);
          }
          if (!stream['active']) {
            stream.startSignalEmitter();
          }
          break;
        }

        case 'pause': {
          stream.markPause();
          break;
        }

        case 'stop':
        case 'end': {
          stream.stopSignalEmitter();
          stream.clearTimers();

          const duration_ms =
            message.duration_ms ??
            message.durationMs ??
            (stream.state.startMs ? Date.now() - stream.state.startMs : 3000);

          if (duration_ms < 500) {
            send({ type: 'error', error: 'Recording too short (< 500ms)' });
            break;
          }

          // Reconstruct audio buffer
          let audioBuffer: Buffer | null = null;
          if (stream.audioChunks.length > 0) {
            try {
              audioBuffer = Buffer.concat(
                stream.audioChunks.map((chunk) => Buffer.from(chunk, 'base64')),
              );
            } catch {
              console.warn('[VOICE_WS] Audio decode failed — using mock STT');
            }
          }

          stream.audioChunks.length = 0;

          try {
            const lang = stream.state.language;
            const { transcript, stt_source } = await transcribeAudio(
              audioBuffer,
              duration_ms,
              lang,
            );
            const metrics = computeVoiceMetrics(transcript, duration_ms, lang);

            console.info('[VOICE_WS_DONE]', {
              duration_ms,
              wpm: metrics.wpm,
              filler_count: metrics.filler_count,
              stt_source,
              voiceSessionId: stream.voiceSessionId,
            });

            send({ type: 'metrics', metrics, transcript, stt_source });
          } catch (err) {
            console.error('[VOICE_WS_ERROR]', err);
            send({ type: 'error', error: 'Voice processing failed' });
          }
          break;
        }

        default: {
          send({ type: 'error', error: 'Unknown message type' });
        }
      }
    });

    ws.on('close', async () => {
      console.info('[VOICE_WS] Client disconnected');
      await stream.handleDisconnect();
      stream.destroy();
    });

    ws.on('error', (err) => {
      console.error('[VOICE_WS_CLIENT_ERROR]', err.message);
      stream.destroy();
    });
  });

  wss.on('error', (err) => {
    console.error('[VOICE_WS_SERVER_ERROR]', err.message);
  });

  return wss;
}
