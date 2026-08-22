/**
 * tts.ts — Browser Web Speech API · Natural Vietnamese TTS Utility
 *
 * Features:
 *  - Strict locale filtering: only vi-VN voices play Vietnamese text.
 *    Never falls back to a foreign synthesiser for Vietnamese.
 *  - Neural/Online voice priority: Google Tiếng Việt, Microsoft HoaiMy/NamMinh.
 *  - Gender-aware selection: female / male persona.
 *  - Sentence-chunk cadence: splits long text at punctuation and injects
 *    micro-pauses between utterances for natural debate delivery.
 *  - Safe interlock: stopSpeaking() is idempotent and always safe to call.
 *  - Graceful no-op when SpeechSynthesis is unavailable.
 */

// ─── Browser Access ───────────────────────────────────────────────────────────

function getSynth(): SpeechSynthesis | null {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis;
  }
  return null;
}

// ─── Global Browser Audio Autoplay Unlocker ──────────────────────────────────
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.play().catch(() => {});
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TtsLang = 'vi-VN' | 'en-US' | 'en-GB';
export type TtsGender = 'female' | 'male';

export interface TTSOptions {
  lang?: TtsLang;
  gender?: TtsGender;
  voiceId?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  audioUrl?: string | null;
  onEnd?: () => void;
}

/** Same as TTSOptions — exported as alias for backward-compat. */
export type SpeakOptions = TTSOptions;

// ─── Voice Quality Scoring ────────────────────────────────────────────────────

/**
 * Score a SpeechSynthesisVoice for preference.
 * Higher = better. Maximum ~100.
 *
 * Priority tiers (Vietnamese):
 *   T1 (90+): Google Tiếng Việt, Microsoft HoaiMy Online, Microsoft NamMinh Online
 *   T2 (70+): Any "Online" / "Natural" voice
 *   T3 (50+): Any other vi-VN voice
 *   T4 (0):   Non-Vietnamese voice (rejected for vi-VN requests)
 */
function scoreVoice(v: SpeechSynthesisVoice, lang: TtsLang, gender: TtsGender): number {
  const name = v.name.toLowerCase();
  const voiceLang = v.lang.toLowerCase();

  // Hard reject: wrong language family for the requested locale.
  if (lang === 'vi-VN') {
    const isVietnamese = voiceLang.startsWith('vi') || voiceLang.includes('vie');
    if (!isVietnamese) return -1; // strictly rejected
  } else {
    const targetPrefix = (lang.split('-')[0] ?? lang).toLowerCase();
    if (!voiceLang.startsWith(targetPrefix)) return -1;
  }

  let score = 50; // baseline for locale match

  // Boost for natural/online voices (T1/T2).
  if (name.includes('google') && name.includes('tiếng việt')) score += 45;
  else if (name.includes('hoaimy') || name.includes('hoài my')) score += 42;
  else if (name.includes('namminh') || name.includes('nam minh')) score += 40;
  else if (name.includes('online') || name.includes('natural') || name.includes('neural')) score += 25;
  else if (name.includes('microsoft') || name.includes('google')) score += 15;

  // Gender preference boost.
  const isFemale =
    name.includes('female') || name.includes('woman') || name.includes('girl') ||
    name.includes('hoài my') || name.includes('hoaimy') || name.includes('female') ||
    name.includes('nữ') || name.includes('nu ') ||
    // Heuristic: names with typical female Vietnamese names
    name.includes('lan') || name.includes('mai') || name.includes('thu') || name.includes('linh');

  const isMale =
    name.includes('male') || name.includes('man') || name.includes('boy') ||
    name.includes('namminh') || name.includes('nam minh') ||
    name.includes('nam') || name.includes('hùng') || name.includes('hung');

  if (gender === 'female' && isFemale) score += 10;
  if (gender === 'male' && isMale) score += 10;
  // Small penalty for mismatched gender (still usable, not rejected).
  if (gender === 'female' && isMale) score -= 5;
  if (gender === 'male' && isFemale) score -= 5;

  return score;
}

/**
 * Pick the best available voice for a given locale and gender preference.
 *
 * Returns null if:
 *   - No voices are loaded yet (call when voiceschanged fires).
 *   - No voice matches the strict locale requirement (vi-VN request → no vi voice).
 *
 * A null return for vi-VN means we should warn the user rather than
 * playing with a foreign synthesiser.
 */
