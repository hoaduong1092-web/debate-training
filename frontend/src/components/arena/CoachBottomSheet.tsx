import React, { useEffect } from 'react';
import { TurnData } from '../DebateArena';
import { CoachDiagnosticsContent } from './CoachPanel';

export interface CoachBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTurnData?: TurnData | null;
  language?: 'vi' | 'en';
}

export const CoachBottomSheet: React.FC<CoachBottomSheetProps> = ({
  isOpen,
  onClose,
  currentTurnData,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  // Handle Escape key to close
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-sheet-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Drawer */}
      <div className="relative z-10 w-full max-h-[88dvh] rounded-t-3xl bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-slide-up pb-[env(safe-area-inset-bottom,16px)]">
        {/* Grabber Handle */}
        <div className="w-full pt-2.5 pb-1 flex justify-center cursor-grab shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
                <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
                <path d="M12 18v4"/>
              </svg>
            </div>
            <div>
              <h3 id="coach-sheet-title" className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Logic Coach HUD</span>
                {currentTurnData && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
                    {isVi ? `Lượt ${currentTurnData.turnNumber}` : `Turn ${currentTurnData.turnNumber}`}
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {isVi ? 'Chuẩn Sư phạm v16 • Phân tích tư duy' : 'Pedagogical Standard v16'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center transition active:scale-95 cursor-pointer font-bold text-sm"
            aria-label={isVi ? 'Đóng bảng chẩn đoán' : 'Close diagnostics'}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Sheet Content */}
        <div className="overflow-y-auto p-4 flex-1 overscroll-contain">
          <CoachDiagnosticsContent
            currentTurnData={currentTurnData}
            language={language}
          />
        </div>
      </div>
    </div>
  );
};
