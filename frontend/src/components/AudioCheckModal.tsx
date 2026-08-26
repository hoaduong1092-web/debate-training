/**
 * AudioCheckModal.tsx — Pre-match Audio Device Testing Modal (Mic & Speaker)
 *
 * Provides real-time microphone volume visualization via Web Audio API (AnalyserNode),
 * microphone permission status verification, and speaker test chime/sound playback.
 * Fully styled in Glassmorphism / Cyber-Academic THINKING OS v15 design language.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2, AlertCircle, Sparkles, X, Play } from 'lucide-react';

interface AudioCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioCheckModal: React.FC<AudioCheckModalProps> = ({ isOpen, onClose }) => {
  // Mic Testing State
  const [isMicTesting, setIsMicTesting] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [micVolume, setMicVolume] = useState(0); // 0 to 100
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // Speaker Testing State
  const [isSpeakerTesting, setIsSpeakerTesting] = useState(false);
  const [speakerSuccess, setSpeakerSuccess] = useState(false);

  // References for Web Audio API & MediaStream
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Stop & Clean up MediaStream and AudioContext
  const cleanupMicTest = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {}
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        void audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsMicTesting(false);
    setMicVolume(0);
  }, []);

  // Start Microphone Test with Web Audio Analyser
  const startMicTest = useCallback(async () => {
    cleanupMicTest();
    setMicErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setMicPermission('granted');
      setIsMicTesting(true);

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] ?? 0;
        }
        const average = sum / bufferLength;
        // Normalize to 0-100 scale with slight boost for responsive UI
        const normalized = Math.min(100, Math.round((average / 128) * 100 * 1.5));
        setMicVolume(normalized);

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: unknown) {
      console.warn('[AudioCheck] Microphone access error:', err);
      setMicPermission('denied');
      setIsMicTesting(false);
      setMicErrorMessage('Vui lòng cấp quyền sử dụng Micro trên trình duyệt để tham gia tranh biện.');
    }
  }, [cleanupMicTest]);

  // Test Speaker with melodic Web Audio chime
  const testSpeaker = useCallback(() => {
    setIsSpeakerTesting(true);
    setSpeakerSuccess(false);

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      // Play a pleasant 3-note ascending chime (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.16);

        // Envelope: quick attack and smooth decay
        gain.gain.setValueAtTime(0.001, now + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.16 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.16);
        osc.stop(now + idx * 0.16 + 0.36);
      });

      setTimeout(() => {
        setIsSpeakerTesting(false);
        setSpeakerSuccess(true);
        void ctx.close();
      }, 900);
    } catch (e) {
      console.warn('[AudioCheck] Speaker test fallback error:', e);
      setIsSpeakerTesting(false);
      // Fallback to SpeechSynthesis if available
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance('Hệ thống âm thanh sẵn sàng');
        utter.lang = 'vi-VN';
        utter.rate = 1.1;
        utter.onend = () => setSpeakerSuccess(true);
        window.speechSynthesis.speak(utter);
      }
    }
  }, []);

  // Auto-start Mic test when modal opens, clean up when it closes
  useEffect(() => {
    if (isOpen) {
      void startMicTest();
    } else {
      cleanupMicTest();
      setIsSpeakerTesting(false);
      setSpeakerSuccess(false);
    }
    return () => {
      cleanupMicTest();
    };
  }, [isOpen, startMicTest, cleanupMicTest]);

  // Escape key handler for AudioCheckModal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-elevated w-full max-w-md rounded-2xl p-6 relative border border-slate-200 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-slate-900/95 transition-all text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Kiểm Tra Thiết Bị Âm Thanh</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Đảm bảo Micro và Loa sẵn sàng trước khi đấu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Microphone Testing & Visualizer */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                {isMicTesting ? (
                  <Mic className="w-4 h-4 text-emerald-500 animate-pulse" />
                ) : (
                  <MicOff className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">1. Micro Thu Âm</span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  micPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : micPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {micPermission === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Đã kết nối
                  </>
                ) : micPermission === 'denied' ? (
                  <>
                    <AlertCircle className="w-3 h-3" /> Bị từ chối
                  </>
                ) : (
                  'Đang kiểm tra...'
                )}
              </span>
            </div>

            {/* Error state */}
            {micErrorMessage && (
              <div className="p-2.5 mb-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{micErrorMessage}</span>
              </div>
            )}

            {/* Live Volume Meter Visualizer */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span>Âm lượng thu</span>
                <span>{micVolume}%</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 flex items-center">
                <div
                  className={`h-full rounded-full transition-all duration-75 ${
                    micVolume > 75
                      ? 'bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500'
                      : micVolume > 20
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.max(4, micVolume)}%` }}
                />
              </div>

              {/* Multi-band Graphic Frequency Simulation */}
              <div className="flex items-end justify-between h-8 gap-1 pt-2 px-1 w-full">
                {Array.from({ length: 16 }).map((_, i) => {
                  // Simulate varied frequency wave heights based on master micVolume
                  const multiplier = Math.sin((i / 15) * Math.PI) + 0.3;
                  const heightPct = isMicTesting
                    ? Math.min(100, Math.max(10, Math.round(micVolume * multiplier * (0.6 + (i % 3) * 0.2))))
                    : 10;
                  return (
                    <div
                      key={i}
                      className={`w-full rounded-t transition-all duration-75 ${
                        heightPct > 50
                          ? 'bg-indigo-500 dark:bg-indigo-400'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Test action buttons */}
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isMicTesting ? '💡 Nói thử vào Micro để thấy vạch sóng nhảy' : 'Micro đang tạm dừng'}
              </span>
              <button
                type="button"
                onClick={isMicTesting ? cleanupMicTest : startMicTest}
                className="min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isMicTesting ? 'Tạm dừng' : 'Bật lại'}
              </button>
            </div>
          </div>

          {/* Section 2: Speaker / Audio Output Testing */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 ${isSpeakerTesting ? 'text-indigo-500 animate-bounce' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">2. Loa & Tai Nghe</span>
              </div>
              {speakerSuccess && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đã phát âm thanh ✓
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Bấm nút bên dưới để phát âm thanh kiểm tra đối thủ AI và giọng nói Coach.
            </p>

            <button
              type="button"
              onClick={testSpeaker}
              disabled={isSpeakerTesting}
              className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-75 cursor-pointer"
            >
              {isSpeakerTesting ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <span>Đang phát âm thanh kiểm tra...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>🔊 Nghe thử Loa (Test Speaker)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Sẵn sàng bước vào Đấu trường</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
          >
            Hoàn Tất & Đấu Ngay
          </button>
        </div>
      </div>
    </div>
  );
};
