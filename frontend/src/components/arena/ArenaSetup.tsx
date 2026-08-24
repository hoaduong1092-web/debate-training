import React from 'react';
import { DebateStance } from '../../lib/api';
import { DebateFormat } from '../DebateArena';

export interface ArenaSetupProps {
  topic: string;
  format: DebateFormat;
  stance: DebateStance;
  onOpenMotionModal: () => void;
  onOpenAssistant?: (topic: string, stance: DebateStance) => void;
  isTimerRunning: boolean;
  setIsTimerRunning: React.Dispatch<React.SetStateAction<boolean>>;
  speechSeconds: number;
  isProtectedTime: boolean;
  poiStatus: 'INACTIVE' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED';
  poiSecondsLeft: number;
  onRequestPoi: () => void;
  language?: 'vi' | 'en';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ArenaSetup: React.FC<ArenaSetupProps> = ({
  topic,
  format,
  stance,
  onOpenMotionModal,
  onOpenAssistant,
  isTimerRunning,
  setIsTimerRunning,
  speechSeconds,
  isProtectedTime,
  poiStatus,
  poiSecondsLeft,
  onRequestPoi,
  language = 'vi',
}) => {
  const isVi = language === 'vi';

  return (
    <div className="glass-panel-elevated rounded-2xl p-5 relative overflow-hidden transition-all">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
          <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
          <span>{isVi ? `Kiến Nghị Tranh Biện (${format})` : `DEBATE MOTION (${format})`}</span>
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Đổi Kiến Nghị / Mở Motion Hub */}
          <button
            type="button"
            onClick={onOpenMotionModal}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title={isVi ? 'Đổi chủ đề tranh biện hoặc chọn từ thư viện kiến nghị WSDC/BP/AP' : 'Change topic or pick from WSDC/BP/AP curated library'}
          >
            <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span>{isVi ? '🎯 Đổi Kiến Nghị' : '🎯 Change Motion'}</span>
          </button>

          {/* Nút Mở Trợ Lý AI Phân Tích */}
          {onOpenAssistant && (
            <button
              type="button"
              onClick={() => onOpenAssistant(topic, stance)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/25 border border-violet-200 dark:border-violet-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title={isVi ? 'Mở Trợ lý AI để phân tích đa chiều và gợi ý dàn ý cho kiến nghị này' : 'Open AI Assistant for motion analysis and speech drafting'}
            >
              <svg width="20" height="20" className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
              </svg>
              <span>{isVi ? '🤖 Trợ Lý Phân Tích' : '🤖 AI Assistant'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTimerRunning((r) => !r)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            {isTimerRunning ? (
              <svg width="12" height="12" className="w-3 h-3 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="12" height="12" className="w-3 h-3 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
            <span>{isTimerRunning ? (isVi ? 'Dừng' : 'Pause') : (isVi ? 'Bấm Giờ' : 'Start Timer')}</span>
          </button>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
            {formatTime(speechSeconds)} / 8:00
          </span>
        </div>
      </div>

      <div className="mt-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-wide">
          {topic}
        </h2>
      </div>

      {/* POI Safety Deck */}
      <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
        <div>
          {isProtectedTime ? (
            <span className="neon-pill-amber px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 text-[11px]">
              <svg width="14" height="14" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>{isVi ? 'Thời gian an toàn (Không POI)' : 'Protected Time (No POI)'}</span>
            </span>
          ) : (
            <span className="neon-pill-affirmative px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 text-[11px]">
              <svg width="14" height="14" className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              <span>{isVi ? 'Mở sàn chất vấn (POI Allowed)' : 'Active Floor (POI Available)'}</span>
            </span>
          )}
        </div>

        {!isProtectedTime && poiStatus !== 'ACCEPTED' && (
          <button
            type="button"
            onClick={onRequestPoi}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white dark:text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 text-xs cursor-pointer"
          >
            {isVi ? 'Xin POI (15s)' : 'Request POI (15s)'}
          </button>
        )}
      </div>

      {/* POI Active 15s Countdown */}
      {poiStatus === 'ACCEPTED' && (
        <div className="mt-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 rounded-xl p-3 shadow-lg shadow-amber-500/10">
          <div className="flex justify-between text-xs font-bold text-amber-700 dark:text-amber-300 mb-1.5">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {isVi ? 'CHẤT VẤN POI ĐANG DIỄN RA' : 'POI ACTIVE INTERACTION'}
            </span>
            <span className="font-mono text-sm">{poiSecondsLeft}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000"
              style={{ width: `${(poiSecondsLeft / 15) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
