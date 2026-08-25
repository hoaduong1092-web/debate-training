import React from 'react';
import { TurnData } from '../DebateArena';

export interface CoachPanelProps {
  currentTurnData?: TurnData | null;
  language?: 'vi' | 'en';
}

// Color calculation for Neural Score Ring (INVARIANT-SCORE-02, INVARIANT-SCORE-04)
export const getScoreColor = (score: number | null) => {
  if (score === null) return { stroke: '#94a3b8', text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/30' };
  if (score >= 8.0) return { stroke: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' };
  if (score >= 6.0) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30' };
  return { stroke: '#f43f5e', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30' };
};

export const CoachDiagnosticsContent: React.FC<{
  currentTurnData?: TurnData | null;
  language?: 'vi' | 'en';
}> = ({ currentTurnData, language = 'vi' }) => {
  const isVi = language === 'vi';
  const scoreTheme = currentTurnData ? getScoreColor(currentTurnData.logicScore) : getScoreColor(null);

  if (!currentTurnData) {
    return (
      <div className="py-6 px-3 flex flex-col gap-4 text-xs">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
            <svg width="24" height="24" className="w-6 h-6 text-white shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
              <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
              <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
              <path d="M12 18v4"/>
            </svg>
          </div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
            {isVi ? 'Sẵn Sàng Chẩn Đoán Tư Duy' : 'Ready for Cognitive Diagnostics'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isVi ? 'Hệ thống sẽ tự động bóc tách và phản hồi theo chuẩn Sư phạm v1.0 ngay khi bạn gửi lượt phát biểu đầu tiên.' : 'The system will automatically extract and evaluate your speech against pedagogical standards as soon as you submit your first turn.'}
          </p>
        </div>

        <div className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-3.5">
          <div className="bg-slate-100 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-3">
            <svg width="16" height="16" className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 inline-block mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
            <div>
              <div className="font-bold text-cyan-700 dark:text-cyan-300 text-xs">{isVi ? 'Chẩn Đoán C-R-E Thời Gian Thực' : 'Real-time C-R-E Diagnostics'}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{isVi ? 'Đánh giá tính mạch lạc của Claim, Reasoning và Evidence.' : 'Evaluates coherence and rigor of Claim, Reasoning, and Evidence.'}</div>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-3">
            <svg width="16" height="16" className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 inline-block mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
            </svg>
            <div>
              <div className="font-bold text-teal-700 dark:text-teal-300 text-xs">{isVi ? 'Phát Hiện Ngụy Biện & DSP Voice' : 'Fallacy Detection & Voice DSP'}</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{isVi ? 'Bắt lỗi Strawman, Ad Hominem, đo tốc độ WPM & từ đệm.' : 'Catches Strawman, Ad Hominem, measures WPM tempo and filler words.'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* 1. Neural Score Radial Banner */}
      <div className={`p-4 rounded-xl border ${scoreTheme.border} ${scoreTheme.bg} flex items-center justify-between shadow-sm`}>
        <div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isVi ? `Điểm Đánh Giá C-R-E (Lượt ${currentTurnData.turnNumber})` : `C-R-E Evaluation Score (Turn ${currentTurnData.turnNumber})`}
          </div>
          <div className={`text-2xl font-black font-mono mt-0.5 ${scoreTheme.text}`}>
            {currentTurnData.logicScore !== null ? (
              <>
                {currentTurnData.logicScore.toFixed(1)} <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">/ 10.0</span>
              </>
            ) : (
              <span className="text-sm font-sans text-slate-400 dark:text-slate-500 font-normal">{isVi ? 'Không có điểm' : 'N/A'}</span>
            )}
          </div>
        </div>

        {/* Circular Score Gauge */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              stroke={scoreTheme.stroke}
              strokeWidth="3.5"
              strokeDasharray={currentTurnData.logicScore !== null ? `${Math.round(currentTurnData.logicScore * 10)}, 100` : '0, 100'}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className={`absolute text-xs font-bold font-mono ${scoreTheme.text}`}>
            {currentTurnData.logicScore !== null ? `${Math.round(currentTurnData.logicScore * 10)}%` : '--'}
          </span>
        </div>
      </div>

      {/* 2. C-R-E Breakdown Accordion Cards */}
      <div className="space-y-2.5 text-xs">
        {/* Claim */}
        <div className="bg-cyan-50/80 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/30 p-3 rounded-xl">
          <div className="font-bold text-cyan-700 dark:text-cyan-300 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
            <span>Claim ({isVi ? 'Luận điểm' : 'Core Claim'})</span>
          </div>
          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">{currentTurnData.cre.claim}</div>
        </div>

        {/* Reasoning */}
        <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 p-3 rounded-xl">
          <div className="font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
            <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
              <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
            </svg>
            <span>Reasoning ({isVi ? 'Lập luận' : 'Logical Reasoning'})</span>
          </div>
          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">{currentTurnData.cre.reasoning}</div>
        </div>

        {/* Evidence */}
        <div className="bg-teal-50/80 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-500/30 p-3 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
              <svg width="14" height="14" className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
              </svg>
              <span>Evidence ({isVi ? 'Dẫn chứng' : 'Empirical Evidence'})</span>
            </div>
            <div className="text-amber-500 dark:text-amber-400 font-mono text-[11px]">
              {'★'.repeat(currentTurnData.evidenceStar || 4)}{'☆'.repeat(5 - (currentTurnData.evidenceStar || 4))}
            </div>
          </div>
          <div className="text-slate-800 dark:text-slate-200 leading-relaxed">{currentTurnData.cre.evidence}</div>
        </div>
      </div>

      {/* 3. Fallacy Radar */}
      {currentTurnData.fallacies.length > 0 && (
        <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 p-3 rounded-xl shadow-sm">
          <div className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-1.5 flex items-center gap-1.5">
            <svg width="14" height="14" className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>{isVi ? 'Cảnh báo ngụy biện phát hiện:' : 'Detected Fallacy Warnings:'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentTurnData.fallacies.map((fal, i) => (
              <span key={i} className="text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 px-2.5 py-0.5 rounded-md border border-rose-300 dark:border-rose-700/50 font-medium">
                {fal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Acoustic DSP Telemetry (Voice mode only) */}
      {currentTurnData.wpm != null && (
        <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs font-medium">
          <div>
            <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Tốc độ: ' : 'Pace: '}</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold font-mono">{currentTurnData.wpm} WPM</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">{isVi ? 'Từ đệm: ' : 'Fillers: '}</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">{currentTurnData.fillers || 0} {isVi ? 'từ' : 'wpm'}</span>
          </div>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
            currentTurnData.wpm >= 120 && currentTurnData.wpm <= 165
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
              : currentTurnData.wpm > 165
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
              : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
          }`}>
            {currentTurnData.wpm >= 120 && currentTurnData.wpm <= 165
              ? (isVi ? 'Chuẩn Tốc Độ' : 'Optimal Pace')
              : currentTurnData.wpm > 165
              ? (isVi ? 'Nói Quá Nhanh' : 'Too Fast')
              : (isVi ? 'Nói Hơi Chậm' : 'Too Slow')}
          </span>
        </div>
      )}

      {/* 5. Suggestions */}
      {currentTurnData.suggestions.length > 0 && (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 p-3 rounded-xl">
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1.5">
            <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <span>{isVi ? 'Khuyến nghị nâng tầm lập luận:' : 'Actionable Coaching Recommendations:'}</span>
          </div>
          <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-4 list-disc">
            {currentTurnData.suggestions.map((sug, i) => (
              <li key={i} className="leading-relaxed">
                {sug}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export const CoachPanel: React.FC<CoachPanelProps> = ({
  currentTurnData,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  return (
    <div className="glass-panel-elevated rounded-2xl p-5 transition-all">
      {/* HUD Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-500/30 flex items-center gap-1.5 shadow-sm">
          <svg width="14" height="14" className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
            <path d="M12 18v4"/>
          </svg>
          <span>Logic Coach HUD {currentTurnData ? `(${isVi ? 'Lượt' : 'Turn'} ${currentTurnData.turnNumber})` : ''}</span>
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{isVi ? 'Chuẩn Sư phạm v1.0' : 'Pedagogical Standard v1.0'}</span>
      </div>

      <CoachDiagnosticsContent
        currentTurnData={currentTurnData}
        language={language}
      />
    </div>
  );
};
