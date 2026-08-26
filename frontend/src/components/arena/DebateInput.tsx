import React from 'react';
import { TurnData } from '../DebateArena';
import { VoiceEntitlementResult, VoiceMetricsPayload } from '../../lib/api';
import { VoiceRecorder } from '../VoiceRecorder';
import { stopActiveSpeech, unlockAudioPipeline } from '../../utils/tts';

export interface DebateInputProps {
  inputMode: 'text' | 'voice';
  setInputMode: (mode: 'text' | 'voice') => void;
  setAutoPlayTts: React.Dispatch<React.SetStateAction<boolean>>;
  turns: TurnData[];
  selectedTurn: number;
  setSelectedTurn: (turnIndex: number) => void;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  onSendArgument: (
    overrideText?: string,
    voiceMetrics?: VoiceMetricsPayload,
    audioUrl?: string | null,
    targetArgId?: string | null
  ) => Promise<void> | void;
  isLoading: boolean;
  isCheckingEntitlement: boolean;
  voiceEntitlement: VoiceEntitlementResult | null;
  onCheckVoiceEntitlement: () => Promise<void> | void;
  onRefreshUser: () => Promise<void> | void;
  onOpenPricingModal: () => void;
  isCompleted?: boolean;
  onOpenSummary?: () => void;
  onStartNewDebate?: () => void;
  onNavigateToHistory?: () => void;
  language?: 'vi' | 'en';
}

