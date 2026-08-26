import React, { useState } from 'react';
import { DebateStance } from '../../lib/api';
import { DebateFormat, FORMAT_RULES } from '../DebateArena';

export interface MatchHeaderProps {
  format: DebateFormat;
  setFormat: (fmt: DebateFormat) => void;
  showFormatRules: boolean;
  setShowFormatRules: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenAudioCheck: () => void;
  turnsCount: number;
  selectedTurn: number;
  setSelectedTurn: (turnIndex: number) => void;
  isCompleted: boolean;
  onOpenSummary: () => void;
  onEndSession: () => void;
  onStartNewDebate: () => void;
  stance: DebateStance;
  setStance: React.Dispatch<React.SetStateAction<DebateStance>>;
  isLoading: boolean;
  language?: 'vi' | 'en';
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  format,
  setFormat,
  showFormatRules,
  setShowFormatRules,
  onOpenAudioCheck,
  turnsCount,
  selectedTurn,
  setSelectedTurn,
  isCompleted,
  onOpenSummary,
  onEndSession,
  onStartNewDebate,
  stance,
  setStance,
  isLoading,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="glass-panel rounded-2xl p-3 md:p-4 flex flex-col gap-3 transition-all">
      {/* ─────────────────────────────────────────────────────────────
          1. MOBILE COMPACT HEADER (< 768px)
          Compact 2-row layout with touch targets >= 44px
      ───────────────────────────────────────────────────────────── */}
      <div className="flex md:hidden flex-col gap-2.5 w-full">
        {/* Row 1: Turn Stepper + Format + Overflow Menu */}
        <div className="flex items-center justify-between gap-2">
          {/* Turn Stepper Pills (Scrollable if needed, touch targets >= 44px) */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none min-w-0">
            {Array.from({ length: Math.max(3, turnsCount) }, (_, i) => {
              const turnNum = i + 1;
              const isCompletedTurn = i < turnsCount;
              const isSelected = selectedTurn === i;

              return (
                <button
                  key={turnNum}
                  type="button"
                  onClick={() => {
                    if (isCompletedTurn) {
                      setSelectedTurn(i);
                    }
                  }}
                  disabled={!isCompletedTurn}
                  className={`min-w-[44px] min-h-[44px] px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/30'
                      : isCompletedTurn
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                  }`}
                  title={isCompletedTurn ? (isVi ? `Xem Lượt ${turnNum}` : `View Turn ${turnNum}`) : (isVi ? `Lượt ${turnNum} (Chưa đấu)` : `Turn ${turnNum}`)}
                >
                  {isCompletedTurn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  <span>T{turnNum}</span>
                </button>
              );
            })}

            {/* Summary Shortcut Button on Stepper */}
            <button
              type="button"
              onClick={() => {
                if (turnsCount > 0) {
                  if (isCompleted) {
                    onOpenSummary();
                  } else {
                    onEndSession();
                  }
                } else {
                  alert(isVi ? 'Thực hiện ít nhất 1 lượt tranh biện để xem tổng kết.' : 'Complete at least 1 turn to view match summary.');
                }
              }}
              className={`min-w-[44px] min-h-[44px] px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shrink-0 ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 cursor-pointer'
                  : turnsCount > 0
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-pointer'
                  : 'bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 opacity-50 cursor-not-allowed'
              }`}
              title={isVi ? 'Tổng kết trận đấu' : 'Match Summary'}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </button>
          </div>

          {/* Right Controls: Format Switcher & Overflow Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Format Segmented Control */}
            <div className="flex bg-slate-100 dark:bg-slate-950/80 p-0.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
              {(['WSDC', 'AP', 'BP'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`min-w-[44px] min-h-[44px] px-1.5 rounded-lg font-bold transition text-xs cursor-pointer ${
                    format === fmt
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Mobile Action Overflow Menu Button (44px min target) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMobileMenu((prev) => !prev)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95 shadow-sm"
                aria-label={isVi ? 'Menu tùy chọn' : 'More options'}
                title={isVi ? 'Thao tác bổ sung' : 'More options'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                </svg>
              </button>

              {/* Mobile Overflow Dropdown Popup */}
              {showMobileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
                    onClick={() => setShowMobileMenu(false)}
                  />
                  <div className="absolute right-0 top-12 z-50 w-60 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl animate-fade-in text-xs font-medium space-y-1">
                    {/* Audio Check Modal */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMenu(false);
                        onOpenAudioCheck();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-slate-700 dark:text-slate-200 transition text-left cursor-pointer min-h-[44px]"
                    >
                      <span className="text-sm">🎤</span>
                      <span className="font-semibold">{isVi ? 'Kiểm tra Âm thanh' : 'Audio Check'}</span>
                    </button>

                    {/* Format Rules Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMobileMenu(false);
                        setShowFormatRules((prev) => !prev);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-500/15 text-slate-700 dark:text-slate-200 transition text-left cursor-pointer min-h-[44px]"
                    >
                      <span className="text-sm">ℹ️</span>
                      <span>{showFormatRules ? (isVi ? 'Ẩn luật thi đấu' : 'Hide rules') : (isVi ? `Xem luật ${format}` : `View ${format} rules`)}</span>
                    </button>

                    {/* End Match Button */}
                    {turnsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileMenu(false);
                          onEndSession();
                        }}
                        disabled={isLoading}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 transition text-left cursor-pointer min-h-[44px]"
                      >
                        <span className="text-sm">🏁</span>
                        <span className="font-bold">{isVi ? 'Kết Thúc Phiên' : 'End Match'}</span>
                      </button>
                    )}

                    {/* New Debate Button */}
                    {turnsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMobileMenu(false);
                          onStartNewDebate();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-left cursor-pointer min-h-[44px]"
                      >
                        <span className="text-sm">🔄</span>
                        <span>{isVi ? 'Tạo Trận Đấu Mới' : 'Start New Debate'}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Full-width Mobile Stance Toggle (Touch target >= 44px) */}
        <button
          type="button"
          onClick={() => setStance((s) => (s === 'AFFIRMATIVE' ? 'NEGATIVE' : 'AFFIRMATIVE'))}
          className={`w-full min-h-[44px] py-2 px-3.5 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer active:scale-[0.99] shadow-sm ${
            stance === 'AFFIRMATIVE' ? 'neon-pill-affirmative' : 'neon-pill-negative'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${stance === 'AFFIRMATIVE' ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-rose-500 dark:bg-rose-400 animate-pulse'}`} />
            <span className="text-[11px] opacity-80">{isVi ? 'Lập trường:' : 'Stance:'}</span>
            <span className="font-bold">{stance === 'AFFIRMATIVE' ? (isVi ? 'Ủng Hộ (Gov)' : 'Affirmative (Gov)') : (isVi ? 'Phản Đối (Opp)' : 'Negative (Opp)')}</span>
          </div>
          <span className="text-[10px] opacity-70 flex items-center gap-1 font-mono">
            <span>🔄</span>
            <span>{isVi ? 'Đổi phe' : 'Switch'}</span>
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DESKTOP HEADER (>= 768px)
          100% Preserved Baseline Layout & Behavior
      ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4 w-full">
        {/* Left: Format Selector & Audio Check */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isVi ? 'Thể thức:' : 'Format:'}
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
              {(['WSDC', 'AP', 'BP'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  className={`px-3 py-1 rounded-lg transition font-medium cursor-pointer ${
                    format === fmt
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Toggle Button for Format Rules */}
            <button
              type="button"
              onClick={() => setShowFormatRules((prev) => !prev)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              title={isVi ? 'Xem thông tin luật thi đấu thể thức này' : 'View tournament format rules'}
            >
              ℹ️ {showFormatRules ? (isVi ? 'Ẩn luật thi đấu' : 'Hide rules') : (isVi ? 'Xem luật thi đấu' : 'View rules')}
            </button>
          </div>

          {/* Pre-match Audio Device Check Button */}
          <button
            type="button"
            onClick={onOpenAudioCheck}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title={isVi ? 'Kiểm tra Micro thu âm và Loa phát trước khi đấu' : 'Test microphone and speaker before debate'}
          >
            <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
            <span>🎤 {isVi ? 'Kiểm tra Âm thanh' : 'Audio Check'}</span>
          </button>
        </div>

        {/* Center: Interactive Match Stepper */}
        <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-1 max-w-full">
          {Array.from({ length: Math.max(3, turnsCount) }, (_, i) => {
            const turnNum = i + 1;
            const isCompletedTurn = i < turnsCount;
            const isSelected = selectedTurn === i;

            return (
              <React.Fragment key={turnNum}>
                {i > 0 && <span className="text-slate-300 dark:text-slate-700 mx-0.5">➔</span>}
                <button
                  type="button"
                  onClick={() => {
                    if (isCompletedTurn) {
                      setSelectedTurn(i);
                    }
                  }}
                  disabled={!isCompletedTurn}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 font-semibold text-xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40 ring-2 ring-indigo-500/30'
                      : isCompletedTurn
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 cursor-pointer'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-75'
                  }`}
                  title={isCompletedTurn ? (isVi ? `Xem dữ liệu Lượt ${turnNum}` : `View Turn ${turnNum} data`) : (isVi ? `Lượt ${turnNum} (Chưa diễn ra)` : `Turn ${turnNum} (Upcoming)`)}
                >
                  {isCompletedTurn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  )}
                  <span>{isVi ? 'Lượt' : 'Turn'} {turnNum}</span>
                </button>
              </React.Fragment>
            );
          })}

          <span className="text-slate-300 dark:text-slate-700 mx-0.5">➔</span>
          <button
            type="button"
            onClick={() => {
              if (turnsCount > 0) {
                if (isCompleted) {
                  onOpenSummary();
                } else {
                  onEndSession();
                }
              } else {
                alert(isVi ? 'Thực hiện ít nhất 1 lượt tranh biện để xem tổng kết.' : 'Complete at least 1 turn to view match summary.');
              }
            }}
            className={`px-3 py-1 rounded-lg transition-all font-semibold text-xs flex items-center gap-1 ${
              isCompleted
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold cursor-pointer'
                : turnsCount > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-pointer'
                : 'bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            <span>{isVi ? 'Tổng Kết' : 'Match Summary'}</span>
          </button>
        </div>

        {/* Right: Actions & Stance Toggle */}
        <div className="flex items-center gap-2">
          {/* End Session Button */}
          {turnsCount > 0 && (
            <button
              type="button"
              onClick={onEndSession}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
              title={isVi ? 'Kết thúc và lưu phiên làm việc vào Lịch sử' : 'End session and save to History'}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
              <span>{isVi ? 'Kết Thúc Phiên' : 'End Match'}</span>
            </button>
          )}

          {/* New Debate Button */}
          {turnsCount > 0 && (
            <button
              type="button"
              onClick={onStartNewDebate}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer"
              title={isVi ? 'Bắt đầu phiên tranh biện mới' : 'Start new debate'}
              aria-label={isVi ? 'Tạo phiên mới' : 'New debate'}
            >
              <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
            </button>
          )}

          {/* Stance Toggle */}
          <button
            type="button"
            onClick={() => setStance((s) => (s === 'AFFIRMATIVE' ? 'NEGATIVE' : 'AFFIRMATIVE'))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
              stance === 'AFFIRMATIVE' ? 'neon-pill-affirmative' : 'neon-pill-negative'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${stance === 'AFFIRMATIVE' ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-rose-500 dark:bg-rose-400 animate-pulse'}`} />
            <span>{stance === 'AFFIRMATIVE' ? (isVi ? 'Ủng Hộ (Government)' : 'Affirmative (Gov)') : (isVi ? 'Phản Đối (Opposition)' : 'Negative (Opp)')}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TOGGLEABLE FORMAT RULES INFO CARD (Shared)
      ───────────────────────────────────────────────────────────── */}
      {showFormatRules && FORMAT_RULES[format] && (
        <div className="w-full p-4 glass-panel bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-sm text-slate-700 dark:text-zinc-300 animate-fade-in-down transition-all">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-500/20 text-xs">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {isVi ? `Luật thi đấu chuẩn thể thức ${format}` : `Official Tournament Rules for ${format}`}
            </span>
            <button
              type="button"
              onClick={() => setShowFormatRules(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
            >
              ✕ {isVi ? 'Đóng' : 'Close'}
            </button>
          </div>
          <ul className="space-y-2 text-xs">
            <li><strong>👥 {isVi ? 'Cấu trúc:' : 'Teams:'}</strong> {FORMAT_RULES[format].teams}</li>
            <li><strong>⏱️ {isVi ? 'Thời gian:' : 'Timing:'}</strong> {FORMAT_RULES[format].time}</li>
            <li><strong>🎯 {isVi ? 'Đặc trưng:' : 'Key features:'}</strong> {FORMAT_RULES[format].features}</li>
            <li><strong>🌟 {isVi ? 'Phù hợp:' : 'Best for:'}</strong> {FORMAT_RULES[format].audience}</li>
          </ul>
        </div>
      )}
    </div>
  );
};
