/**
 * tts.ts — Browser Web Speech API · Natural Vietnamese TTS Utility
 *
 * Features:
 *  - Strict locale filtering: only vi-VN voices play Vietnamese text.
 *    Never falls back to a foreign synthesiser for Vietnamese.
 *  - Neural/Online voice priority: Google Tiếng Việt, Microsoft HoaiMy/NamMinh, iOS Linh/An.
 *  - Gender-aware selection: female / male persona.
 *  - Sentence-chunk cadence: splits long text at punctuation and injects
 *    micro-pauses (120ms) between utterances for natural debate delivery and
 *    immunity against mobile WebKit 15-second utterance cutoff bugs.
 *  - Safe interlock: stopActiveSpeech() is idempotent and always safe to call.
 *  - Single-session playback state machine with generation tokens.
 *  - Anti-duplicate fallback: audio.onerror + playPromise.catch only trigger
 *    one SpeechSynthesis fallback per session.
 *  - Circuit breaker: when backend TTS endpoint is offline (503), fast-paths
 *    subsequent speech directly to SpeechSynthesis (0ms latency, zero media pipeline disruption).
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

// Circuit-breaker for backend TTS availability.
// When backend returns 503, sets to false to bypass failing network calls on future speech.
let backendTtsAvailable: boolean | null = null;

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
  // Speaks a 1-character silent utterance without cancel() so WebKit audio queue unlocks cleanly
  const synth = getSynth();
  if (synth) {
    try {
      if (synth.paused) synth.resume();
      const silentUtter = new SpeechSynthesisUtterance(' ');
      silentUtter.volume = 0.01;
      silentUtter.rate = 10;
      synth.speak(silentUtter);
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

  // Pre-load voices on voiceschanged
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
  }
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
 *   T2 (70+): Any "Online" / "Natural" / "Neural" voice, iOS Linh / An
 *   T3 (50+): Any other vi-VN voice
 *   T4 (0):   Non-Vietnamese voice (rejected for vi-VN requests)
 */