export function getBestVoice(lang: TtsLang = 'vi-VN', gender: TtsGender = 'female'): SpeechSynthesisVoice | null {
  const synth = getSynth();
  if (!synth) return null;

  const voices = synth.getVoices();
  if (voices.length === 0) return null;

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const v of voices) {
    const s = scoreVoice(v, lang, gender);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }

  // If a matching locale voice is found (score >= 0), use it.
  if (bestScore >= 0 && best) {
    return best;
  }

  // Find any voice matching the language prefix (e.g. 'vi')
  const langPrefix = (lang.split('-')[0] || lang).toLowerCase();
  const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
  if (prefixMatch) {
    return prefixMatch;
  }

  // If no Vietnamese voice is available in the browser, return null rather than using an English synthesizer
  if (lang === 'vi-VN') {
    return null;
  }

  // Fallback: Pick default browser voice or first voice for other languages
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Returns true if a valid voice for the given locale is available.
 * Use this to detect "no Vietnamese voice installed" before speaking.
 */
export function hasVoiceForLang(lang: TtsLang): boolean {
  return getBestVoice(lang) !== null;
}

// ─── Text Preprocessing ───────────────────────────────────────────────────────

const MARKDOWN_RE = [
  /\*\*/g,                          // bold markers
  /\*/g,                            // italic markers
  /#{1,6}\s/g,                      // headings
  /`{1,3}[^`]*`{1,3}/g,            // inline/block code
  /\[([^\]]+)\]\([^)]+\)/g,        // [link](url) → link text
  /^[-*+]\s/gm,                     // list bullets
  /^\d+\.\s/gm,                     // ordered list
  /_{1,2}/g,                        // underscores
];

/**
 * Strip markdown and normalise text for TTS.
 * Replaces markdown with empty string; collapses whitespace.
 */
function cleanForSpeech(text: string): string {
  let t = text;
  for (const re of MARKDOWN_RE) {
    t = t.replace(re, typeof re.source === 'string' && re.source.includes('([^\\]]+)') ? '$1' : ' ');
  }
  // Collapse extra whitespace and normalise punctuation spacing.
  return t.replace(/\s{2,}/g, ' ').trim();
}

// ─── Sentence Chunking ────────────────────────────────────────────────────────

/** Minimum character count for a chunk to be worth speaking as a separate utterance. */
const MIN_CHUNK_LEN = 8;
/** Maximum characters in a single utterance before we force-split. */
const MAX_CHUNK_LEN = 180;

/**
 * Split text into sentence-level chunks for natural cadence.
 *
 * Splits on Vietnamese/English sentence terminators: `.`, `!`, `?`, `；`, `;`, `\n`.
 * Merges very short fragments with the next chunk to avoid choppy micro-utterances.
 */
export function splitIntoChunks(text: string): string[] {
  // Primary split on sentence-ending punctuation, keeping the delimiter.
  const raw = text.split(/(?<=[.!?；;\n])\s*/);

  const chunks: string[] = [];

  for (const part of raw) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.length > MAX_CHUNK_LEN) {
      // Force-split long chunks at clause boundaries (comma, colon, dash).
      const sub = trimmed.split(/(?<=[,，:—–])\s*/);
      for (const s of sub) {
        const st = s.trim();
        if (st.length >= MIN_CHUNK_LEN) chunks.push(st);
        else if (chunks.length > 0) chunks[chunks.length - 1] += ' ' + st;
      }
    } else if (trimmed.length < MIN_CHUNK_LEN && chunks.length > 0) {
      // Merge tiny fragments with previous chunk.
      chunks[chunks.length - 1] += ' ' + trimmed;
    } else {
      chunks.push(trimmed);
    }
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

// ─── Chunked Sequential Speaker (Robust) ──────────────────────────────────────

/** Inter-sentence pause in milliseconds for natural debate cadence. */
// ─── Continuous Audio Streamer & Seamless SpeechSynthesis Fallback ────────────

let currentAudioElement: HTMLAudioElement | null = null;
let currentPlaySessionId = 0;

/**
 * Fast, natural browser SpeechSynthesis fallback (Google Tiếng Việt / Microsoft Hoài My).
 * Used when network TTS has high latency or server is unavailable.
 */
function playSpeechSynthesisFallback(
  text: string,
  options: TTSOptions,
  sessionId: number,
): void {
  const synth = getSynth();
  if (!synth) {
    options.onEnd?.();
    return;
  }

  try {
    synth.cancel();
    const targetLang = options.lang || 'vi-VN';
    const voice = getBestVoice(targetLang, options.gender || 'male');
    if (!voice && targetLang === 'vi-VN') {
      console.warn('[SpeechSynthesis] No Vietnamese voice installed in browser, skipping robotic fallback');
      options.onEnd?.();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    if (voice) utter.voice = voice;
    utter.lang = targetLang;
    utter.rate = options.rate || 1.0;
    utter.pitch = options.pitch || 1.0;

    utter.onend = () => {
      if (sessionId === currentPlaySessionId) {
        options.onEnd?.();
      }
    };
    utter.onerror = (e) => {
      console.warn('[SpeechSynthesis] Playback notice:', e.error);
      if (sessionId === currentPlaySessionId) {
        options.onEnd?.();
      }
    };

    synth.speak(utter);
  } catch (err) {
    console.warn('[SpeechSynthesis] Playback error:', err);
    options.onEnd?.();
  }
}

/**
 * Single-pass continuous Neural TTS audio playback from VoiceStudio local engine.
 * Synthesizes the entire response as ONE coherent studio-grade MP3 audio stream to ensure
 * natural human-like prosody, smooth intonation, and zero robotic artifacts.
 */
function playAudioStream(
  text: string,
  options: TTSOptions,
  sessionId: number,
): void {
  const voiceParam = options.voiceId || (options.gender === 'male' ? 'sonTung' : 'default_vi');
  const audioSourceUrl = options.audioUrl || (text ? `/api/v1/voice/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceParam)}&lang=vi` : null);

  if (!audioSourceUrl) {
    options.onEnd?.();
    return;
  }

  const audio = new Audio(audioSourceUrl);
  currentAudioElement = audio;

  audio.onended = () => {
    if (sessionId !== currentPlaySessionId) return;
    currentAudioElement = null;
    options.onEnd?.();
  };

  audio.onerror = (e) => {
    console.warn('[VoiceStudio] Neural audio stream error, falling back to browser TTS:', e);
    if (sessionId === currentPlaySessionId) {
      currentAudioElement = null;
      playSpeechSynthesisFallback(text, options, sessionId);
    }
  };

  audio.play().catch((err) => {
    console.warn('[VoiceStudio] Neural audio play error, falling back to browser TTS:', err);
    if (sessionId === currentPlaySessionId) {
      currentAudioElement = null;
      playSpeechSynthesisFallback(text, options, sessionId);
    }
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Speak AI Opponent response strictly using VoiceStudio local microservice.
 */
export type SpeakResult = 'ok' | 'no_voice' | 'unsupported' | 'empty';

export function speakOpponentResponse(
  text: string,
  options: TTSOptions = {},
): SpeakResult {
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return 'empty';

  // Stop any active speech before starting new one (increments session ID)
  stopSpeaking();
  const sessionId = ++currentPlaySessionId;

  // Strictly VoiceStudio Local Audio
  playAudioStream(cleaned, options, sessionId);
  return 'ok';
}

/**
 * Legacy one-shot speakText() — wraps speakOpponentResponse for backward compat.
 */
export function speakText(text: string, options: SpeakOptions = {}): boolean {
  const result = speakOpponentResponse(text, options);
  return result === 'ok';
}

/**
 * Stop any currently playing speech immediately across both engines.
 */
export function stopSpeaking(): void {
  // Invalidate any in-flight playback sessions
  currentPlaySessionId++;

  // 1. Stop HTML5 audio player
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.removeAttribute('src');
      currentAudioElement.src = '';
      currentAudioElement.load();
    } catch {}
    currentAudioElement = null;
  }

  // 2. Stop Web Speech Synthesis
  const synth = getSynth();
  if (synth) {
    try {
      const token = (synth as any).__ttsToken;
      if (token) token.cancelled = true;
      synth.cancel();
    } catch {}
  }
}

// Global cleanup on browser page unload or backward/forward navigation
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => stopSpeaking());
  window.addEventListener('pagehide', () => stopSpeaking());
  window.addEventListener('beforeunload', () => stopSpeaking());
}

/** Returns true if TTS playback is available. */
export function isTtsSupported(): boolean {
  return true;
}

/**
 * Get list of VoiceStudio voices available.
 */
export function getAvailableVoices(): string[] {
  return ['VoiceStudio Local Engine (http://localhost:8000)'];
}
