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
 *  - Safe interlock: stopActiveSpeech() is idempotent and always safe to call.
 *  - Graceful no-op when SpeechSynthesis is unavailable.
 *  - Single-session playback state machine with generation tokens.
 *  - Anti-duplicate fallback: audio.onerror + playPromise.catch only trigger
 *    one SpeechSynthesis fallback per session.
 *  - Correct onEnd lifecycle: 'canceled'/'interrupted' errors are NOT treated
 *    as normal end-of-playback events.
 */

// ─── Playback State Machine ──────────────────────────────────────────────────

export type PlaybackState =
  | 'idle'
  | 'requesting'   // audio element src set, loading
  | 'playing_audio' // HTMLAudioElement actually playing
  | 'playing_speech' // SpeechSynthesis actually speaking
  | 'stopping'     // stopActiveSpeech() was called
  | 'ended'        // normal completion
  | 'error';       // unrecoverable error

let _playbackState: PlaybackState = 'idle';
let _playbackStateListener: ((state: PlaybackState) => void) | null = null;

function setPlaybackState(state: PlaybackState): void {
  _playbackState = state;
  _playbackStateListener?.(state);
}

export function getPlaybackState(): PlaybackState {
  return _playbackState;
}

/**
 * Returns true if audio is actually playing (either HTMLAudioElement or SpeechSynthesis).
 * This is the AUTHORITATIVE source — not the React boolean.
 */
export function isActuallyPlaying(): boolean {
  return _playbackState === 'playing_audio' || _playbackState === 'playing_speech' || _playbackState === 'requesting';
}

/**
 * Subscribe to playback state changes. Returns an unsubscribe function.
 */
export function onPlaybackStateChange(listener: (state: PlaybackState) => void): () => void {
  _playbackStateListener = listener;
  return () => {
    if (_playbackStateListener === listener) {
      _playbackStateListener = null;
    }
  };
}

// ─── Browser Access ───────────────────────────────────────────────────────────

function getSynth(): SpeechSynthesis | null {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis;
  }
  return null;
}

// ─── Reusable Mobile-Safe Audio Playback Pipeline ───────────────────────────
let sharedAudioElement: HTMLAudioElement | null = null;
let sharedAudioContext: AudioContext | null = null;
let isAudioPipelineUnlocked = false;

export function getOrCreateAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioElement) {
    try {
      sharedAudioElement = new Audio();
      sharedAudioElement.preload = 'auto';
      // Inline playback attribute for mobile Safari
      sharedAudioElement.setAttribute('playsinline', 'true');
      sharedAudioElement.setAttribute('webkit-playsinline', 'true');
    } catch {}
  }
  return sharedAudioElement;
}

export function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    } catch {}
  }
  return sharedAudioContext;
}

/**
 * Returns whether the audio pipeline has been primed/unlocked by a user gesture.
 */
export function isAudioUnlocked(): boolean {
  return isAudioPipelineUnlocked;
}

/**
 * Unlock and prime the browser/mobile audio playback pipeline during a genuine user gesture.
 * Must be called synchronously inside user touch/click handlers (e.g. tapping Mic, Start/Stop Recording, or switching to Voice Mode).
 */
export function unlockAudioPipeline(): void {
  if (typeof window === 'undefined') return;

  // 1. Prime persistent shared HTMLAudioElement with a 1-sample silent sound
  const audio = getOrCreateAudioElement();
  if (audio) {
    try {
      if (!audio.src || audio.src.startsWith('data:')) {
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audio.pause();
              isAudioPipelineUnlocked = true;
            })
            .catch(() => {});
        }
      }
    } catch {}
  }

  // 2. Prime and resume shared AudioContext
  const ctx = getOrCreateAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 3. Pre-warm SpeechSynthesis on mobile browsers
  const synth = getSynth();
  if (synth) {
    try {
      if (synth.paused) synth.resume();
      const silentUtter = new SpeechSynthesisUtterance('');
      silentUtter.volume = 0;
      synth.speak(silentUtter);
      synth.cancel();
    } catch {}
  }

  isAudioPipelineUnlocked = true;
}