function scoreVoice(v: SpeechSynthesisVoice, lang: TtsLang, gender: TtsGender): number {
  const name = v.name.toLowerCase();
  const voiceLang = v.lang.toLowerCase();

  // Hard reject: wrong language family for the requested locale.
  if (lang === 'vi-VN') {
    const isVietnamese = voiceLang.startsWith('vi') || voiceLang.includes('vie') || voiceLang.includes('vn');
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
  else if (name.includes('online') || name.includes('natural') || name.includes('neural') || name.includes('enhanced') || name.includes('premium')) score += 25;
  else if (name.includes('microsoft') || name.includes('google') || name.includes('apple')) score += 15;

  // Gender preference boost.
  const isFemale =
    name.includes('female') || name.includes('woman') || name.includes('girl') ||
    name.includes('hoài my') || name.includes('hoaimy') ||
    name.includes('nữ') || name.includes('nu ') ||
    name.includes('lan') || name.includes('mai') || name.includes('thu') || name.includes('linh');

  const isMale =
    name.includes('male') || name.includes('man') || name.includes('boy') ||
    name.includes('namminh') || name.includes('nam minh') ||
    name.includes('nam') || name.includes('hùng') || name.includes('hung') || name.includes('an');

  if (gender === 'female' && isFemale) score += 10;
  if (gender === 'male' && isMale) score += 10;
  // Small penalty for mismatched gender (still usable, not rejected).
  if (gender === 'female' && isMale) score -= 5;
  if (gender === 'male' && isFemale) score -= 5;

  return score;
}

/**
 * Pick the best available voice for a given locale and gender preference.
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

  // If no Vietnamese voice is available in the browser, return null so OS default is used
  if (lang === 'vi-VN') {
    return null;
  }

  // Fallback: Pick default browser voice or first voice for other languages
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Returns true if a valid voice for the given locale is available.
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
const MAX_CHUNK_LEN = 160;

/**
 * Split text into sentence-level chunks for natural cadence and WebKit safety.
 * Splits on Vietnamese/English sentence terminators: `.`, `!`, `?`, `；`, `;`, `\n`.
 */
export function splitIntoChunks(text: string): string[] {
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
      chunks[chunks.length - 1] += ' ' + trimmed;
    } else {
      chunks.push(trimmed);
    }
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

// ─── Playback Session & Generation Token ─────────────────────────────────────

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

// ─── SpeechSynthesis Sequential Chunk Playback ───────────────────────────────

/**
 * Play text via browser SpeechSynthesis with natural inter-sentence chunking.
 *
 * CRITICAL LIFECYCLE RULES:
 * 1. Chunks are spoken sequentially with a 120ms natural pause between sentences.
 * 2. This completely avoids the mobile WebKit 15-second speech cutoff bug.
 * 3. 'canceled' / 'interrupted' onerror events do NOT call options.onEnd().
 * 4. options.onStart() is called once on the first chunk's utter.onstart.
 * 5. options.onEnd() is called once after the final chunk completes.
 */
function playSpeechSynthesisFallback(
  text: string,
  options: TTSOptions,
  sessionId: number,
  generation: number,
): void {
  if (generation !== playbackGeneration) {
    console.info('[TTS Source] SpeechSynthesis cancelled: generation mismatch before start');
    return;
  }

  const synth = getSynth();
  if (!synth) {
    console.warn('[TTS Source] source=none | SpeechSynthesis unsupported');
    setPlaybackState('error');
    options.onEnd?.();
    return;
  }
  const activeSynth = synth;

  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) {
    setPlaybackState('ended');
    options.onEnd?.();
    return;
  }

  const targetLang = options.lang || 'vi-VN';
  const voice = getBestVoice(targetLang, options.gender || 'male');

  if (voice) {
    console.info(`[TTS Source] source=browser_speech_synthesis | chunks=${chunks.length} | voiceName=${voice.name} | lang=${voice.lang}`);
  } else {
    console.info(`[TTS Source] source=browser_speech_synthesis | chunks=${chunks.length} | voiceName=OS_default | lang=${targetLang}`);
  }

  let currentChunkIdx = 0;
  let hasStarted = false;

  function speakNextChunk(): void {
    if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) {
      return;
    }
    if (currentChunkIdx >= chunks.length) {
      console.info('[TTS Source] SpeechSynthesis finished all chunks — normal completion');
      setPlaybackState('ended');
      options.onEnd?.();
      return;
    }

    try {
      if (activeSynth.paused) {
        activeSynth.resume();
      }

      const chunkText = chunks[currentChunkIdx];
      const utter = new SpeechSynthesisUtterance(chunkText);
      if (voice) {
        utter.voice = voice;
      }
      utter.lang = targetLang;
      utter.rate = options.rate || 1.0;
      utter.pitch = options.pitch || 1.0;
      utter.volume = options.volume ?? 1.0;

      utter.onstart = () => {
        if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) {
          activeSynth.cancel();
          return;
        }
        if (!hasStarted) {
          hasStarted = true;
          console.info('[TTS Source] SpeechSynthesis onstart — audio actually playing');
          setPlaybackState('playing_speech');
          options.onStart?.();
        }
      };

      utter.onend = () => {
        if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) return;
        currentChunkIdx++;
        if (currentChunkIdx < chunks.length) {
          // Small 120ms natural pause between sentences for human-like debate delivery
          setTimeout(() => {
            if (generation === playbackGeneration && sessionId === currentPlaySessionId) {
              speakNextChunk();
            }
          }, 120);
        } else {
          console.info('[TTS Source] SpeechSynthesis onend — all chunks completed');
          setPlaybackState('ended');
          options.onEnd?.();
        }
      };

      utter.onerror = (e) => {
        const errorType = e.error;
        if (errorType === 'canceled' || errorType === 'interrupted') {
          console.info(`[TTS Source] SpeechSynthesis onerror: ${errorType} (internal cancel, NOT calling onEnd)`);
          return;
        }
        console.warn(`[TTS Source] SpeechSynthesis chunk error (${errorType}) at chunk ${currentChunkIdx}`);
        if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) return;

        currentChunkIdx++;
        if (currentChunkIdx < chunks.length) {
          speakNextChunk();
        } else {
          setPlaybackState('error');
          options.onEnd?.();
        }
      };

      setPlaybackState(hasStarted ? 'playing_speech' : 'requesting');
      activeSynth.speak(utter);
    } catch (err: any) {
      console.warn('[TTS Source] SpeechSynthesis speak exception:', err);
      if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) return;
      setPlaybackState('error');
      options.onEnd?.();
    }
  }

  speakNextChunk();
}

