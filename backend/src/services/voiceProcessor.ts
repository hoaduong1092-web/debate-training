/**
 * Voice Processor — WPM Calculator, Filler Word Detector & Real-Time Signal Generator
 *
 * Stateless utility functions for computing real-time voice coaching metrics.
 * No AI calls, no external dependencies — pure TypeScript arithmetic.
 *
 * Real-time signal frames (VOICE_SIGNAL) are generated per tick and sent over
 * WebSocket to drive the floating Coach Signal Box in the frontend.
 *
 * Spec Reference: 08_VOICE_ENGINE_SPEC.md §4 (Speech Metrics)
 */

export { VoiceDspService, VoiceDspMetrics, WordTimestamp } from './voiceDspService';
import { VoiceDspService, VoiceDspMetrics, WordTimestamp } from './voiceDspService';

// ─── Types ───────────────────────────────────────────────────────────────────

/** WPM classification tiers. */
export type WpmClassification = 'OPTIMAL' | 'TOO_FAST' | 'SLIGHTLY_FAST' | 'TOO_SLOW' | 'SLIGHTLY_SLOW' | 'NO_DATA';

/** Signal severity drives badge color: 🟢 GREEN / 🟡 YELLOW / 🔴 RED */
export type SignalSeverity = 'GREEN' | 'YELLOW' | 'RED';

/**
 * Live VOICE_SIGNAL frame emitted every N seconds over WebSocket while recording.
 * Drives the floating Coach Signal Box in the frontend.
 */
export interface VoiceSignal {
  type: 'VOICE_SIGNAL';
  /** Estimated WPM based on elapsed duration + estimated word count so far. */
  wpm: number;
  /** WPM classification label. */
  classification: WpmClassification;
  /** Cumulative filler word count for this recording session. */
  filler_count: number;
  /** Filler words per minute rate (for frequency threshold). */
  filler_rate_per_min: number;
  /** Seconds elapsed in current recording. */
  elapsed_seconds: number;
  /** True if speaking ≥ 40s without pause (pause alert). */
  pause_alert: boolean;
  /** Short human-readable coaching nudge (null = all good). */
  signal_message: string | null;
  /** Overall severity for badge color. */
  severity: SignalSeverity;
}

/** Full post-recording metrics (unchanged contract). */
export interface VoiceMetrics {
  /** Words per minute (0 if duration too short to measure). */
  wpm: number;
  /** Total word count in the transcript. */
  word_count: number;
  /** Recording duration in milliseconds. */
  duration_ms: number;
  /** Number of filler words detected. */
  filler_count: number;
  /** Which filler words were found (unique list). */
  fillers_found: string[];
  /** Human-readable WPM pace label. */
  pace_label: string;
  /** Coaching tip based on WPM. */
  pace_tip: string;
}

export interface VoiceTranscriptResult {
  /** Transcribed text (from STT or mock). */
  transcript: string;
  /** Detected language ('vi' | 'en'). */
  language: string;
  /** Duration of audio in ms (from header or estimation). */
  duration_ms: number;
}

// ─── Filler Word Dictionaries ─────────────────────────────────────────────────

/**
 * Vietnamese filler / hedge words used in spoken debate.
 * Ordered by frequency — most common first.
 * Spec: 08_VOICE_ENGINE_SPEC.md §4.3
 */
export const VIETNAMESE_FILLERS: string[] = [
  // Single-syllable hesitations
  'à', 'ừ', 'ừm', 'ờ', 'ơ', 'ơm', 'ắng', 'ư',
  // Common hedges used as discourse markers
  'thì', 'mà', 'là', 'vậy', 'nhỉ', 'nhé', 'hả', 'ha',
  // Pace-filling phrases
  'kiểu', 'kiểu như', 'như là', 'đại loại', 'thật ra', 'thực ra', 'cơ bản',
  // Meaning clarifiers (spoken crutches)
  'ý mình là', 'ý là', 'tức là', 'ý tôi muốn nói',
  // Starters
  'thì là', 'mà là', 'mà thì', 'vậy thì',
];

/**
 * English filler words (for mixed-language sessions or English debate mode).
 */
