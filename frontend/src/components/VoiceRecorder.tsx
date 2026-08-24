/**
 * VoiceRecorder v15 — Cyber-Academic Glassmorphism Voice Coach & DSP Engine
 *
 * Features:
 * - Real-time Live DSP Signal & WPM Classification
 * - Audio Playback & Re-recording Controls
 * - Robust Dual-Engine (WebSocket Streaming + Zero-Fail REST Fallback)
 * - Soundwave Audio Visualizer
 * - Auto-fill argument transcript to Arena
 *
 * Spec Reference: 08_VOICE_ENGINE_SPEC.md
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Gauge,
  AlertCircle,
  CheckCircle2,
  Volume2,
  Zap,
  Play,
  Pause,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { unlockAudioPipeline } from '../utils/tts';

// --- Types ---

type WpmClassification =
  | 'OPTIMAL'
  | 'TOO_FAST'
  | 'SLIGHTLY_FAST'
  | 'TOO_SLOW'
  | 'SLIGHTLY_SLOW'
  | 'NO_DATA';

type SignalSeverity = 'GREEN' | 'YELLOW' | 'RED';

interface VoiceSignal {
  type: 'VOICE_SIGNAL';
  wpm: number;
  classification: WpmClassification;
  filler_count: number;
  filler_rate_per_min: number;
  elapsed_seconds: number;
  pause_alert: boolean;
  signal_message: string | null;
  severity: SignalSeverity;
}

interface VoiceMetrics {
  wpm: number;
  word_count: number;
  duration_ms: number;
  filler_count: number;
  fillers_found: string[];
  pace_label: string;
  pace_tip: string;
}

interface VoiceAnalyzeResponse {
  success: boolean;
  transcript: string;
  metrics: VoiceMetrics;
  stt_source: 'voicestudio' | 'whisper' | 'mock';
}

type WsServerMessage =
  | { type: 'ready' }
  | { type: 'pong' }
  | { type: 'error'; error: string }
  | { type: 'metrics'; metrics: VoiceMetrics; transcript: string; stt_source: 'voicestudio' | 'whisper' | 'mock' }
  | VoiceSignal;

type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

// --- Constants ---

const VOICE_API_BASE = '/api/v1/voice';
const VOICE_WS_URL = 'ws://localhost:4001';
const MAX_RECORDING_MS = 3 * 60 * 1000;

// --- Helpers ---

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function classificationTip(cls: WpmClassification, wpm: number): string {
  switch (cls) {
    case 'TOO_FAST':      return `Đang nói quá nhanh (${wpm} WPM). Hãy làm chậm lại để giám khảo kịp theo dõi!`;
    case 'SLIGHTLY_FAST': return `Hơi nhanh (${wpm} WPM). Nhớ nhấn nhá các luận điểm chính.`;
    case 'OPTIMAL':       return `Tốc độ hoàn hảo (${wpm} WPM). Duy trì nhịp độ này!`;
    case 'SLIGHTLY_SLOW': return `Hơi chậm (${wpm} WPM). Có thể tăng nhẹ tốc độ phát biểu.`;
    case 'TOO_SLOW':      return `Đang nói quá chậm (${wpm} WPM). Cần đẩy nhanh tiến độ lập luận!`;
    default:              return 'Đang đo lường nhịp độ phát biểu...';
  }
}

// --- Floating Live Coach Signal Box ---

interface CoachSignalBoxProps {
  signal: VoiceSignal;
  elapsed: number;
}

function CoachSignalBox({ signal, elapsed }: CoachSignalBoxProps) {
  const sev = signal.severity;
  const tip = signal.signal_message ?? classificationTip(signal.classification, signal.wpm);
  const fillerAlert = signal.filler_count >= 5;
  const fillerLabel = signal.filler_count > 0
    ? `Từ đệm: ${signal.filler_count} lần${signal.filler_rate_per_min > 0 ? ` (${signal.filler_rate_per_min}/phút)` : ''}`
    : null;

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all mt-3 ${
        sev === 'GREEN'
          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
          : sev === 'YELLOW'
          ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
          : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
      }`}
      role="status"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap size={14} className="animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Live Coach Signal</span>
        </div>
        <span className="text-xs font-mono font-bold">{formatDuration(elapsed)}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-white/80 dark:bg-slate-900/80 border border-current shadow-sm flex items-center gap-1.5">
          <Gauge size={12} />
          {signal.wpm > 0 ? `${signal.wpm} WPM` : '-- WPM'}
        </span>
        {fillerLabel && (
          <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
            fillerAlert ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
          }`}>
            {fillerLabel}
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed font-medium">{tip}</p>

      {signal.pause_alert && (
        <div className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
          ⚠️ Đã nói liên tục hơn 40 giây. Hãy dừng nghỉ lấy hơi một nhịp!
        </div>
      )}
    </div>
  );
}

// --- VoiceRecorder Component ---

interface VoiceRecorderProps {
  language?: 'vi' | 'en' | 'mixed';
  currentTurn?: number;
  onTranscriptReady?: (text: string) => void;
  onRecordingComplete?: (transcript: string, metrics: { wpm: number; fillerCount: number; durationMs: number; tier: string | null; stt_source: 'voicestudio' | 'whisper' | 'mock' | null; audioUrl?: string | null }) => void;
  onAudioReady?: (url: string) => void;
  showTranscriptToggle?: boolean;
}

export function VoiceRecorder({
  language = 'vi',
  currentTurn,
  onTranscriptReady,
  onRecordingComplete,
  onAudioReady,
  showTranscriptToggle = true,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sttSource, setSttSource] = useState<'voicestudio' | 'whisper' | 'mock' | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveSignal, setLiveSignal] = useState<VoiceSignal | null>(null);

  // Playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);
  const lastDurationRef = useRef<number>(3000);
  const speechRecognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>('');
  const isRecordingActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const url = audioUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audioUrl]);

  // Robust REST API analyze fallback
  const analyzeWithRest = useCallback(async (blob: Blob, durationMs: number) => {
    setState('processing');
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        duration_ms: String(Math.max(1000, durationMs)),
        language,
      });

      const resp = await fetch(`${VOICE_API_BASE}/analyze?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'audio/webm',
        },
        body: blob,
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || body.message || `Lỗi máy chủ (${resp.status})`);
      }

      const data = (await resp.json()) as VoiceAnalyzeResponse;
      if (data.success) {
        setMetrics(data.metrics);
        setTranscript(data.transcript);
        setSttSource(data.stt_source);
        setLiveSignal(null);
        setState('done');
        const generatedAudioUrl = lastBlobRef.current ? URL.createObjectURL(lastBlobRef.current) : audioUrl;
        if (data.transcript && onTranscriptReady) onTranscriptReady(data.transcript);
        if (data.transcript && onRecordingComplete) {
          onRecordingComplete(data.transcript, {
            wpm: data.metrics.wpm,
            fillerCount: data.metrics.filler_count,
            durationMs: data.metrics.duration_ms,
            tier: null,
            stt_source: data.stt_source,
            audioUrl: generatedAudioUrl,
          });
        }
      } else {
        setErrorMsg('Phân tích giọng nói thất bại.');
        setState('error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setErrorMsg(`Lỗi khi phân tích giọng: ${msg}`);
      setState('error');
    }
  }, [language, onTranscriptReady, onRecordingComplete, audioUrl]);

  // WebSocket connection & message handling
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(VOICE_WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
      ws.onmessage = (ev: MessageEvent<string>) => {
        let msg: WsServerMessage;
        try { msg = JSON.parse(ev.data) as WsServerMessage; } catch { return; }
        if (msg.type === 'VOICE_SIGNAL') {
          setLiveSignal(msg);
        } else if (msg.type === 'metrics') {
          setMetrics(msg.metrics);
          setTranscript(msg.transcript);
          setSttSource(msg.stt_source);
          setLiveSignal(null);
          setState('done');
          const generatedAudioUrl = lastBlobRef.current ? URL.createObjectURL(lastBlobRef.current) : audioUrl;
          if (msg.transcript && onTranscriptReady) onTranscriptReady(msg.transcript);
          if (msg.transcript && onRecordingComplete) {
            onRecordingComplete(msg.transcript, {
              wpm: msg.metrics.wpm,
              fillerCount: msg.metrics.filler_count,
              durationMs: msg.metrics.duration_ms,
              tier: null,
              stt_source: msg.stt_source,
              audioUrl: generatedAudioUrl,
            });
          }
        } else if (msg.type === 'error') {
          console.warn('[VOICE_WS] WebSocket returned error, triggering REST fallback:', msg.error);
          if (lastBlobRef.current) {
            void analyzeWithRest(lastBlobRef.current, lastDurationRef.current);
          } else {
            setErrorMsg(msg.error);
            setState('error');
            setLiveSignal(null);
          }
        }
      };
    } catch { /* no WS support */ }
    return () => { wsRef.current?.close(); };
  }, [analyzeWithRest, onRecordingComplete, onTranscriptReady, audioUrl]);

  // Start recording
  const startRecording = useCallback(async () => {
    // Prime and unlock the browser/mobile audio pipeline directly on user interaction gesture
    unlockAudioPipeline();

    setErrorMsg(null);
    setMetrics(null);
    setTranscript('');
    setSttSource(null);
    setLiveSignal(null);
    setIsPlaying(false);
    audioRef.current?.pause();
    audioRef.current = null;
    chunksRef.current = [];
    isRecordingActiveRef.current = true;

    // Initialize Browser Web Speech API for high accuracy, zero-latency Vietnamese STT
    speechTranscriptRef.current = '';
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'en' ? 'en-US' : 'vi-VN';

        recognition.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; ++i) {
            currentText += event.results[i][0].transcript + ' ';
          }
          const cleaned = currentText.trim();
          if (cleaned) {
            speechTranscriptRef.current = cleaned;
            setTranscript(cleaned);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('[SpeechRecognition] Browser STT notice:', e.error || e);
        };

        recognition.onend = () => {
          // If user hasn't explicitly stopped recording, automatically restart to bypass browser timeout
          if (isRecordingActiveRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('[SpeechRecognition] Failed to start browser STT:', err);
      }
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg('Không thể truy cập microphone. Vui lòng cấp quyền micro trong trình duyệt.');
      setState('error');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (ev: BlobEvent) => {
      if (ev.data.size > 0) {
        chunksRef.current.push(ev.data);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              const b64 = (reader.result as string).split(',')[1] ?? '';
              wsRef.current.send(JSON.stringify({ type: 'chunk', audio: b64 }));
            }
          };
          reader.readAsDataURL(ev.data);
        }
      }
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start', language }));
    }

    recorder.start(250);
    startTimeRef.current = Date.now();
    setState('recording');
    timerRef.current = setInterval(() => { setElapsedMs(Date.now() - startTimeRef.current); }, 200);
    maxTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') stopRecording();
    }, MAX_RECORDING_MS);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop recording & analyze
  const stopRecording = useCallback(() => {
    // Prime and unlock audio pipeline on stop gesture
    unlockAudioPipeline();

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    const duration_ms = Date.now() - startTimeRef.current;
    lastDurationRef.current = duration_ms;
    isRecordingActiveRef.current = false;

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((t) => t.stop());
      const mimeType = chunksRef.current[0]?.type ?? 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      lastBlobRef.current = blob;

      const localUrl = URL.createObjectURL(blob);
      setAudioUrl(localUrl);

      if (onAudioReady) {
        const parentUrl = URL.createObjectURL(blob);
        onAudioReady(parentUrl);
      }

      if (duration_ms < 500) {
        setErrorMsg('Ghi âm quá ngắn. Hãy phát biểu ít nhất 2 giây.');
        setState('error');
        return;
      }

      // 1. If Browser Web Speech API captured text successfully, use it immediately
      const browserText = speechTranscriptRef.current.trim();
      if (browserText && browserText.length > 5) {
        const words = browserText.split(/\s+/).filter(Boolean).length;
        const minutes = duration_ms / 60000;
        const wpm = minutes > 0 ? Math.round(words / minutes) : 140;
        const localMetrics: VoiceMetrics = {
          wpm,
          word_count: words,
          duration_ms,
          filler_count: 0,
          fillers_found: [],
          pace_label: `${wpm} WPM`,
          pace_tip: 'Tốc độ phát biểu ổn định',
        };
        setMetrics(localMetrics);
        setTranscript(browserText);
        setSttSource('voicestudio');
        setState('done');
        if (onTranscriptReady) onTranscriptReady(browserText);
        if (onRecordingComplete) {
          onRecordingComplete(browserText, {
            wpm,
            fillerCount: 0,
            durationMs: duration_ms,
            tier: null,
            stt_source: 'voicestudio',
            audioUrl: localUrl,
          });
        }
        return;
      }

      // 2. If WS is actively connected, send end signal
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end', duration_ms }));
        setState('processing');

        // Fallback safety timer in case WS drops
        setTimeout(() => {
          setState((currentState) => {
            if (currentState === 'processing') {
              console.info('[VOICE_WS] WS response timed out, executing REST fallback...');
              void analyzeWithRest(blob, duration_ms);
            }
            return currentState;
          });
        }, 3500);
        return;
      }

      // 3. Fallback: Direct REST API upload
      void analyzeWithRest(blob, duration_ms);
    };

    recorder.stop();
  }, [analyzeWithRest, onAudioReady, onRecordingComplete, onTranscriptReady]);

  // Playback
  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      if (audio.src !== audioUrl) audio.src = audioUrl;
      void audio.play().catch(() => setIsPlaying(false));
    }
  }, [audioUrl, isPlaying]);

  // Delete recording
  const deleteRecording = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsPlaying(false);
    setAudioUrl(null);
    setState('idle');
    setElapsedMs(0);
    setMetrics(null);
    setTranscript('');
    setErrorMsg(null);
    setSttSource(null);
    setLiveSignal(null);
    chunksRef.current = [];
    lastBlobRef.current = null;
  }, []);

  const reset = useCallback(() => { deleteRecording(); }, [deleteRecording]);

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isDone = state === 'done';
  const isError = state === 'error';

  return (
    <div className="w-full flex flex-col gap-3 text-slate-900 dark:text-slate-100">
      {/* ── HEADER STATUS STRIP ── */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center">
            <Volume2 size={15} />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white">Voice Coach DSP</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">Chẩn đoán âm học giọng nói & Whisper STT</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wsConnected ? (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live WS
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Ready
            </span>
          )}
        </div>
      </div>

      {/* ── MAIN CONTROLS & RECORDING AREA ── */}
      <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-white/5">
        {!isRecording && !isProcessing && (
          <div className="flex flex-col items-center gap-2.5 w-full max-w-sm text-center">
            <button
              type="button"
              onClick={() => void startRecording()}
              className="w-full py-3.5 px-6 shimmer-btn text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Mic size={18} className="animate-bounce" />
              <span>
                {isDone || audioUrl
                  ? 'Ghi âm lại lượt này'
                  : currentTurn != null
                  ? `Ghi âm Lượt ${currentTurn}`
                  : 'Bắt đầu ghi âm'}
              </span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Phát biểu rõ ràng vào micro. Hệ thống sẽ tự động đo tốc độ (WPM), phát hiện từ đệm và trích xuất luận điểm.
            </p>
          </div>
        )}

        {isRecording && (
          <div className="w-full flex flex-col items-center gap-4 py-2">
            {/* Soundwave Visualizer Bars */}
            <div className="flex items-center gap-1.5 h-10">
              <span className="w-1.5 h-6 bg-pink-500 rounded-full animate-sound-wave-1 shadow-sm" />
              <span className="w-1.5 h-9 bg-purple-500 rounded-full animate-sound-wave-2 shadow-sm" />
              <span className="w-1.5 h-10 bg-indigo-500 rounded-full animate-sound-wave-3 shadow-sm" />
              <span className="w-1.5 h-8 bg-cyan-500 rounded-full animate-sound-wave-4 shadow-sm" />
              <span className="w-1.5 h-5 bg-emerald-500 rounded-full animate-sound-wave-5 shadow-sm" />
            </div>

            {/* Glowing Digital Timer */}
            <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span>{formatDuration(elapsedMs)}</span>
            </div>

            {/* Real-time Live Web Speech Transcript Feedback */}
            {transcript ? (
              <div className="w-full max-w-md px-3.5 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200/80 dark:border-indigo-500/30 backdrop-blur-md shadow-sm text-left">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Web Speech Live STT
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">vi-VN (Zero-latency)</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed line-clamp-3">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Đang lắng nghe... Hãy bắt đầu phát biểu.
              </p>
            )}

            {/* Stop Button */}
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <MicOff size={16} />
              <span>Dừng & Phân Tích</span>
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <Loader2 size={24} className="animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
              Đang phân tích âm học DSP & chuyển ngữ văn bản (Whisper STT)...
            </span>
          </div>
        )}
      </div>

      {/* Live Signal Box during recording */}
      {isRecording && liveSignal && <CoachSignalBox signal={liveSignal} elapsed={elapsedMs} />}

      {/* Error State */}
      {isError && errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs font-bold underline hover:no-underline cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── POST-RECORDING METRICS & PLAYBACK SECTION ── */}
      {isDone && metrics && (
        <div className="glass-panel p-4 md:p-5 rounded-2xl border border-indigo-200 dark:border-white/10 shadow-md flex flex-col gap-4">
          {/* Top Metrics Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border flex items-center gap-1.5 ${
                metrics.wpm >= 120 && metrics.wpm <= 165
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                  : metrics.wpm > 165
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
              }`}>
                <Gauge size={13} />
                <span>{metrics.wpm} WPM</span>
                <span>•</span>
                <span>{metrics.pace_label}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-600 dark:text-slate-400">
                Từ đã nói: <strong className="text-slate-900 dark:text-white">{metrics.word_count}</strong>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-400">
                Thời lượng: <strong className="text-slate-900 dark:text-white">{formatDuration(metrics.duration_ms)}</strong>
              </span>
            </div>
          </div>

          {/* Pedagogical Tip Box */}
          <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Nhận xét nhịp độ phát biểu:</strong>
              <span>{metrics.pace_tip}</span>
            </div>
          </div>

          {/* Filler Words Alert */}
          {metrics.filler_count > 0 && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span>⚠️ Ghi nhận <strong>{metrics.filler_count}</strong> từ đệm:</span>
                <span className="italic font-medium">
                  {metrics.fillers_found.slice(0, 4).join(', ')}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-md">
                Cần khắc phục
              </span>
            </div>
          )}

          {/* Audio Playback & Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              {audioUrl && (
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md ${
                    isPlaying
                      ? 'bg-amber-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={14} />
                      <span>Dừng nghe</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span>Nghe lại ghi âm</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={deleteRecording}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Xóa ghi âm</span>
              </button>
            </div>

            <button
              type="button"
              onClick={reset}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Ghi âm lại</span>
            </button>
          </div>

          {/* Transcript Preview Toggle */}
          {transcript && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              {showTranscriptToggle && (
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer mb-2"
                >
                  {showTranscript ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showTranscript ? 'Ẩn văn bản giọng nói' : 'Hiện văn bản giọng nói đã nhận diện'}</span>
                </button>
              )}

              {(showTranscript || !showTranscriptToggle) && (
                <div className="bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  <div className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Bản ghi nhận diện giọng nói:</span>
                    {sttSource && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">{sttSource}</span>}
                  </div>
                  <p className="italic">{transcript}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceRecorder;