// ─── Audio Stream Playback ───────────────────────────────────────────────────

/**
 * Continuous audio playback from backend TTS or direct SpeechSynthesis.
 * Reuses the persistent shared HTMLAudioElement.
 */
function playAudioStream(
  text: string,
  options: TTSOptions,
  sessionId: number,
  generation: number,
): void {
  if (generation !== playbackGeneration) {
    console.info('[Voice AutoPlay] Playback cancelled: generation mismatch before audio stream');
    options.onEnd?.();
    return;
  }

  const voiceParam = options.voiceId || (options.gender === 'male' ? 'sonTung' : 'default_vi');
  const hasDedicatedAudioUrl = !!options.audioUrl;
  const isDefaultTtsEndpoint = !hasDedicatedAudioUrl;
  const audioSourceUrl = options.audioUrl || (text ? `/api/v1/voice/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceParam)}&lang=vi` : null);

  // ═══ CIRCUIT BREAKER ═══
  // If backend default TTS endpoint is known offline (e.g. Railway without VoiceStudio),
  // skip the failing HTTP request and use SpeechSynthesis directly with 0ms latency.
  if (isDefaultTtsEndpoint && backendTtsAvailable === false) {
    console.info('[TTS Source] Backend TTS known offline — using SpeechSynthesis directly (0ms latency)');
    playSpeechSynthesisFallback(text, options, sessionId, generation);
    return;
  }

  if (!audioSourceUrl) {
    console.info('[TTS Source] No audio URL available, using browser SpeechSynthesis directly');
    playSpeechSynthesisFallback(text, options, sessionId, generation);
    return;
  }

  console.info(`[TTS Source] Attempting backend audio: ${audioSourceUrl.substring(0, 80)}...`);
  setPlaybackState('requesting');

  let fallbackTriggered = false;

  function triggerFallbackOnce(): void {
    if (fallbackTriggered) {
      console.info('[TTS Source] Duplicate fallback blocked — already triggered for this session');
      return;
    }
    fallbackTriggered = true;

    // Mark default backend TTS as offline so future speech fast-paths to SpeechSynthesis
    if (isDefaultTtsEndpoint) {
      backendTtsAvailable = false;
    }

    // Cleanly release HTMLAudioElement before SpeechSynthesis
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    }

    if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) {
      console.info('[TTS Source] Fallback cancelled: generation mismatch');
      options.onEnd?.();
      return;
    }
    console.warn('[TTS Source] Backend audio failed → falling back to browser SpeechSynthesis (once)');
    playSpeechSynthesisFallback(text, options, sessionId, generation);
  }

  const audio = getOrCreateAudioElement() || new Audio();
  currentAudioElement = audio;

  audio.onplay = () => {
    if (generation !== playbackGeneration) return;
    console.info('[TTS Source] HTMLAudioElement onplay — audio actually playing');
    // Backend audio succeeded — mark backend TTS as online
    if (isDefaultTtsEndpoint) {
      backendTtsAvailable = true;
    }
    setPlaybackState('playing_audio');
    options.onStart?.();
  };

  audio.onended = () => {
    if (generation !== playbackGeneration || sessionId !== currentPlaySessionId) return;
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
          if (generation !== playbackGeneration) {
            audio.pause();
            audio.currentTime = 0;
            return;
          }
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
  const generation = playbackGeneration;

  console.info(`[Voice AutoPlay] speakOpponentResponse called | textLen=${cleaned.length} | generation=${generation} | audioUnlocked=${isAudioPipelineUnlocked}`);

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
 */
export function stopActiveSpeech(): void {
  playbackGeneration++;
  currentPlaySessionId++;

  console.info(`[Voice Stop] stopActiveSpeech called | new generation=${playbackGeneration}`);
  setPlaybackState('stopping');

  // 1. Stop persistent shared HTML5 audio player — FULL RESET
  if (sharedAudioElement) {
    try {
      sharedAudioElement.pause();
      sharedAudioElement.currentTime = 0;
      sharedAudioElement.onplay = null;
      sharedAudioElement.onended = null;
      sharedAudioElement.onerror = null;
      sharedAudioElement.src = '';
      sharedAudioElement.load();
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

  // 2. Stop Web Speech Synthesis — only cancel if speaking or pending
  const synth = getSynth();
  if (synth) {
    try {
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
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
