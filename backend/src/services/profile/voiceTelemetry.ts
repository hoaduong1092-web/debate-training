/**
 * Voice Telemetry Analytics Engine (v15.0.0)
 *
 * Source of Truth: 08_VOICE_ENGINE_SPEC.md & Blueprint V15.0
 * Pure deterministic arithmetic — zero LLM calls.
 * Implements 5-zone WPM boundaries, duration-weighted average WPM,
 * optimal band percentages, filler rate metrics, and pause stability scoring.
 */

export type Wpm5Zone = 'SLOW' | 'MODERATE_SLOW' | 'OPTIMAL' | 'MODERATE_FAST' | 'FAST';
export type Wpm3ZonePresentation = 'SLOW' | 'OPTIMAL' | 'FAST';

export interface ExtractedVoiceMetrics {
  wpm: number;
  fillerCount: number;
  durationMs: number;
  pauseRatio?: number;
  tier?: string | null;
  stt_source?: string | null;
}

export interface WpmHistoryPoint {
  sessionId: string;
  date: string;
  topicTitle: string;
  avgWpm: number;
  zone: Wpm5Zone;
  paceZone: Wpm3ZonePresentation;
  fillerRate: number; // fillers per minute
  fillerCount: number;
  pauseRatio: number;
  durationSeconds: number;
  hasVoiceTelemetry: boolean;
}

export interface VoiceAnalyticsResult {
  hasVoiceTelemetry: boolean;
  averageWpm: number;
  optimalBandPercentage: number;
  totalVoiceSessions: number;
  averageFillerRate: number;
  averagePauseRatio: number;
  wpmHistory: WpmHistoryPoint[];
}

/**
 * 5-Zone WPM Classification Contract (Section 2-B):
 *   < 100:       SLOW
 *   100 - 119:   MODERATE_SLOW
 *   120 - 150:   OPTIMAL
 *   151 - 170:   MODERATE_FAST
 *   > 170:       FAST
 */
export function classifyWpm5Zone(wpm: number): Wpm5Zone {
  if (wpm < 100) return 'SLOW';
  if (wpm <= 119) return 'MODERATE_SLOW';
  if (wpm <= 150) return 'OPTIMAL';
  if (wpm <= 170) return 'MODERATE_FAST';
  return 'FAST';
}

/**
 * Maps 5-zone telemetry to 3-tier presentation (Section 2-B):
 *   SLOW & MODERATE_SLOW -> SLOW
 *   OPTIMAL              -> OPTIMAL
 *   MODERATE_FAST & FAST -> FAST
 */
export function mapToPresentationZone(zone: Wpm5Zone): Wpm3ZonePresentation {
  if (zone === 'SLOW' || zone === 'MODERATE_SLOW') return 'SLOW';
  if (zone === 'OPTIMAL') return 'OPTIMAL';
  return 'FAST';
}

/**
 * Locked Pause Stability Score Formula (Section 2-E):
 *   100 when 10% <= pauseRatio <= 25%
 *   Below 10%: 100 - (10 - pauseRatio) * 2
 *   Above 25%: 100 - (pauseRatio - 25) * 2
 *   Clamped to [0, 100]
 */
export function calculatePauseStabilityScore(pauseRatioPercent: number): number {
  let rawScore = 100;
  if (pauseRatioPercent < 10) {
    rawScore = 100 - (10 - pauseRatioPercent) * 2;
  } else if (pauseRatioPercent > 25) {
    rawScore = 100 - (pauseRatioPercent - 25) * 2;
  }
  return Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100));
}

/**
 * Extracts voice telemetry metadata stored in transcript fallaciesDetected array.
 */
export function extractVoiceFromTranscript(fallaciesDetected: unknown): ExtractedVoiceMetrics | null {
  if (!fallaciesDetected || !Array.isArray(fallaciesDetected)) return null;

  for (const item of fallaciesDetected) {
    if (typeof item === 'string' && item.startsWith('__voice__')) {
      try {
        const parsed = JSON.parse(item.slice(9));
        if (typeof parsed.wpm === 'number') {
          return {
            wpm: parsed.wpm,
            fillerCount: typeof parsed.filler_count === 'number' ? parsed.filler_count : (parsed.fillerCount ?? 0),
            durationMs: typeof parsed.duration_ms === 'number' ? parsed.duration_ms : (parsed.durationMs ?? 0),
            pauseRatio: typeof parsed.pause_ratio === 'number' ? parsed.pause_ratio : (parsed.pauseRatio ?? 15),
            tier: parsed.tier ?? null,
            stt_source: parsed.stt_source ?? null,
          };
        }
      } catch {}
    }
  }
  return null;
}