export const ENGLISH_FILLERS: string[] = [
  'um', 'uh', 'er', 'ah', 'hmm',
  'like', 'you know', 'you know what i mean',
  'basically', 'actually', 'literally', 'right',
  'okay so', 'so like', 'i mean', 'sort of', 'kind of',
  'to be honest', 'honestly', 'at the end of the day',
];

// ─── WPM Thresholds ───────────────────────────────────────────────────────────

/**
 * WPM bands for debate coaching:
 *   OPTIMAL:        120–150 WPM  → GREEN
 *   SLIGHTLY_SLOW:  100–119 WPM  → YELLOW
 *   SLIGHTLY_FAST:  151–170 WPM  → YELLOW
 *   TOO_SLOW:         < 100 WPM  → RED
 *   TOO_FAST:         > 170 WPM  → RED
 */
const WPM_TOO_SLOW = 100;
const WPM_SLIGHTLY_SLOW = 120;
const WPM_OPTIMAL_MAX = 150;
const WPM_SLIGHTLY_FAST = 170;

/** Filler word frequency threshold: > 3 per minute → YELLOW warning. */
const FILLER_RATE_WARN = 3;
/** Filler word frequency threshold: > 6 per minute → RED alert. */
const FILLER_RATE_ALERT = 6;

/** Cumulative filler count: > 5 → YELLOW. */
const FILLER_COUNT_WARN = 5;
/** Cumulative filler count: > 10 → RED. */
const FILLER_COUNT_ALERT = 10;

/** Alert if speaking ≥ this many seconds without pause. */
const PAUSE_ALERT_SECONDS = 40;

// ─── WPM Classification ───────────────────────────────────────────────────────

export function classifyWpm(wpm: number): WpmClassification {
  if (wpm === 0) return 'NO_DATA';
  if (wpm < WPM_TOO_SLOW) return 'TOO_SLOW';
  if (wpm < WPM_SLIGHTLY_SLOW) return 'SLIGHTLY_SLOW';
  if (wpm <= WPM_OPTIMAL_MAX) return 'OPTIMAL';
  if (wpm <= WPM_SLIGHTLY_FAST) return 'SLIGHTLY_FAST';
  return 'TOO_FAST';
}

function wpmLabel(wpm: number, cls: WpmClassification): string {
  switch (cls) {
    case 'NO_DATA':       return 'Chưa đo được';
    case 'TOO_SLOW':      return `${wpm} WPM — Quá chậm`;
    case 'SLIGHTLY_SLOW': return `${wpm} WPM — Hơi chậm`;
    case 'OPTIMAL':       return `${wpm} WPM — Vừa vặn ✓`;
    case 'SLIGHTLY_FAST': return `${wpm} WPM — Hơi nhanh`;
    case 'TOO_FAST':      return `${wpm} WPM — Quá nhanh`;
  }
}

function wpmTip(cls: WpmClassification): string {
  switch (cls) {
    case 'NO_DATA':       return 'Ghi âm quá ngắn để đo tốc độ nói.';
    case 'TOO_SLOW':      return 'Hãy nói nhanh hơn để duy trì sự hứng thú của người nghe.';
    case 'SLIGHTLY_SLOW': return 'Tốc độ ổn, có thể tăng nhẹ để nghe cuốn hút hơn.';
    case 'OPTIMAL':       return 'Tốc độ nói lý tưởng cho tranh biện. Duy trì phong độ này!';
    case 'SLIGHTLY_FAST': return 'Hơi nhanh — hãy nhớ ngắt nghỉ để người nghe có thể theo kịp.';
    case 'TOO_FAST':      return 'Tốc độ quá cao. Làm chậm lại và nhấn mạnh các luận điểm quan trọng.';
  }
}

// ─── Real-Time Signal Generator ───────────────────────────────────────────────

/**
 * State maintained per WebSocket session for live signal computation.
 * Mutated in-place by `updateSessionState()` on each chunk/tick.
 */
