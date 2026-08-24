import React from 'react';
import { TurnData } from '../DebateArena';
import { DebateStance } from '../../lib/api';
import { stopSpeaking } from '../../utils/tts';

export interface SparringFeedProps {
  currentTurnData?: TurnData | null;
  selectedTurn: number;
  stance: DebateStance;
  inputMode: 'text' | 'voice';
  autoPlayTts: boolean;
  setAutoPlayTts: React.Dispatch<React.SetStateAction<boolean>>;
  isTtsPlaying: boolean;
  userAudioPlayingTurn: number | null;
  toggleUserAudioPlayback: (url: string, turnIndex: number) => void;
  handleTtsPlayback: (text: string, audioUrl?: string | null) => void;
  isLoading: boolean;
  language?: 'vi' | 'en';
}

export const SparringFeed: React.FC<SparringFeedProps> = ({
  currentTurnData,
  selectedTurn,
  stance,
  inputMode,
  autoPlayTts,
  setAutoPlayTts,
  isTtsPlaying,
  userAudioPlayingTurn,
  toggleUserAudioPlayback,
  handleTtsPlayback,
  isLoading,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE CONVERSATION SPARRING STREAM (< 768px)
          Compact chat-style cards with touch targets >= 44px
      ───────────────────────────────────────────────────────────── */}
      <div className="flex md:hidden flex-col gap-3.5 w-full">
        {/* Mobile User Speech Bubble */}
        {currentTurnData && (
          <div className="glass-panel-elevated rounded-2xl p-4 border border-indigo-200 dark:border-indigo-500/30 shadow-md flex flex-col gap-2.5 transition-all">
            {/* Header: User Badge + Turn + Telemetry */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {isVi ? 'Luận Điểm Của Bạn' : 'Your Argument'}
                  </h3>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    {isVi ? 'Lượt' : 'Turn'} {currentTurnData.turnNumber}
                  </span>
                </div>
              </div>

              {/* Acoustic Telemetry & Audio Replay Button (touch target >= 44px) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {currentTurnData.wpm != null && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    {currentTurnData.wpm} WPM
                  </span>
                )}
                {currentTurnData.fillers != null && currentTurnData.fillers > 0 && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
                    {currentTurnData.fillers} {isVi ? 'từ đệm' : 'fillers'}
                  </span>
                )}
                {currentTurnData.audioUrl && (
                  <button
                    type="button"
                    onClick={() => toggleUserAudioPlayback(currentTurnData.audioUrl!, selectedTurn)}
                    className="min-h-[44px] min-w-[44px] text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 transition cursor-pointer font-semibold active:scale-95 shadow-sm"
                    aria-label={userAudioPlayingTurn === selectedTurn ? (isVi ? 'Dừng nghe lại' : 'Pause audio') : (isVi ? 'Nghe lại phát biểu' : 'Replay audio')}
                  >
                    {userAudioPlayingTurn === selectedTurn ? (
                      <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    )}
                    <span className="text-[11px]">{userAudioPlayingTurn === selectedTurn ? (isVi ? 'Dừng' : 'Pause') : (isVi ? 'Nghe lại' : 'Replay')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Speech Bubble Content */}
            <div className="bg-indigo-600/5 dark:bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-500/15 text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
              {currentTurnData.userText}
            </div>
          </div>
        )}

        {/* Mobile AI Opponent Speech Bubble */}
        <div className="glass-panel-elevated rounded-2xl p-4 border border-indigo-200 dark:border-indigo-500/30 shadow-lg shadow-indigo-500/5 flex flex-col gap-2.5 transition-all">
          {/* Header: Avatar + Bot Info + Audio Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/30 shrink-0">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <svg width="16" height="16" className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
                  </svg>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Sơn Tùng (AI)</h3>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-500/20">
                    {stance === 'AFFIRMATIVE' ? (isVi ? 'Phản đối' : 'NEG') : (isVi ? 'Ủng hộ' : 'AFF')}
                  </span>
                </div>
                {currentTurnData && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {isVi ? `Phản biện Lượt ${currentTurnData.turnNumber}` : `Rebuttal Turn ${currentTurnData.turnNumber}`}
                  </span>
                )}
              </div>
            </div>

            {/* AI Audio Controls (Touch targets >= 44px) */}
            <div className="flex items-center gap-1.5">
              {inputMode === 'voice' && (
                <button
                  type="button"
                  onClick={() => {
                    setAutoPlayTts((v) => {
                      const next = !v;
                      if (!next) {
                        stopSpeaking();
                      }
                      try { localStorage.setItem('arena_autoplay_tts', String(next)); } catch {}
                      return next;
                    });
                  }}
                  className={`min-h-[44px] min-w-[44px] text-xs px-2.5 py-2 rounded-xl border transition flex items-center justify-center gap-1 cursor-pointer font-medium active:scale-95 ${
                    autoPlayTts
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                  }`}
                  aria-label={isVi ? `Tự động phát âm: ${autoPlayTts ? 'Bật' : 'Tắt'}` : `Auto Audio: ${autoPlayTts ? 'On' : 'Off'}`}
                  title={isVi ? 'Bật/Tắt tự động phát âm khi AI đối thủ phản hồi' : 'Toggle auto TTS voice for AI opponent'}
                >
                  <span className="text-xs">🔊</span>
                  <span className="text-[11px] font-semibold">{autoPlayTts ? (isVi ? 'Tự đọc' : 'Auto') : (isVi ? 'Tắt' : 'Off')}</span>
                </button>
              )}
              {currentTurnData?.opponentText && (
                <button
                  type="button"
                  onClick={() => handleTtsPlayback(currentTurnData.opponentText, currentTurnData.opponentAudioUrl)}
                  className="min-h-[44px] min-w-[44px] text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-300 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 transition cursor-pointer active:scale-95 shadow-sm"
                  aria-label={isTtsPlaying ? (isVi ? 'Dừng đọc phản biện' : 'Stop voice') : (isVi ? 'Nghe AI đọc phản biện' : 'Listen to AI voice')}
                >
                  {isTtsPlaying ? (
                    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" x2="17" y1="9" y2="15"/>
                      <line x1="17" x2="23" y1="9" y2="15"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                  )}
                  <span className="text-[11px] font-semibold">{isTtsPlaying ? (isVi ? 'Dừng' : 'Stop') : (isVi ? 'Nghe' : 'Listen')}</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Response Text Bubble */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words relative">
            {isLoading ? (
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 animate-pulse py-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>{isVi ? 'Đang thiết lập luận cứ phản biện và bẻ gãy giả định...' : 'Generating counterargument and deconstructing assumptions...'}</span>
              </div>
            ) : currentTurnData?.opponentText ? (
              currentTurnData.opponentText
            ) : (
              <span className="text-slate-500 dark:text-slate-400 italic text-xs">
                {isVi ? 'Hãy phát biểu luận điểm mở màn (Lượt 1) để bắt đầu phiên tranh biện đối kháng.' : 'Please deliver your opening argument (Turn 1) to begin the debate.'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DESKTOP SPARRING STAGE (>= 768px)
          100% Preserved Baseline Layout & Behavior
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-col gap-4 w-full">
        {/* Card 2: User's Argument for Selected Turn (If at least 1 turn exists) */}
        {currentTurnData && (
          <div className="glass-panel-elevated rounded-2xl p-5 border border-indigo-200 dark:border-indigo-500/30 shadow-md relative transition-all">
            <div className="flex items-start gap-4">
              {/* User Avatar Badge */}
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
                <svg width="16" height="16" className="w-4 h-4 text-white shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>

              {/* User Speech Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {isVi ? 'Luận Điểm Của Bạn' : 'Your Argument'}
                    </h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-500/30 font-mono">
                      {isVi ? 'Lượt' : 'Turn'} {currentTurnData.turnNumber}
                    </span>
                  </div>

                  {/* Acoustic Telemetry Pills & Audio Playback (Voice mode only) */}
                  <div className="flex items-center gap-2">
                    {currentTurnData.wpm != null && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {currentTurnData.wpm} WPM
                      </span>
                    )}
                    {currentTurnData.fillers != null && currentTurnData.fillers > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
                        {currentTurnData.fillers} {isVi ? 'từ đệm' : 'fillers'}
                      </span>
                    )}
                    {currentTurnData.audioUrl && (
                      <button
                        type="button"
                        onClick={() => toggleUserAudioPlayback(currentTurnData.audioUrl!, selectedTurn)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 transition cursor-pointer font-semibold"
                        aria-label={userAudioPlayingTurn === selectedTurn ? (isVi ? 'Dừng nghe' : 'Pause') : (isVi ? 'Nghe lại' : 'Replay')}
                      >
                        {userAudioPlayingTurn === selectedTurn ? (
                          <svg width="12" height="12" className="w-3 h-3 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16"/>
                            <rect x="14" y="4" width="4" height="16"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" className="w-3 h-3 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                        )}
                        <span>{userAudioPlayingTurn === selectedTurn ? (isVi ? 'Dừng nghe' : 'Pause') : (isVi ? 'Nghe lại' : 'Replay')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                  {currentTurnData.userText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: AI Opponent Response for Selected Turn */}
        <div className="glass-panel-elevated rounded-2xl p-5 border border-indigo-200 dark:border-indigo-500/30 shadow-xl shadow-indigo-500/5 relative transition-all">
          <div className="flex items-start gap-4">
            {/* Persona Avatar */}
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/30 shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center">
                <svg width="20" height="20" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
                </svg>
              </div>
            </div>

            {/* Persona Dialogue */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sơn Tùng (AI Opponent)</h3>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-500/20">
                    {stance === 'AFFIRMATIVE' ? (isVi ? 'Phản đối' : 'NEGATIVE') : (isVi ? 'Ủng hộ' : 'AFFIRMATIVE')}
                  </span>
                  {currentTurnData && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      ({isVi ? `Phản biện Lượt ${currentTurnData.turnNumber}` : `Rebuttal Turn ${currentTurnData.turnNumber}`})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {inputMode === 'voice' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAutoPlayTts((v) => {
                          const next = !v;
                          if (!next) {
                            stopSpeaking();
                          }
                          try { localStorage.setItem('arena_autoplay_tts', String(next)); } catch {}
                          return next;
                        });
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer font-medium ${
                        autoPlayTts
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                      }`}
                      aria-label={isVi ? `Tự động phát âm: ${autoPlayTts ? 'Bật' : 'Tắt'}` : `Auto Audio: ${autoPlayTts ? 'On' : 'Off'}`}
                      title={isVi ? 'Bật/Tắt tự động phát âm khi AI đối thủ phản hồi (chế độ giọng nói)' : 'Toggle auto TTS voice for AI opponent (voice mode)'}
                    >
                      <span>🔊 {isVi ? `Tự phát âm: ${autoPlayTts ? 'Bật' : 'Tắt'}` : `Auto Audio: ${autoPlayTts ? 'On' : 'Off'}`}</span>
                    </button>
                  )}
                  {currentTurnData?.opponentText && (
                    <button
                      type="button"
                      onClick={() => handleTtsPlayback(currentTurnData.opponentText, currentTurnData.opponentAudioUrl)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                      aria-label={isTtsPlaying ? (isVi ? 'Dừng đọc' : 'Stop') : (isVi ? 'Phát âm' : 'Listen')}
                    >
                      {isTtsPlaying ? (
                        <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <line x1="23" x2="17" y1="9" y2="15"/>
                          <line x1="17" x2="23" y1="9" y2="15"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                        </svg>
                      )}
                      <span>{isTtsPlaying ? (isVi ? 'Dừng đọc' : 'Stop') : (isVi ? 'Phát âm' : 'Listen')}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words relative">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 animate-pulse py-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    <span>{isVi ? 'Đang thiết lập luận cứ phản biện và bẻ gãy giả định...' : 'Generating counterargument and deconstructing assumptions...'}</span>
                  </div>
                ) : currentTurnData?.opponentText ? (
                  currentTurnData.opponentText
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 italic">
                    {isVi ? 'Hãy phát biểu luận điểm mở màn (Lượt 1) để bắt đầu phiên tranh biện đối kháng.' : 'Please deliver your opening argument (Turn 1) to begin the debate.'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