export const DebateInput: React.FC<DebateInputProps> = ({
  inputMode,
  setInputMode,
  setAutoPlayTts,
  turns,
  selectedTurn,
  setSelectedTurn,
  inputText,
  setInputText,
  onSendArgument,
  isLoading,
  isCheckingEntitlement,
  voiceEntitlement,
  onCheckVoiceEntitlement,
  onRefreshUser,
  onOpenPricingModal,
  isCompleted = false,
  onOpenSummary,
  onStartNewDebate,
  onNavigateToHistory,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const mobileTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea on mobile (min 72px up to 160px)
  React.useEffect(() => {
    if (mobileTextareaRef.current) {
      mobileTextareaRef.current.style.height = 'auto';
      const scrollH = mobileTextareaRef.current.scrollHeight;
      const nextH = Math.min(160, Math.max(72, scrollH));
      mobileTextareaRef.current.style.height = `${nextH}px`;
    }
  }, [inputText, inputMode]);

  const handleMobileFocus = () => {
    // Smoothly scroll into visible view when mobile keyboard pops up
    setTimeout(() => {
      mobileTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 250);
  };

  if (isCompleted) {
    return (
      <div className="glass-panel-elevated rounded-2xl p-5 md:p-6 border border-emerald-500/30 bg-emerald-500/5 transition-all text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shadow-md shadow-emerald-500/20">
          🏆
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {isVi ? 'Phiên Tranh Biện Đã Kết Thúc' : 'Debate Session Completed'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            {isVi
              ? `Phiên đấu gồm ${turns.length} lượt tranh luận đã hoàn thành và được lưu an toàn vào Lịch sử & Báo cáo Tư Duy.`
              : `Match of ${turns.length} turns completed and saved to History & Thinking Profile.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {onOpenSummary && (
            <button
              type="button"
              onClick={onOpenSummary}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 active:scale-95 transition cursor-pointer min-h-[44px]"
            >
              <span>📊 {isVi ? 'Xem Tổng Kết Trận Đấu' : 'View Match Summary'}</span>
            </button>
          )}

          {onNavigateToHistory && (
            <button
              type="button"
              onClick={onNavigateToHistory}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer min-h-[44px]"
            >
              <span>📜 {isVi ? 'Xem Trong Lịch Sử' : 'View in History'}</span>
            </button>
          )}

          {onStartNewDebate && (
            <button
              type="button"
              onClick={onStartNewDebate}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer min-h-[44px]"
            >
              <span>🔥 {isVi ? 'Bắt Đầu Phiên Mới' : 'Start New Match'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel-elevated rounded-2xl p-4 md:p-5 transition-all">
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE INPUT CONSOLE (< 768px)
          Streamlined single-column controls with touch targets >= 44px
      ───────────────────────────────────────────────────────────── */}
      <div className="flex md:hidden flex-col gap-3 w-full">
        {/* Mobile Mode Switcher & Turn Indicator */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs sm:text-sm w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setInputMode('text');
                setAutoPlayTts(false);
                stopActiveSpeech();
                try { localStorage.setItem('arena_autoplay_tts', 'false'); } catch {}
              }}
              className={`flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition font-semibold cursor-pointer ${
                inputMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>
              </svg>
              <span>{isVi ? 'Soạn Văn Bản' : 'Text'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                unlockAudioPipeline();
                setInputMode('voice');
                setAutoPlayTts(true);
                try { localStorage.setItem('arena_autoplay_tts', 'true'); } catch {}
              }}
              className={`flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition font-semibold cursor-pointer ${
                inputMode === 'voice'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
              <span>{isVi ? 'Giọng Nói AI' : 'Voice AI'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Input Content */}
        {inputMode === 'text' ? (
          <div className="flex flex-col gap-2.5">
            <textarea
              ref={mobileTextareaRef}
              rows={3}
              value={inputText}
              onFocus={handleMobileFocus}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isVi ? `Nhập luận cứ của bạn cho Lượt ${turns.length + 1} theo cấu trúc C-R-E (Claim, Reasoning, Evidence)...` : `State your argument for Turn ${turns.length + 1} following C-R-E (Claim, Reasoning, Evidence)...`}
              className="w-full min-h-[72px] bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none transition leading-relaxed overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void onSendArgument();
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">{isVi ? 'Lượt ' + (turns.length + 1) : 'Turn ' + (turns.length + 1)}</span>
              <button
                type="button"
                onClick={() => onSendArgument()}
                disabled={isLoading || !inputText.trim()}
                className="min-h-[44px] min-w-[44px] px-5 py-2.5 shimmer-btn disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-indigo-600/20"
                aria-label={isVi ? `Gửi Luận Điểm Lượt ${turns.length + 1}` : `Submit Argument Turn ${turns.length + 1}`}
              >
                <span>{isLoading ? (isVi ? 'Đang phân tích...' : 'Analyzing...') : (isVi ? `Gửi Luận Điểm (Lượt ${turns.length + 1})` : `Submit (Turn ${turns.length + 1})`)}</span>
                <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-1 space-y-3">
            {isCheckingEntitlement ? (
              <div className="py-6 text-center text-xs text-slate-500 animate-pulse flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>{isVi ? 'Đang kiểm tra quyền hạn phát biểu Voice AI...' : 'Verifying Voice AI entitlement...'}</span>
              </div>
            ) : voiceEntitlement && !voiceEntitlement.allowed ? (
              /* Quota Exceeded Banner (Touch targets >= 44px) */
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2.5">
                <div className="text-xl">⚠️</div>
                <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {isVi ? 'Hạn Ngạch Giọng Nói Đã Hết (Quota Exceeded)' : 'Voice AI Quota Exceeded'}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {isVi
                    ? 'Bạn đã sử dụng hết số phút Voice AI khả dụng. Hãy nạp thêm gói Voice Boost hoặc chuyển sang soạn văn bản.'
                    : 'Voice minutes exhausted. Top up or switch to text mode.'}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onOpenPricingModal}
                    className="min-h-[44px] w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ⚡ {isVi ? 'Nạp Voice Boost (15k / 49k)' : 'Top Up Voice Boost'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className="min-h-[44px] w-full sm:w-auto px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center"
                  >
                    {isVi ? 'Soạn Văn Bản' : 'Switch to Text'}
                  </button>
                </div>
              </div>
            ) : (
              /* Entitled State */
              <>
                {voiceEntitlement && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      {voiceEntitlement.source === 'VIP' ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          👑 VIP Pass: Không trừ quota
                        </span>
                      ) : (
                        <span className="font-semibold">
                          💎 {isVi ? 'Khả dụng:' : 'Available:'} {voiceEntitlement.availableMinutes ?? 0} {isVi ? 'phút' : 'mins'}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {isVi ? 'Tối đa 15p / phiên' : 'Max 15m / session'}
                    </span>
                  </div>
                )}

                <VoiceRecorder
                  key={`voice-turn-${turns.length + 1}`}
                  language={language}
                  currentTurn={turns.length + 1}
                  onTranscriptReady={(text) => setInputText(text)}
                  onRecordingComplete={(transcript, metrics) => {
                    void onSendArgument(
                      transcript,
                      {
                        wpm: metrics.wpm,
                        fillerCount: metrics.fillerCount,
                        durationMs: metrics.durationMs,
                        tier: metrics.tier ?? undefined,
                        stt_source: metrics.stt_source ?? undefined,
                      },
                      metrics.audioUrl,
                    );
                    void onCheckVoiceEntitlement();
                    void onRefreshUser();
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DESKTOP INPUT CONSOLE (>= 768px)
          100% Preserved Baseline Layout & Behavior
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col gap-0 w-full">
        {/* Mode Selector & Turn Navigation Header */}
        <div className="flex items-center justify-between mb-3.5 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setInputMode('text');
                setAutoPlayTts(false);
                stopActiveSpeech();
                try { localStorage.setItem('arena_autoplay_tts', 'false'); } catch {}
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-semibold cursor-pointer ${
                inputMode === 'text'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>
              </svg>
              <span>{isVi ? 'Soạn Văn Bản' : 'Text Mode'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                unlockAudioPipeline();
                setInputMode('voice');
                setAutoPlayTts(true);
                try { localStorage.setItem('arena_autoplay_tts', 'true'); } catch {}
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-semibold cursor-pointer ${
                inputMode === 'voice'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" x2="12" y1="19" y2="22"/>
              </svg>
              <span>{isVi ? 'Phát Biểu Giọng Nói' : 'Voice Recording'}</span>
            </button>
          </div>

          {/* Turn selector buttons */}
          {turns.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px] mr-0.5">{isVi ? 'Xem Lượt:' : 'View Turn:'}</span>
              {turns.map((t, idx) => (
                <button
                  key={t.turnNumber}
                  type="button"
                  onClick={() => setSelectedTurn(idx)}
                  className={`w-7 h-7 text-xs font-bold rounded-lg transition cursor-pointer ${
                    selectedTurn === idx
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {t.turnNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input / Recorder Area */}
        {inputMode === 'text' ? (
          <div className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isVi ? `Nhập luận cứ của bạn cho Lượt ${turns.length + 1} theo cấu trúc C-R-E (Claim, Reasoning, Evidence)...` : `State your argument for Turn ${turns.length + 1} following C-R-E (Claim, Reasoning, Evidence)...`}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void onSendArgument();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">{isVi ? 'Mẹo: Nhấn Ctrl + Enter để gửi' : 'Tip: Press Ctrl + Enter to submit'}</span>
              <button
                type="button"
                onClick={() => onSendArgument()}
                disabled={isLoading || !inputText.trim()}
                className="px-5 py-2.5 shimmer-btn disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 cursor-pointer"
                aria-label={isVi ? `Gửi Luận Điểm Lượt ${turns.length + 1}` : `Submit Argument Turn ${turns.length + 1}`}
              >
                <span>{isLoading ? (isVi ? 'Đang phân tích...' : 'Analyzing...') : (isVi ? `Gửi Luận Điểm (Lượt ${turns.length + 1})` : `Submit Argument (Turn ${turns.length + 1})`)}</span>
                <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-1 space-y-3">
            {isCheckingEntitlement ? (
              <div className="py-8 text-center text-xs text-slate-500 animate-pulse flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>{isVi ? 'Đang kiểm tra quyền hạn phát biểu Voice AI...' : 'Verifying Voice AI entitlement...'}</span>
              </div>
            ) : voiceEntitlement && !voiceEntitlement.allowed ? (
              /* STATE G: QUOTA EXCEEDED */
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                <div className="text-2xl">⚠️</div>
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {isVi ? 'Hạn Ngạch Giọng Nói Đã Hết (Quota Exceeded)' : 'Voice AI Quota Exceeded'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {isVi
                    ? 'Bạn đã sử dụng hết số phút Voice AI khả dụng trong chu kỳ hiện tại. Hãy nạp thêm gói Voice Boost hoặc nâng cấp để tiếp tục phát biểu trực tiếp.'
                    : 'Your available voice minutes are fully exhausted. Top up with Voice Boost or upgrade your tier to continue.'}
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onOpenPricingModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                  >
                    ⚡ {isVi ? 'Nạp Voice Boost (15k / 49k)' : 'Top Up Voice Boost'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isVi ? 'Chuyển Sang Soạn Văn Bản' : 'Switch to Text Mode'}
                  </button>
                </div>
              </div>
            ) : (
              /* STATE B-F: ENTITLED */
              <>
                {voiceEntitlement && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      {voiceEntitlement.source === 'VIP' ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                          👑 VIP Pass: Không trừ quota
                        </span>
                      ) : (
                        <span className="font-semibold">
                          💎 {isVi ? 'Khả dụng:' : 'Available:'} {voiceEntitlement.availableMinutes ?? 0} {isVi ? 'phút' : 'mins'}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {isVi ? 'Tối đa 15 phút / phiên' : 'Max 15 min / session'}
                    </span>
                  </div>
                )}

                <VoiceRecorder
                  key={`voice-turn-${turns.length + 1}`}
                  language={language}
                  currentTurn={turns.length + 1}
                  onTranscriptReady={(text) => setInputText(text)}
                  onRecordingComplete={(transcript, metrics) => {
                    void onSendArgument(
                      transcript,
                      {
                        wpm: metrics.wpm,
                        fillerCount: metrics.fillerCount,
                        durationMs: metrics.durationMs,
                        tier: metrics.tier ?? undefined,
                        stt_source: metrics.stt_source ?? undefined,
                      },
                      metrics.audioUrl,
                    );
                    void onCheckVoiceEntitlement();
                    void onRefreshUser();
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
