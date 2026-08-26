import React, { useState } from 'react';
import { FinalDebateDraft, DebateStance } from '../../lib/api';

export interface ArgumentMapHUDProps {
  currentFinalDraft: FinalDebateDraft | null;
  debatedArgumentIds: Set<string>;
  activeArgumentId: string | null;
  setActiveArgumentId: (id: string | null) => void;
  targetArgumentId: string | null;
  setTargetArgumentId: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenAssistant?: (topic: string, stance: DebateStance) => void;
  topic: string;
  stance: DebateStance;
  onInsertArgumentText: (text: string) => void;
  language?: 'vi' | 'en';
}

export const ArgumentMapHUD: React.FC<ArgumentMapHUDProps> = ({
  currentFinalDraft,
  debatedArgumentIds,
  activeArgumentId,
  setActiveArgumentId,
  targetArgumentId,
  setTargetArgumentId,
  onOpenAssistant,
  topic,
  stance,
  onInsertArgumentText,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const [activeSection, setActiveSection] = useState<'arguments' | 'counterarguments'>('arguments');
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);

  if (!currentFinalDraft) {
    return null;
  }

  const args = Array.isArray(currentFinalDraft.arguments) ? currentFinalDraft.arguments : [];
  const counters = Array.isArray(currentFinalDraft.counterarguments) ? currentFinalDraft.counterarguments : [];

  if (args.length === 0 && counters.length === 0) {
    return null;
  }

  const focusedArg = args.find((a) => a.argumentId === activeArgumentId) || args[0];
  const focusedCounter = counters.find((c) => c.counterargumentId === activeCounterId) || counters[0];

  return (
    <div className="glass-panel-elevated rounded-2xl p-4 md:p-5 border border-indigo-500/20 shadow-lg flex flex-col gap-3.5 transition-all">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
              <span>{isVi ? 'Bản Đồ Chiến Thuật (Argument Map)' : 'Argument Map HUD'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {args.length} {isVi ? 'luận điểm' : 'args'}
                {counters.length > 0 ? ` • ${counters.length} ${isVi ? 'phản biện' : 'rebuttals'}` : ''}
              </span>
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isVi ? 'Định vị tư duy • Chọn luận điểm hoặc phản biện để xem chi tiết hoặc nạp vào lượt phát biểu' : 'Cognitive scaffolding • Select an argument or rebuttal to inspect or load into turn'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Section Switcher if counterarguments exist */}
          {counters.length > 0 && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveSection('arguments')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  activeSection === 'arguments'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVi ? `Luận Điểm (${args.length})` : `Arguments (${args.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('counterarguments')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  activeSection === 'counterarguments'
                    ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVi ? `Phản Biện (${counters.length})` : `Rebuttals (${counters.length})`}
              </button>
            </div>
          )}

          {onOpenAssistant && (
            <button
              type="button"
              onClick={() => onOpenAssistant(topic, stance)}
              className="min-w-[44px] min-h-[44px] text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>✏️ {isVi ? 'Bản thảo' : 'Draft'}</span>
            </button>
          )}
        </div>
      </div>

      {activeSection === 'arguments' ? (
        <>
          {/* Argument Navigation Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {args.map((arg) => {
              const isDebated = debatedArgumentIds.has(arg.argumentId);
              const isFocused = arg.argumentId === (activeArgumentId || focusedArg?.argumentId);
              const isTarget = arg.argumentId === targetArgumentId;

              return (
                <button
                  key={arg.argumentId}
                  type="button"
                  onClick={() => setActiveArgumentId(arg.argumentId)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    isFocused
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border-indigo-400/40'
                      : isDebated
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400/40'
                  }`}
                >
                  <span>
                    {isDebated ? '✓ ' : isTarget ? '🎯 ' : ''}
                    {isVi ? `LĐ ${arg.order}` : `Arg ${arg.order}`}
                  </span>
                  <span className="max-w-[120px] md:max-w-[180px] truncate font-normal opacity-90">
                    {arg.claim}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Argument Focus Inspector */}
          {focusedArg && (
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px]">
                    {isVi ? `LUẬN ĐIỂM ${focusedArg.order}` : `ARGUMENT ${focusedArg.order}`}
                  </span>
                  {debatedArgumentIds.has(focusedArg.argumentId) && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px]">
                      • {isVi ? 'Đã tranh biện ở lượt trước' : 'Debated in prior turn'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const toInsert = `${focusedArg.claim}. ${focusedArg.reasoning ? `Bởi vì ${focusedArg.reasoning}. ` : ''}${focusedArg.evidenceSuggestion ? `Dẫn chứng: ${focusedArg.evidenceSuggestion}` : ''}`.trim();
                      onInsertArgumentText(toInsert);
                    }}
                    className="min-w-[44px] min-h-[44px] px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold transition flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <span>⚡ {isVi ? 'Nạp Vào Ô Nhập' : 'Insert into Editor'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetArgumentId((prev) => (prev === focusedArg.argumentId ? null : focusedArg.argumentId))}
                    className={`min-w-[44px] min-h-[44px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] border ${
                      focusedArg.argumentId === targetArgumentId
                        ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                    }`}
                  >
                    <span>{focusedArg.argumentId === targetArgumentId ? (isVi ? '🎯 Đang là Mục Tiêu' : '🎯 Target Bound') : (isVi ? '📌 Gán Làm Mục Tiêu' : '📌 Bind Target')}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-slate-800 dark:text-slate-200">
                <p className="font-semibold text-slate-900 dark:text-white">
                  <strong>{isVi ? 'Luận điểm (Claim): ' : 'Claim: '}</strong>
                  {focusedArg.claim}
                </p>
                {focusedArg.reasoning && (
                  <p className="text-slate-600 dark:text-slate-400">
                    <strong>{isVi ? 'Lý lẽ (Reasoning): ' : 'Reasoning: '}</strong>
                    {focusedArg.reasoning}
                  </p>
                )}
                {focusedArg.evidenceSuggestion && (
                  <p className="text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                    <strong>📚 {isVi ? 'Dẫn chứng gợi ý: ' : 'Evidence: '}</strong>
                    {focusedArg.evidenceSuggestion}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Counterargument Navigation Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {counters.map((ca) => {
              const isFocused = ca.counterargumentId === (activeCounterId || focusedCounter?.counterargumentId);

              return (
                <button
                  key={ca.counterargumentId}
                  type="button"
                  onClick={() => setActiveCounterId(ca.counterargumentId)}
                  className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    isFocused
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border-rose-400/40'
                      : 'bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/20 hover:border-rose-400/40'
                  }`}
                >
                  <span>{isVi ? `PB ${ca.order}` : `Counter ${ca.order}`}</span>
                  <span className="max-w-[120px] md:max-w-[180px] truncate font-normal opacity-90">
                    {ca.opponentArgument}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Counterargument Focus Inspector */}
          {focusedCounter && (
            <div className="bg-rose-50/30 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-200 dark:border-rose-500/20 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px]">
                  {isVi ? `DỰ BÁO PHẢN BIỆN ${focusedCounter.order}` : `COUNTERARGUMENT ${focusedCounter.order}`}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const toInsert = focusedCounter.rebuttal
                      ? `Đối với lập luận cho rằng ${focusedCounter.opponentArgument}, tôi phản bác như sau: ${focusedCounter.rebuttal}`
                      : focusedCounter.opponentArgument;
                    onInsertArgumentText(toInsert);
                  }}
                  className="min-w-[44px] min-h-[44px] px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/30 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-500/30 font-bold transition flex items-center gap-1 cursor-pointer text-[11px]"
                >
                  <span>⚡ {isVi ? 'Nạp Phản Bác Vào Ô Nhập' : 'Insert Rebuttal'}</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5 text-slate-800 dark:text-slate-200">
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-rose-700 dark:text-rose-400">{isVi ? '⚠️ Điểm đối phương có thể nêu: ' : '⚠️ Opposing Point: '}</strong>
                  {focusedCounter.opponentArgument}
                </p>
                {focusedCounter.rebuttal && (
                  <p className="text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-slate-900/60 p-2 rounded-lg border border-rose-100 dark:border-rose-500/10">
                    <strong className="text-indigo-600 dark:text-indigo-400">{isVi ? '🛡️ Chiến lược phản bác của bạn: ' : '🛡️ Rebuttal Strategy: '}</strong>
                    {focusedCounter.rebuttal}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