export interface VoiceSessionState {
  /** Epoch ms when recording started. */
  startMs: number;
  /** Cumulative estimated word count (updated each chunk tick). */
  estimatedWords: number;
  /** Cumulative filler count across all partial transcripts. */
  fillerCount: number;
  /** Filler types seen so far. */
  fillersFound: Set<string>;
  /** Epoch ms of last detected pause (silence chunk). */
  lastPauseMs: number;
  /** Preferred language. */
  language: 'vi' | 'en' | 'mixed';
}

/** Create a fresh session state for a new recording. */
export function createSessionState(language: 'vi' | 'en' | 'mixed' = 'vi'): VoiceSessionState {
  const now = Date.now();
  return {
    startMs: now,
    estimatedWords: 0,
    fillerCount: 0,
    fillersFound: new Set(),
    lastPauseMs: now,
    language,
  };
}

/**
 * Update session state from a new chunk tick and return a VOICE_SIGNAL frame.
 *
 * Since we don't have real-time STT, WPM is estimated from elapsed duration
 * using a language-typical rate (~130 WPM for Vietnamese). Filler count
 * accumulates from text transcripts when available (e.g. from partial STT).
 *
 * @param state          Mutable session state (updated in-place)
 * @param chunkWords     Word count from any partial transcript in this chunk (0 if none)
 * @param chunkFillers   Fillers found in partial transcript for this chunk
 * @param isPause        True if this chunk was silence (resets pause timer)
 */
export function generateSignal(
  state: VoiceSessionState,
  chunkWords: number = 0,
  chunkFillers: string[] = [],
  isPause: boolean = false,
): VoiceSignal {
  const nowMs = Date.now();
  const elapsed_seconds = (nowMs - state.startMs) / 1000;
  const elapsed_minutes = elapsed_seconds / 60;

  // Update cumulative word estimate
  if (chunkWords > 0) {
    state.estimatedWords += chunkWords;
  } else if (state.estimatedWords === 0 && elapsed_seconds > 2) {
    // No STT available — estimate from elapsed time at 130 WPM typical rate
    const typicalWpm = state.language === 'en' ? 140 : 130;
    state.estimatedWords = Math.round(elapsed_minutes * typicalWpm);
  }

  // Update filler counters
  for (const f of chunkFillers) {
    state.fillerCount += 1;
    state.fillersFound.add(f);
  }

  // Pause tracking
  if (isPause) {
    state.lastPauseMs = nowMs;
  }
  const secondsSinceLastPause = (nowMs - state.lastPauseMs) / 1000;
  const pause_alert = secondsSinceLastPause >= PAUSE_ALERT_SECONDS;

  // Compute WPM
  const wpm =
    elapsed_minutes > 0.033 && state.estimatedWords > 0
      ? Math.round(state.estimatedWords / elapsed_minutes)
      : 0;

  const classification = classifyWpm(wpm);

  // Filler rate (per minute)
  const filler_rate_per_min =
    elapsed_minutes > 0 ? Math.round((state.fillerCount / elapsed_minutes) * 10) / 10 : 0;

  // Determine severity and compose signal message
  const { severity, signal_message } = computeSignal(
    classification,
    state.fillerCount,
    filler_rate_per_min,
    pause_alert,
    elapsed_seconds,
  );

  return {
    type: 'VOICE_SIGNAL',
    wpm,
    classification,
    filler_count: state.fillerCount,
    filler_rate_per_min,
    elapsed_seconds: Math.round(elapsed_seconds),
    pause_alert,
    signal_message,
    severity,
  };
}

