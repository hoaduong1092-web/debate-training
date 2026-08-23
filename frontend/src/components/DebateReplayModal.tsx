import React, { useState, useEffect } from 'react';
import { fetchDebateReplay, ReplaySessionDetails } from '../lib/api';
import { speakOpponentResponse, stopSpeaking } from '../utils/tts';

interface Props {
  sessionId: string | null;
  onClose: () => void;
}



export const DebateReplayModal: React.FC<Props> = ({ sessionId, onClose }) => {
  const [data, setData] = useState<ReplaySessionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);

  const handleClose = () => {
    stopSpeaking();
    setIsTtsPlaying(false);
    onClose();
  };

  // Safe global cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Listen to Escape key to close modal and stop audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Stop audio and reset state when switching round
  useEffect(() => {
    stopSpeaking();
    setIsTtsPlaying(false);
  }, [selectedRound]);

  useEffect(() => {
    stopSpeaking();
    setIsTtsPlaying(false);

    if (sessionId) {
      setLoading(true);
      setError(null);

      // Function to try local fallback
      const tryLocalFallback = () => {
        try {
          const localRaw = localStorage.getItem(`local_debate_replay_${sessionId}`);
          if (localRaw) {
            const parsed = JSON.parse(localRaw);
            if (parsed && parsed.session) {
              setData(parsed);
              setSelectedRound(1);
              return true;
            }
          }
        } catch (e) {
          console.warn('[Replay] local storage parse error:', e);
        }
        return false;
      };

      fetchDebateReplay(sessionId)
        .then((res) => {
          if (res.success && res.session && (res.turns?.length || res.transcripts?.length)) {
            setData(res);
            setSelectedRound(1);
          } else {
            const foundLocal = tryLocalFallback();
            if (!foundLocal) {
              if (res.session) {
                setData(res);
                setSelectedRound(1);
              } else {
                setError('Không thể tải dữ liệu trận đấu.');
              }
            }
          }
        })
        .catch((err) => {
          console.warn('[Replay] Load API error, trying local storage:', err);
          const foundLocal = tryLocalFallback();
          if (!foundLocal) {
            setError('Lỗi khi tải dữ liệu trận đấu.');
          }
        })
        .finally(() => setLoading(false));
    }

    return () => {
      stopSpeaking();
    };
  }, [sessionId]);

  if (!sessionId) return null;

  const turns = data?.turns || data?.transcripts || [];

  // Group transcripts into round pairs (User turn + Opponent turn)
  const userTurns = turns.filter((t) => (t.speaker_type || t.speakerType) === 'user');
  const totalRounds = Math.max(1, userTurns.length);

  const currentUserTurn = userTurns[selectedRound - 1] || null;
  const currentOpponentTurn = turns.find(
    (t) =>
      (t.speaker_type || t.speakerType) !== 'user' &&
      (t.turn_number === (currentUserTurn?.turn_number ?? 0) + 1 ||
        t.turnNumber === (currentUserTurn?.turnNumber ?? 0) + 1),
  ) || null;

  const rawCoach = currentUserTurn?.coach_feedback || currentUserTurn?.coachFeedback || null;
  const coachScore = typeof rawCoach?.score === 'number' && Number.isFinite(rawCoach.score) ? rawCoach.score : null;

  const coach = rawCoach ? {
    score: coachScore,
    cre_analysis: {
      claim: rawCoach?.cre_analysis?.claim || '',
      reasoning: rawCoach?.cre_analysis?.reasoning || '',
      evidence: rawCoach?.cre_analysis?.evidence || '',
    },
    strengths: rawCoach?.strengths || [],
    weaknesses: rawCoach?.weaknesses || [],
    actionable_suggestions: rawCoach?.actionable_suggestions || [],
  } : null;

  const fallacies = currentUserTurn?.fallacies_detected || currentUserTurn?.fallacies || [];
  const voiceMetrics = currentUserTurn?.voice_metrics || currentUserTurn?.voiceMetrics || null;

  const handleTtsPlayback = (text: string) => {
    if (isTtsPlaying) {
      stopSpeaking();
      setIsTtsPlaying(false);
    } else {
      setIsTtsPlaying(true);
      speakOpponentResponse(text, {
        lang: 'vi-VN',
        gender: 'female',
        rate: 1.0,
        pitch: 1.02,
        onEnd: () => setIsTtsPlaying(false),
      });
    }
  };

  const session = data?.session;
  const overallScore = typeof session?.score_total === 'number' && Number.isFinite(session.score_total)
    ? session.score_total
    : coachScore;
  const contentScore = typeof session?.score_content === 'number' && Number.isFinite(session.score_content)
    ? session.score_content
    : null;
  const styleScore = typeof session?.score_style === 'number' && Number.isFinite(session.score_style)
    ? session.score_style
    : null;
  const strategyScore = typeof session?.score_strategy === 'number' && Number.isFinite(session.score_strategy)
    ? session.score_strategy
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-3 md:p-5 animate-fade-in cursor-default"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-3xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                REPLAY ENGINE V15 (ZERO-LLM)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {session?.created_at ? new Date(session.created_at).toLocaleString('vi-VN') : ''}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                session?.user_side === 'AFFIRMATIVE'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
              }`}>
                {session?.user_side === 'AFFIRMATIVE' ? 'Ủng Hộ (Government)' : 'Phản Đối (Opposition)'}
              </span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
              {session?.topic_title || session?.topic || 'Trận tranh biện'}
            </h3>
          </div>

          {/* Overall Score Cluster */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {(contentScore !== null || styleScore !== null || strategyScore !== null) && (
              <div className="hidden sm:flex items-center gap-2">
                {contentScore !== null && (
                  <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Nội Dung</div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{contentScore.toFixed(1)}</div>
                  </div>
                )}
                {styleScore !== null && (
                  <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Phong Cách</div>
                    <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">{styleScore.toFixed(1)}</div>
                  </div>
                )}
                {strategyScore !== null && (
                  <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">Chiến Lược</div>
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono">{strategyScore.toFixed(1)}</div>
                  </div>
                )}
              </div>
            )}

            <div className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 text-center">
              <div className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Điểm Tổng Thể</div>
              <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono leading-none mt-0.5">
                {overallScore !== null ? (
                  <>
                    {overallScore.toFixed(1)} <span className="text-[10px] font-sans font-normal text-slate-500">/ 10</span>
                  </>
                ) : (
                  <span className="text-xs font-sans font-normal text-slate-400">N/A</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── ROUND SELECTOR TIMELINE ── */}
        <div className="px-4 md:px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>Chọn Lượt Tranh Biện:</span>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((roundNum) => (
              <button
                key={roundNum}
                type="button"
                onClick={() => {
                  if (selectedRound !== roundNum) {
                    stopSpeaking();
                    setIsTtsPlaying(false);
                    setSelectedRound(roundNum);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRound === roundNum
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                Lượt {roundNum}
              </button>
            ))}
          </div>
        </div>

        {/* ── BODY: 2-COLUMN SPLIT VIEW ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="py-24 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse">
              Đang tải bản ghi lịch sử trận đấu...
            </div>
          ) : error ? (
            <div className="py-24 text-center text-rose-500 text-sm">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ── LEFT COLUMN: TRANSCRIPT STREAM (7 Cols) ── */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* User Argument Box */}
                <div className="glass-panel-elevated rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                        Bạn
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Luận Điểm Của Bạn</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Lượt {selectedRound}</div>
                      </div>
                    </div>

                    {voiceMetrics && (
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                          {voiceMetrics.wpm || 140} WPM
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400">
                          {voiceMetrics.filler_count || 0} từ đệm
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {currentUserTurn?.text_content || currentUserTurn?.textContent || 'Chưa có bản ghi văn bản cho lượt này.'}
                  </div>
                </div>

                {/* AI Opponent Response Box */}
                <div className="glass-panel-elevated rounded-2xl p-4 md:p-5 border border-indigo-200 dark:border-indigo-500/30 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                        AI
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Phản Biện Của Đối Thủ (AI Opponent)</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {session?.user_side === 'AFFIRMATIVE' ? 'Phe Phản Đối' : 'Phe Ủng Hộ'}
                        </div>
                      </div>
                    </div>

                    {currentOpponentTurn && (
                      <button
                        type="button"
                        onClick={() => handleTtsPlayback(currentOpponentTurn.text_content || currentOpponentTurn.textContent || '')}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 transition"
                      >
                        <span>{isTtsPlaying ? '⏹ Dừng' : '🔊 Nghe lại'}</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {currentOpponentTurn?.text_content || currentOpponentTurn?.textContent || 'Đối thủ ghi nhận luận cứ và phản biện...'}
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: LOGIC COACH STATIC HUD (5 Cols) ── */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="glass-panel-elevated rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-white/10 shadow-sm">
                  {/* HUD Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-500/30">
                      Logic Coach Diagnostic (Lượt {selectedRound})
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                      Điểm: {coachScore !== null ? `${coachScore.toFixed(1)} / 10` : 'N/A'}
                    </span>
                  </div>

                  {/* C-R-E Breakdown */}
                  <div className="space-y-2.5 text-xs">
                    {/* Claim */}
                    <div className="bg-cyan-50/80 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 p-3 rounded-xl">
                      <div className="font-bold text-cyan-700 dark:text-cyan-300 mb-1 flex items-center gap-1.5">
                        <span>🎯 Claim (Luận điểm)</span>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {coach?.cre_analysis?.claim || (coach ? '(Không xác định được luận điểm rõ ràng)' : 'Chưa có dữ liệu')}
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 p-3 rounded-xl">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
                        <span>🧠 Reasoning (Lập luận)</span>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {coach?.cre_analysis?.reasoning || (coach ? '(Không có lý lẽ nào được trình bày)' : 'Chưa có dữ liệu')}
                      </div>
                    </div>

                    {/* Evidence */}
                    <div className="bg-teal-50/80 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-500/30 p-3 rounded-xl">
                      <div className="font-bold text-teal-700 dark:text-teal-300 mb-1 flex items-center gap-1.5">
                        <span>📊 Evidence (Dẫn chứng)</span>
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 leading-relaxed">
                        {coach?.cre_analysis?.evidence || (coach ? '(Không có dẫn chứng nào được cung cấp)' : 'Chưa có dữ liệu')}
                      </div>
                    </div>
                  </div>

                  {/* Fallacies */}
                  {fallacies.length > 0 && (
                    <div className="mt-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 p-3 rounded-xl">
                      <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-1.5">
                        ⚠️ Ngụy biện ghi nhận:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {fallacies.map((fal: string, idx: number) => (
                          <span key={idx} className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-700/50 font-medium">
                            {fal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {coach?.actionable_suggestions && coach.actionable_suggestions.length > 0 && (
                    <div className="mt-3 bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 p-3 rounded-xl">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
                        💡 Khuyến nghị cải thiện:
                      </div>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-4 list-disc">
                        {coach.actionable_suggestions.map((sug: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">
                            {sug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebateReplayModal;