export interface SessionWithTranscripts {
  id: string;
  topic: string;
  createdAt: Date | string;
  scoreTotal?: any;
  inputMode?: string;
  transcripts?: Array<{
    speakerType: string;
    fallaciesDetected?: unknown;
    textContent?: string;
    createdAt?: Date | string;
  }>;
}

/**
 * Processes sessions into a comprehensive VoiceAnalyticsResult.
 */
export function analyzeVoiceTelemetry(sessions: SessionWithTranscripts[]): VoiceAnalyticsResult {
  const wpmHistory: WpmHistoryPoint[] = [];

  let totalWeightedWpmSum = 0;
  let totalDurationMsSum = 0;
  let optimalSessionsCount = 0;
  let voiceSessionsCount = 0;
  let totalFillerRateSum = 0;
  let totalPauseRatioSum = 0;

  for (const session of sessions) {
    const userTranscripts = (session.transcripts || []).filter(t => t.speakerType === 'user');
    
    // Check if any transcript has voice telemetry
    let sessionWpmSum = 0;
    let sessionDurationMs = 0;
    let sessionFillerCount = 0;
    let sessionPauseRatioSum = 0;
    let voiceTurnsCount = 0;

    for (const ut of userTranscripts) {
      const voice = extractVoiceFromTranscript(ut.fallaciesDetected);
      if (voice && voice.wpm > 0) {
        voiceTurnsCount++;
        sessionWpmSum += voice.wpm * Math.max(1000, voice.durationMs);
        sessionDurationMs += Math.max(1000, voice.durationMs);
        sessionFillerCount += voice.fillerCount;
        sessionPauseRatioSum += voice.pauseRatio ?? 15;
      }
    }

    const hasVoice = voiceTurnsCount > 0;
    let avgWpm = 0;
    let durationSeconds = 0;
    let fillerRate = 0;
    let pauseRatio = 15;

    if (hasVoice && sessionDurationMs > 0) {
      voiceSessionsCount++;
      avgWpm = Math.round(sessionWpmSum / sessionDurationMs);
      durationSeconds = Math.round(sessionDurationMs / 1000);
      const durationMinutes = durationSeconds / 60;
      fillerRate = durationMinutes > 0 ? +(sessionFillerCount / durationMinutes).toFixed(1) : 0;
      pauseRatio = Math.round(sessionPauseRatioSum / voiceTurnsCount);

      totalWeightedWpmSum += avgWpm * sessionDurationMs;
      totalDurationMsSum += sessionDurationMs;
      totalFillerRateSum += fillerRate;
      totalPauseRatioSum += pauseRatio;

      if (avgWpm >= 120 && avgWpm <= 150) {
        optimalSessionsCount++;
      }
    } else {
      // Estimate baseline from text words if needed or mark no voice
      const totalWords = userTranscripts.reduce((acc, curr) => acc + (curr.textContent ? curr.textContent.trim().split(/\s+/).length : 0), 0);
      avgWpm = totalWords > 0 ? 130 : 0; // Fallback optimal baseline
      durationSeconds = userTranscripts.length * 60;
      fillerRate = 0;
      pauseRatio = 15;
    }

    const zone = classifyWpm5Zone(avgWpm);
    const paceZone = mapToPresentationZone(zone);

    wpmHistory.push({
      sessionId: session.id,
      date: new Date(session.createdAt).toISOString(),
      topicTitle: session.topic,
      avgWpm,
      zone,
      paceZone,
      fillerRate,
      fillerCount: sessionFillerCount,
      pauseRatio,
      durationSeconds,
      hasVoiceTelemetry: hasVoice,
    });
  }

  const averageWpm = totalDurationMsSum > 0 ? Math.round(totalWeightedWpmSum / totalDurationMsSum) : (voiceSessionsCount > 0 ? 135 : 0);
  const optimalBandPercentage = voiceSessionsCount > 0 ? Math.round((optimalSessionsCount / voiceSessionsCount) * 100) : 0;
  const averageFillerRate = voiceSessionsCount > 0 ? +(totalFillerRateSum / voiceSessionsCount).toFixed(1) : 0;
  const averagePauseRatio = voiceSessionsCount > 0 ? Math.round(totalPauseRatioSum / voiceSessionsCount) : 15;

  return {
    hasVoiceTelemetry: voiceSessionsCount > 0,
    averageWpm,
    optimalBandPercentage,
    totalVoiceSessions: voiceSessionsCount,
    averageFillerRate,
    averagePauseRatio,
    wpmHistory,
  };
}