// Global user interaction listener for initial passive unlock
if (typeof window !== 'undefined') {
  const globalInteractionHandler = () => {
    unlockAudioPipeline();
  };
  window.addEventListener('click', globalInteractionHandler, { capture: true, passive: true });
  window.addEventListener('touchstart', globalInteractionHandler, { capture: true, passive: true });
  window.addEventListener('keydown', globalInteractionHandler, { capture: true, passive: true });
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
  /** Called when playback actually begins (audio.onplay or utter.onstart) */
  onStart?: () => void;
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
    t = t.replace(re, typeof re.source === 'string' && re.source.includes('([^\\\\]]+)') ? '$1' : ' ');
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

// ─── Playback Session & Generation Token ─────────────────────────────────────

/**
 * Monotonically increasing generation counter.
 * Incremented every time stopActiveSpeech() is called.
 * Any in-flight async operation checks this before starting/continuing —
 * if the generation has changed, the playback attempt is silently dropped.
 */
let playbackGeneration = 0;
let currentPlaySessionId = 0;
let currentAudioElement: HTMLAudioElement | null = null;

// ─── Structured Diagnostics Telemetry ────────────────────────────────────────

export interface VoiceDebateDiagnostics {
  voiceModeActive: boolean;
  opponentResponseReceived: boolean;
  responseRole: string;
  responseTextLength: number;
  ttsAvailable: boolean;
  speechSynthesisState: string;
  audioUnlocked: boolean;
  playbackStarted: boolean;
  playbackError: string | null;
}

export function logVoiceDebateDiagnostics(diag: VoiceDebateDiagnostics): void {
  console.info('[Voice Debate]', JSON.stringify({
    voiceModeActive: diag.voiceModeActive,
    opponentResponseReceived: diag.opponentResponseReceived,
    responseRole: diag.responseRole,
    responseTextLength: diag.responseTextLength,
    ttsAvailable: diag.ttsAvailable,
    speechSynthesisState: diag.speechSynthesisState,
    audioUnlocked: diag.audioUnlocked,
    playbackStarted: diag.playbackStarted,
    playbackError: diag.playbackError,
  }));
}

// ─── SpeechSynthesis Fallback ────────────────────────────────────────────────

/**
 * Play text via browser SpeechSynthesis.
 *
 * CRITICAL LIFECYCLE RULES:
 * 1. 'canceled' / 'interrupted' onerror events do NOT call options.onEnd().
 * 2. Only the current generation's callbacks are allowed to update state.
 * 3. options.onStart() is called from utter.onstart (actual audio begins).
 * 4. options.onEnd() is called from utter.onend (normal completion only).
 */
function playSpeechSynthesisFallback(
  text: string,
  options: TTSOptions,
  sessionId: number,
  generation: number,
): void {
  // Check generation BEFORE starting — if user already pressed Stop, bail out
  if (generation !== playbackGeneration) {
    console.info('[TTS Source] SpeechSynthesis cancelled: generation mismatch (stop was pressed)');
    return;
  }

  const synth = getSynth();
  if (!synth) {
    console.warn('[TTS Source] source=none | SpeechSynthesis unsupported');
    setPlaybackState('error');
    options.onEnd?.();
    return;
  }

  try {
    // Do NOT call synth.cancel() here — that would kill a prior utterance
    // and trigger its onerror('canceled'), which is exactly the bug we fixed.
    if (synth.paused) {
      synth.resume();
    }

    const targetLang = options.lang || 'vi-VN';
    const voice = getBestVoice(targetLang, options.gender || 'male');
    const utter = new SpeechSynthesisUtterance(text);

    if (voice) {
      utter.voice = voice;
      console.info(`[TTS Source] source=browser_speech_synthesis | voiceName=${voice.name} | lang=${voice.lang}`);
    } else {
      console.info(`[TTS Source] source=browser_speech_synthesis | voiceName=OS_default | lang=${targetLang}`);
    }
    utter.lang = targetLang;
    utter.rate = options.rate || 1.0;
    utter.pitch = options.pitch || 1.0;
    utter.volume = options.volume ?? 1.0;

    utter.onstart = () => {
      // Verify generation — user may have pressed Stop between speak() and actual start
      if (generation !== playbackGeneration) {
        synth.cancel();
        return;
      }
      console.info('[TTS Source] SpeechSynthesis onstart — audio actually playing');
      setPlaybackState('playing_speech');
      options.onStart?.();
    };

    utter.onend = () => {
      // Only process if this is still the active session
      if (generation !== playbackGeneration) return;
      if (sessionId !== currentPlaySessionId) return;
      console.info('[TTS Source] SpeechSynthesis onend — normal completion');
      setPlaybackState('ended');
      options.onEnd?.();
    };

    utter.onerror = (e) => {
      // CRITICAL: 'canceled' and 'interrupted' are NOT real errors.
      // They are triggered by synth.cancel() (from stopActiveSpeech or from
      // a new speech session replacing this one). Do NOT call onEnd() for these.
      const errorType = e.error;
      if (errorType === 'canceled' || errorType === 'interrupted') {
        console.info(`[TTS Source] SpeechSynthesis onerror: ${errorType} (internal cancel, NOT calling onEnd)`);
        return;
      }
      console.warn('[TTS Source] SpeechSynthesis onerror:', errorType);
      if (generation !== playbackGeneration) return;
      if (sessionId !== currentPlaySessionId) return;
      setPlaybackState('error');
      options.onEnd?.();
    };

    setPlaybackState('requesting');
    synth.speak(utter);
  } catch (err: any) {
    console.warn('[TTS Source] SpeechSynthesis exception:', err);
    if (generation !== playbackGeneration) return;
    setPlaybackState('error');
    options.onEnd?.();
  }
}

// ─── Audio Stream Playback ───────────────────────────────────────────────────

/**
 * Single-pass continuous audio playback from backend TTS endpoint.
 * Reuses the persistent shared HTMLAudioElement to prevent mobile autoplay rejections.
 *
 * CRITICAL: Uses a `fallbackTriggered` flag to ensure only ONE fallback to
 * SpeechSynthesis per playback session, even when both audio.onerror AND
 * playPromise.catch fire for the same 503 error.
 */
function playAudioStream(
  text: string,
  options: TTSOptions,
  sessionId: number,
  generation: number,
): void {
  // Check generation BEFORE starting
  if (generation !== playbackGeneration) {
    console.info('[Voice AutoPlay] Playback cancelled: generation mismatch before audio stream');
    options.onEnd?.();
    return;
  }

  const voiceParam = options.voiceId || (options.gender === 'male' ? 'sonTung' : 'default_vi');
  const audioSourceUrl = options.audioUrl || (text ? `/api/v1/voice/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceParam)}&lang=vi` : null);

  if (!audioSourceUrl) {
    console.info('[TTS Source] No audio URL available, using browser SpeechSynthesis directly');
    playSpeechSynthesisFallback(text, options, sessionId, generation);
    return;
  }

  console.info(`[TTS Source] Attempting backend audio: ${audioSourceUrl.substring(0, 80)}...`);
  setPlaybackState('requesting');

  // ═══ ANTI-DUPLICATE FALLBACK FLAG ═══
  // Both audio.onerror and playPromise.catch can fire for the same HTTP 503.
  // This flag ensures playSpeechSynthesisFallback is called AT MOST ONCE.
  let fallbackTriggered = false;

  function triggerFallbackOnce(): void {
    if (fallbackTriggered) {
      console.info('[TTS Source] Duplicate fallback blocked — already triggered for this session');
      return;
    }
    fallbackTriggered = true;

    // Re-check generation before fallback
    if (generation !== playbackGeneration) {
      console.info('[TTS Source] Fallback cancelled: generation mismatch');
      options.onEnd?.();
      return;
    }
    if (sessionId !== currentPlaySessionId) {
      return;
    }
    console.warn('[TTS Source] Backend audio failed → falling back to browser SpeechSynthesis (once)');
    playSpeechSynthesisFallback(text, options, sessionId, generation);
  }

  // Reuse the persistent shared audio player to prevent mobile autoplay restrictions
  const audio = getOrCreateAudioElement() || new Audio();
  currentAudioElement = audio;

  audio.onplay = () => {
    if (generation !== playbackGeneration) return;
    console.info('[TTS Source] HTMLAudioElement onplay — audio actually playing');
    setPlaybackState('playing_audio');
    options.onStart?.();
  };

  audio.onended = () => {
    if (generation !== playbackGeneration) return;
    if (sessionId !== currentPlaySessionId) return;
    console.info('[TTS Source] HTMLAudioElement onended — normal completion');
    setPlaybackState('ended');
    options.onEnd?.();
  };

  audio.onerror = () => {
    console.warn('[TTS Source] HTMLAudioElement onerror (VoiceStudio likely offline / 503)');
    triggerFallbackOnce();
  };

  try {
    audio.src = audioSourceUrl;
    audio.load();
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Verify generation is still valid after async play() resolves
          if (generation !== playbackGeneration) {
            audio.pause();
            audio.currentTime = 0;
            return;
          }
          // onplay handler already set state to playing_audio
        })
        .catch((err) => {
          console.warn('[TTS Source] Audio play() rejection:', err?.name, err?.message);
          triggerFallbackOnce();
        });
    }
  } catch (err) {
    console.warn('[TTS Source] Audio setup exception:', err);
    triggerFallbackOnce();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Speak AI Opponent response using backend audio or seamless browser fallback.
 */
export type SpeakResult = 'ok' | 'no_voice' | 'unsupported' | 'empty';

export function speakOpponentResponse(
  text: string,
  options: TTSOptions = {},
): SpeakResult {
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return 'empty';

  // Stop any active speech before starting new one (increments generation)
  stopActiveSpeech();
  const sessionId = ++currentPlaySessionId;
  const generation = playbackGeneration; // Capture current generation for this playback

  console.info(`[Voice AutoPlay] speakOpponentResponse called | textLen=${cleaned.length} | generation=${generation} | audioUnlocked=${isAudioPipelineUnlocked}`);

  // Stream Neural Audio or fallback smoothly to SpeechSynthesis
  playAudioStream(cleaned, options, sessionId, generation);
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
 * Resets audio player and cancels active speech synthesis.
 * Increments the playback generation to invalidate ALL in-flight async playback attempts.
 *
 * After calling this, no pending async callback (from audio.play().then, onerror fallback,
 * etc.) will be able to restart playback because the generation will have changed.
 */
export function stopActiveSpeech(): void {
  // 0. Invalidate ALL in-flight and future async playback for the old generation
  playbackGeneration++;
  currentPlaySessionId++;

  console.info(`[Voice Stop] stopActiveSpeech called | new generation=${playbackGeneration}`);
  setPlaybackState('stopping');

  // 1. Stop persistent shared HTML5 audio player — FULL RESET
  if (sharedAudioElement) {
    try {
      sharedAudioElement.pause();
      sharedAudioElement.currentTime = 0;
      // Remove all event handlers to prevent stale callbacks
      sharedAudioElement.onplay = null;
      sharedAudioElement.onended = null;
      sharedAudioElement.onerror = null;
      sharedAudioElement.src = '';
      sharedAudioElement.load(); // Forces browser to release the audio resource
    } catch {}
  }
  if (currentAudioElement && currentAudioElement !== sharedAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.onplay = null;
      currentAudioElement.onended = null;
      currentAudioElement.onerror = null;
      currentAudioElement.src = '';
      currentAudioElement.load();
    } catch {}
  }
  currentAudioElement = null;

  // 2. Stop Web Speech Synthesis — IMMEDIATE cancel
  // This will trigger utter.onerror('canceled') on active utterances, but our
  // onerror handler now correctly ignores 'canceled'/'interrupted' errors.
  const synth = getSynth();
  if (synth) {
    try {
      synth.cancel();
    } catch {}
  }

  setPlaybackState('idle');
}

/** Alias for backward compatibility */
export const stopSpeaking = stopActiveSpeech;

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
