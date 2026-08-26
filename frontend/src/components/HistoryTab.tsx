import React, { useState, useEffect, useCallback } from 'react';
import { fetchDebateHistory, deleteSessionApi, bulkDeleteSessions, HistorySessionSummary } from '../lib/api';
import { DebateReplayModal } from './DebateReplayModal';
import { stopSpeaking } from '../utils/tts';

import { Strings, Language } from '../lib/i18n';

interface Props {
  onStartNewDebate?: () => void;
  language?: Language;
  t?: Strings;
}

export const HistoryTab: React.FC<Props> = ({ onStartNewDebate, language = 'vi', t }) => {
  const [sessions, setSessions] = useState<HistorySessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cleanup any speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let apiSessions: HistorySessionSummary[] = [];
      try {
        const res = await fetchDebateHistory();
        if (res.success && Array.isArray(res.sessions)) {
          apiSessions = res.sessions;
        }
      } catch (err) {
        console.warn('[HistoryTab] API fetch failed, relying on local history:', err);
      }

      // Load locally preserved sessions
      let localSessions: HistorySessionSummary[] = [];
      try {
        const localRaw = localStorage.getItem('local_debate_history_v15');
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) {
            localSessions = parsed;
          }
        }
      } catch (err) {
        console.warn('[HistoryTab] Failed to read local_debate_history_v15:', err);
      }

      // Comprehensive deduplication:
      // Merge all API and local sessions, resolving duplicates by ID or Topic+Side+Proximity
      const mergedList: HistorySessionSummary[] = [];
      const allSessions = [...apiSessions, ...localSessions];

      // Sort with highest turn count first so best version of a session is preserved
      allSessions.sort((a, b) => (b.turn_count || 0) - (a.turn_count || 0));

      for (const s of allSessions) {
        const topicA = (s.topic_title || s.topic || '').trim().toLowerCase();
        const sideA = s.user_side || '';
        const timeA = new Date(s.created_at).getTime();

        const isDuplicate = mergedList.some((existing) => {
          if (existing.id === s.id) return true;
          const topicB = (existing.topic_title || existing.topic || '').trim().toLowerCase();
          const sideB = existing.user_side || '';
          const timeB = new Date(existing.created_at).getTime();

          // Same topic, same side, within 10 minutes window
          if (topicA && topicA === topicB && sideA === sideB && Math.abs(timeA - timeB) < 10 * 60 * 1000) {
            return true;
          }
          return false;
        });

        if (!isDuplicate) {
          let score: number | null = typeof s.score_total === 'number' && Number.isFinite(s.score_total) ? s.score_total : null;
          if (score === null) {
            try {
              const replayRaw = localStorage.getItem(`local_debate_replay_${s.id}`);
              if (replayRaw) {
                const parsedReplay = JSON.parse(replayRaw);
                if (typeof parsedReplay?.session?.score_total === 'number' && Number.isFinite(parsedReplay.session.score_total)) {
                  score = parsedReplay.session.score_total;
                }
              }
            } catch {}
          }
          mergedList.push({
            ...s,
            score_total: score !== null ? score : undefined,
          });
        }
      }

      // Sort newest first
      mergedList.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setSessions(mergedList);

      // Clean up localStorage to remove redundant duplicate records
      try {
        const keptIds = new Set(mergedList.map((m) => m.id));
        const cleanedLocal = localSessions.filter((ls) => keptIds.has(ls.id));
        localStorage.setItem('local_debate_history_v15', JSON.stringify(cleanedLocal));
      } catch (e) {
        console.warn('[HistoryTab] Clean local storage error:', e);
      }
    } catch (err) {
      console.error('[HistoryTab] Failed to load history:', err);
      setError('Lỗi khi tải danh sách lịch sử trận đấu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();

    const handleHistoryUpdate = () => {
      void loadHistory();
    };

    window.addEventListener('history-updated', handleHistoryUpdate);
    return () => {
      window.removeEventListener('history-updated', handleHistoryUpdate);
    };
  }, [loadHistory]);

  const toggleSelectSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const filteredSessions = sessions.filter((s) => {
    const topic = s.topic_title || s.topic || '';
    return topic.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const allFilteredIds = filteredSessions.map((s) => s.id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi trận đấu này?')) return;
    setDeletingId(sessionId);
    try {
      try {
        await deleteSessionApi(sessionId);
      } catch (err) {
        console.warn('[HistoryTab] deleteSessionApi warning:', err);
      }

      // Also remove from local storage
      try {
        const localRaw = localStorage.getItem('local_debate_history_v15');
        if (localRaw) {
          const parsed: HistorySessionSummary[] = JSON.parse(localRaw);
          const updated = parsed.filter((s) => s.id !== sessionId);
          localStorage.setItem('local_debate_history_v15', JSON.stringify(updated));
        }
        localStorage.removeItem(`local_debate_replay_${sessionId}`);
      } catch (e) {
        console.warn('[HistoryTab] Local delete error:', e);
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    } catch (err) {
      console.error('[HistoryTab] Failed to delete session:', err);
      alert('Không thể xóa bản ghi lúc này.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${count} bản ghi trận đấu đã chọn? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setLoading(true);
    const targetIds = Array.from(selectedIds);
    try {
      try {
        await bulkDeleteSessions({ sessionIds: targetIds });
      } catch (err) {
        console.warn('[HistoryTab] bulkDeleteSessions API warning:', err);
      }

      // Clear local storage for selected items
      try {
        const localRaw = localStorage.getItem('local_debate_history_v15');
        if (localRaw) {
          const parsed: HistorySessionSummary[] = JSON.parse(localRaw);
          const updated = parsed.filter((s) => !selectedIds.has(s.id));
          localStorage.setItem('local_debate_history_v15', JSON.stringify(updated));
        }
        targetIds.forEach((id) => localStorage.removeItem(`local_debate_replay_${id}`));
      } catch (e) {
        console.warn('[HistoryTab] Local storage selective delete error:', e);
      }

      setSessions((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      window.dispatchEvent(new Event('history-updated'));
    } catch (err) {
      console.error('[HistoryTab] Failed to delete selected sessions:', err);
      alert('Không thể xóa các bản ghi đã chọn lúc này.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (sessions.length === 0) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa TOÀN BỘ ${sessions.length} bản ghi lịch sử trận đấu? Hành động này không thể hoàn tác.`)) {
      return;
    }
    setLoading(true);
    try {
      const sessionIds = sessions.map((s) => s.id);
      try {
        await bulkDeleteSessions({ sessionIds, deleteAll: true });
      } catch (err) {
        console.warn('[HistoryTab] bulkDeleteSessions API warning:', err);
      }

      // Clear local storage history
      try {
        localStorage.removeItem('local_debate_history_v15');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('local_debate_replay_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('[HistoryTab] Local storage clear error:', e);
      }

      setSessions([]);
      setSelectedIds(new Set());
      window.dispatchEvent(new Event('history-updated'));
    } catch (err) {
      console.error('[HistoryTab] Failed to clear all history:', err);
      alert('Không thể xóa toàn bộ lịch sử lúc này.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in">
      {/* ── HEADER & SEARCH CONTROLS ── */}
      <div className="glass-panel rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 dark:border-white/10 shadow-sm transition-all">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
            <span>{t?.historyTitle || (language === 'vi' ? 'Lịch Sử Đối Luyện & Replay' : 'Debate History & Replay')}</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              {sessions.length} {language === 'vi' ? 'trận đấu' : 'debates'}
            </span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {language === 'vi'
              ? 'Xem lại toàn bộ băng ghi âm, cấu trúc luận điểm C-R-E và chỉ số âm học Voice DSP.'
              : 'Review audio playback, C-R-E argument structure, and Voice DSP telemetry metrics.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-60 min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'vi' ? 'Tìm kiếm theo chủ đề...' : 'Search by topic / motion...'}
              className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Action: Delete Selected */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 shrink-0 cursor-pointer shadow-md shadow-rose-600/30"
              title={language === 'vi' ? 'Xóa các bản ghi đã tích chọn' : 'Delete selected records'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              <span>{language === 'vi' ? `Xóa (${selectedIds.size})` : `Delete (${selectedIds.size})`}</span>
            </button>
          )}

          {/* Action: Delete All */}
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 shrink-0 cursor-pointer shadow-sm"
              title={language === 'vi' ? 'Xóa toàn bộ các bản ghi lịch sử' : 'Delete all history records'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              <span>{language === 'vi' ? 'Xóa Hết' : 'Clear All'}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadHistory}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-95 shrink-0 cursor-pointer flex items-center justify-center"
            title={language === 'vi' ? 'Làm mới danh sách' : 'Refresh list'}
            aria-label={language === 'vi' ? 'Làm mới danh sách' : 'Refresh list'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 21h5v-5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── BATCH SELECTION BAR ── */}
      {filteredSessions.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
            />
            <span className="group-hover:text-slate-900 dark:group-hover:text-white font-medium transition-colors">
              {isAllSelected
                ? (language === 'vi' ? `Bỏ chọn tất cả (${filteredSessions.length})` : `Deselect all (${filteredSessions.length})`)
                : selectedIds.size > 0
                ? (language === 'vi' ? `Đã chọn ${selectedIds.size} / ${filteredSessions.length} trận` : `Selected ${selectedIds.size} / ${filteredSessions.length} debates`)
                : (language === 'vi' ? `Chọn tất cả (${filteredSessions.length} trận)` : `Select all (${filteredSessions.length} debates)`)}
            </span>
          </label>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {language === 'vi' ? 'Bỏ chọn' : 'Clear selection'}
            </button>
          )}
        </div>
      )}

      {/* ── SESSIONS LIST ── */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400 text-sm animate-pulse">
          {language === 'vi' ? 'Đang tải danh sách lịch sử trận đấu...' : 'Loading debate history...'}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-rose-500 text-sm">
          {error}
        </div>
      ) : filteredSessions.length === 0 ? (
        /* Empty State */
        <div className="glass-panel-elevated rounded-3xl p-8 md:p-12 text-center flex flex-col items-center justify-center gap-4 border border-slate-200 dark:border-white/10 shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-2xl text-indigo-600 dark:text-indigo-400 shadow-md">
            🎙️
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t?.historyEmpty || (language === 'vi' ? 'Chưa có bản ghi trận đấu nào' : 'No debate records found')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {language === 'vi'
                ? 'Bắt đầu phiên tranh biện đầu tiên để hệ thống tự động lưu trữ và chẩn đoán năng lực tư duy của bạn.'
                : 'Start your first debate sparring session to analyze your critical thinking and speech performance.'}
            </p>
          </div>
          {onStartNewDebate && (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                onStartNewDebate();
              }}
              className="px-5 py-2.5 shimmer-btn text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>🔥 {t?.newDebate || (language === 'vi' ? 'Bắt Đầu Trận Đấu Mới' : 'Start New Debate')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredSessions.map((session) => {
            const isAffirmative = session.user_side === 'AFFIRMATIVE';
            const isScoreAvailable = typeof session.score_total === 'number' && Number.isFinite(session.score_total);
            const scoreNum: number | null = isScoreAvailable && session.score_total !== undefined ? session.score_total : null;
            const isVoiceMode = session.input_mode === 'voice';
            const isSelected = selectedIds.has(session.id);

            return (
              <div
                key={session.id}
                onClick={() => setSelectedReplayId(session.id)}
                className={`glass-panel-elevated rounded-2xl p-4 md:p-5 border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-md ring-1 ring-indigo-500/50'
                    : 'border-slate-200 dark:border-white/10 hover:border-indigo-500/50 hover:shadow-lg'
                }`}
              >
                {/* Checkbox & Left Info */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Select Checkbox */}
                  <div
                    onClick={(e) => toggleSelectSession(session.id, e)}
                    className="pt-1 shrink-0"
                    title={isSelected ? (language === 'vi' ? 'Bỏ chọn' : 'Deselect') : (language === 'vi' ? 'Tích chọn' : 'Select')}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
                      {/* Stance Pill */}
                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${
                          isAffirmative
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                        }`}
                      >
                        {isAffirmative
                          ? (language === 'vi' ? 'Ủng Hộ (Government)' : 'Affirmative (Gov)')
                          : (language === 'vi' ? 'Phản Đối (Opposition)' : 'Negative (Opp)')}
                      </span>

                      {/* Mode Badge */}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                        {isVoiceMode ? (language === 'vi' ? '🎤 Giọng Nói' : '🎤 Voice Mode') : (language === 'vi' ? '💬 Văn Bản' : '💬 Text Mode')}
                      </span>

                      {/* Turn Count */}
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {session.turn_count || 1} {language === 'vi' ? 'lượt' : 'turns'}
                      </span>

                      {/* Date */}
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {new Date(session.created_at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
                      {session.topic_title || session.topic}
                    </h3>
                  </div>
                </div>

                {/* Right Score & Actions */}
                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800/80 pt-3 md:pt-0 pl-7 md:pl-0">
                  {/* Score Pill */}
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {language === 'vi' ? 'Điểm Đánh Giá' : 'Overall Score'}
                    </div>
                    <div className="text-base font-black font-mono text-indigo-700 dark:text-indigo-400">
                      {scoreNum !== null ? (
                        <>
                          {scoreNum.toFixed(1)} <span className="text-[10px] font-sans font-normal text-slate-500">/ 10</span>
                        </>
                      ) : (
                        <span className="text-xs font-sans font-normal text-slate-400">N/A</span>
                      )}
                    </div>
                  </div>

                  {/* Play Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReplayId(session.id);
                    }}
                    className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <span>▶ {language === 'vi' ? 'Xem Replay' : 'Watch Replay'}</span>
                  </button>

                  {/* Single Delete Button */}
                  <button
                    type="button"
                    disabled={deletingId === session.id}
                    onClick={(e) => handleDelete(session.id, e)}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition active:scale-95 cursor-pointer flex items-center justify-center"
                    title={language === 'vi' ? 'Xóa bản ghi này' : 'Delete this record'}
                    aria-label={language === 'vi' ? 'Xóa bản ghi này' : 'Delete this record'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REPLAY MODAL ── */}
      <DebateReplayModal
        sessionId={selectedReplayId}
        onClose={() => {
          stopSpeaking();
          setSelectedReplayId(null);
        }}
      />
    </div>
  );
};

export default HistoryTab;