/** Derive severity + signal message from all active conditions. */
function computeSignal(
  cls: WpmClassification,
  fillerCount: number,
  fillerRate: number,
  pauseAlert: boolean,
  elapsedSeconds: number,
): { severity: SignalSeverity; signal_message: string | null } {
  const issues: Array<{ severity: SignalSeverity; msg: string }> = [];

  // WPM issues
  if (cls === 'TOO_FAST') {
    issues.push({ severity: 'RED', msg: '🔴 Đang nói quá nhanh — hãy chậm lại!' });
  } else if (cls === 'TOO_SLOW') {
    issues.push({ severity: 'RED', msg: '🔴 Tốc độ quá chậm — hãy nói nhanh hơn.' });
  } else if (cls === 'SLIGHTLY_FAST') {
    issues.push({ severity: 'YELLOW', msg: '🟡 Hơi nhanh — nhớ nhấn mạnh luận điểm.' });
  } else if (cls === 'SLIGHTLY_SLOW') {
    issues.push({ severity: 'YELLOW', msg: '🟡 Hơi chậm — tăng tốc một chút.' });
  }

  // Filler word alerts
  if (fillerCount >= FILLER_COUNT_ALERT || fillerRate >= FILLER_RATE_ALERT) {
    issues.push({ severity: 'RED', msg: `🔴 Từ đệm nhiều (${fillerCount} lần) — cần cắt giảm.` });
  } else if (fillerCount >= FILLER_COUNT_WARN || fillerRate >= FILLER_RATE_WARN) {
    issues.push({ severity: 'YELLOW', msg: `🟡 Đang dùng nhiều từ đệm (${fillerCount} lần).` });
  }

  // Pause alert (only after minimum 15s to avoid false positives)
  if (pauseAlert && elapsedSeconds >= 15) {
    issues.push({ severity: 'YELLOW', msg: '🟡 Đã nói liên tục > 40 giây — hãy dừng nghỉ.' });
  }

  if (issues.length === 0) {
    return { severity: 'GREEN', signal_message: null };
  }

  // Highest severity wins
  const hasRed = issues.some((i) => i.severity === 'RED');
  const severity: SignalSeverity = hasRed ? 'RED' : 'YELLOW';
  // Show first (highest priority) issue message
  const signal_message = issues[0]?.msg ?? null;
  return { severity, signal_message };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Count words in a text string. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Detect filler words in transcript text.
 * Case-insensitive, whole-word matching for single tokens;
 * substring matching for multi-word phrases.
 */
export function detectFillers(
  text: string,
  language: 'vi' | 'en' | 'mixed' = 'vi',
): { count: number; found: string[] } {
  const lower = text.toLowerCase();
  const allFillers =
    language === 'en'
      ? ENGLISH_FILLERS
      : language === 'mixed'
        ? [...VIETNAMESE_FILLERS, ...ENGLISH_FILLERS]
        : VIETNAMESE_FILLERS;

  const found = new Set<string>();
  let count = 0;

  for (const filler of allFillers) {
    const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![\\wÀ-ỹ])${escaped}(?![\\wÀ-ỹ])`, 'gi');
    const matches = lower.match(pattern);
    if (matches) {
      count += matches.length;
      found.add(filler);
    }
  }

  return { count, found: Array.from(found) };
}

/**
 * Compute full VoiceMetrics from a transcript + duration.
 * Called once after recording ends (not during live streaming).
 */
export function computeVoiceMetrics(
  transcript: string,
  duration_ms: number,
  language: 'vi' | 'en' | 'mixed' = 'vi',
): VoiceMetrics {
  const word_count = countWords(transcript);
  const minutes = duration_ms / 60_000;

  const wpm =
    minutes > 0.033 && word_count > 0
      ? Math.round(word_count / minutes)
      : 0;

  const { count: filler_count, found: fillers_found } = detectFillers(transcript, language);
  const cls = classifyWpm(wpm);

  return {
    wpm,
    word_count,
    duration_ms,
    filler_count,
    fillers_found,
    pace_label: wpmLabel(wpm, cls),
    pace_tip: wpmTip(cls),
  };
}

/**
 * Mock STT transcription for local/offline development.
 * Returns a plausible Vietnamese debate response when no Whisper key is configured.
 */
export function mockTranscribe(duration_ms: number): VoiceTranscriptResult {
  const estimated_words = Math.round((duration_ms / 60_000) * 130);
  const sample =
    'Theo tôi đồng phục giúp học sinh cảm thấy bình đẳng hơn và tập trung vào việc học thay vì lo lắng về trang phục mỗi ngày';
  const words = sample.split(' ');

  const transcript = Array.from(
    { length: Math.ceil(estimated_words / words.length) },
    () => sample,
  )
    .join(' ')
    .split(' ')
    .slice(0, estimated_words)
    .join(' ');

  return { transcript, language: 'vi', duration_ms };
}
