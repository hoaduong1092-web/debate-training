/**
 * PlazaTab — Plaza Domain UI (02_DOMAIN_SPEC.md §8)
 *
 * Provides:
 *   1. Plaza Feed — curated showcase debates with sorting and search
 *   2. Like (❤️) and Favorite (⭐) interactions with immediate UI state reflection
 *   3. Learning & Research View — Static modal showing full transcript,
 *      C-R-E analysis, and Logic Coach feedback
 *
 * STRICT NO-LLM & COST SAFETY:
 *   Zero LLM API calls. Zero quota deduction for any action in this tab.
 *   All data is Static Read from curated showcase sessions.
 *
 * Spec: docs/02_DOMAIN_SPEC.md §8, Blueprint v16.x
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Heart,
  Star,
  Eye,
  Search,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  BookOpen,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import {
  PlazaItem,
  PlazaDetailResponse,
  PlazaDetailTurn,
  fetchPlazaFeed,
  fetchPlazaDetail,
  addPlazaLike,
  removePlazaLike,
  addPlazaFavorite,
  removePlazaFavorite,
  recordPlazaView,
  ArenaApiError,
} from '../lib/api';
import { Strings, Language } from '../lib/i18n';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PlazaTabProps {
  t: Strings;
  language: Language;
  /** When true, the tab is visually hidden but stays mounted to preserve state. */
  hidden?: boolean;
}

// ─── Character name helper ────────────────────────────────────────────────────

function characterName(characterId: string, t: Strings): string {
  if (characterId === 'sonTung') return t.plazaSonTung || 'Sơn Tùng M-TP';
  if (characterId === 'hoaMinzy') return t.plazaHoaMinzy || 'Hòa Minzy';
  return characterId;
}

function sideLabel(side: string, t: Strings): string {
  return side === 'AFFIRMATIVE' ? (t.plazaAffirmative || 'Ủng hộ') : (t.plazaNegative || 'Phản đối');
}

function getScoreBadgeClass(score: number): string {
  if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  if (score >= 80) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
  if (score >= 70) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
}

function formatDate(iso: string, language: Language): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Star Badge Helper ────────────────────────────────────────────────────────

function StarBadge({ star }: { star: number | null }) {
  if (star == null) return null;
  return (
    <span className="text-amber-500 font-mono tracking-widest text-xs" aria-label={`${star} sao`}>
      {'★'.repeat(star)}{'☆'.repeat(Math.max(0, 5 - star))}
    </span>
  );
}

// ─── Turn Card Component ──────────────────────────────────────────────────────

interface TurnCardProps {
  turn: PlazaDetailTurn;
  t: Strings;
}

function TurnCard({ turn, t }: TurnCardProps) {
  const isUser = turn.speaker_type === 'user';
  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isUser
          ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40'
          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            isUser
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          {isUser ? (t.plazaYou || 'Người tranh biện') : (t.plazaOpponent || 'Đối thủ AI')}
        </span>
        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 font-medium">
          #{turn.turn_number}
        </span>
      </div>
      <p className="text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
        {turn.text_content}
      </p>
    </div>
  );
}

// ─── Learning View Modal Component ────────────────────────────────────────────

interface LearningModalProps {
  detail: PlazaDetailResponse;
  t: Strings;
  language: Language;
  onClose: () => void;
}

function LearningModal({ detail, t, language, onClose }: LearningModalProps) {
  const { session, turns } = detail;

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const userTurns = turns.filter((t) => t.speaker_type === 'user');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal
      aria-label={t.plazaLearningViewTitle || 'Nghiên cứu & Học tập bài đấu'}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
        
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen size={20} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
                {t.plazaLearningViewTitle || 'Nghiên Cứu & Học Tập Bài Đấu'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {session.topic}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            onClick={onClose}
            aria-label={t.plazaClose || 'Đóng'}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Score Summary Bar */}
        <div className="p-4 md:px-6 bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-xl font-mono font-black text-base md:text-lg border ${getScoreBadgeClass(session.overall_score)}`}>
              {session.overall_score}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Nội dung: {session.content_score}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Phong thái: {session.style_score}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Chiến lược: {session.strategy_score}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-lg font-bold font-mono ${
                session.user_side === 'AFFIRMATIVE'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {sideLabel(session.user_side, t)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
              {characterName(session.character_id, t)}
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              {formatDate(session.created_at, language)}
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-slate-100">
          
          {/* Transcript Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-500" aria-hidden />
              <span>{t.plazaTranscript || 'Băng Ghi Âm & Transcript Chi Tiết'}</span>
            </h3>
            <div className="space-y-3">
              {turns.map((turn) => (
                <TurnCard key={turn.turn_number} turn={turn} t={t} />
              ))}
            </div>
          </div>

          {/* CRE Analysis & Coach Evaluation Section */}
          {userTurns.some((t) => t.cre) && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" aria-hidden />
                <span>{t.plazaCreTitle || 'Phân Tích Luận Điểm C-R-E & Đánh Giá Logic'}</span>
              </h3>

              <div className="space-y-4">
                {userTurns.map(
                  (turn) =>
                    turn.cre && (
                      <div
                        key={turn.turn_number}
                        className="p-4 md:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            Lượt {Math.ceil(turn.turn_number / 2)}
                          </span>
                          {turn.evidence_star != null && <StarBadge star={turn.evidence_star} />}
                        </div>

                        {/* C-R-E Rows */}
                        <div className="space-y-2 text-xs leading-relaxed">
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 font-black flex items-center justify-center shrink-0">
                              C
                            </span>
                            <div className="flex-1">
                              <strong className="text-slate-700 dark:text-slate-300">Luận điểm (Claim):</strong>{' '}
                              <span className="text-slate-600 dark:text-slate-400">{turn.cre.claim}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 font-black flex items-center justify-center shrink-0">
                              R
                            </span>
                            <div className="flex-1">
                              <strong className="text-slate-700 dark:text-slate-300">Lập luận (Reasoning):</strong>{' '}
                              <span className="text-slate-600 dark:text-slate-400">{turn.cre.reasoning}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 font-black flex items-center justify-center shrink-0">
                              E
                            </span>
                            <div className="flex-1">
                              <strong className="text-slate-700 dark:text-slate-300">Dẫn chứng (Evidence):</strong>{' '}
                              <span className="text-slate-600 dark:text-slate-400">{turn.cre.evidence}</span>
                            </div>
                          </div>
                        </div>

                        {/* Fallacies */}
                        {turn.fallacies_detected && turn.fallacies_detected.length > 0 ? (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertTriangle size={14} aria-hidden />
                              <span>{t.plazaFallacies || 'Ngụy biện phát hiện'}:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                              {turn.fallacies_detected.map((f) => (
                                <li key={f}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 size={14} aria-hidden />
                            <span>{t.plazaNoFallacies || 'Không phát hiện ngụy biện logic'}</span>
                          </div>
                        )}

                        {/* Coach Feedback */}
                        {turn.coach_feedback && (
                          <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/30 text-xs space-y-2">
                            <div className="flex items-center justify-between font-bold text-violet-700 dark:text-violet-300">
                              <div className="flex items-center gap-1.5">
                                <TrendingUp size={14} aria-hidden />
                                <span>{t.plazaCoachEval || 'Đánh giá từ Huấn Luyện Viên Logic'}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-violet-600 text-white font-mono text-[11px]">
                                {turn.coach_feedback.score}/100
                              </span>
                            </div>

                            {turn.coach_feedback.strengths.length > 0 && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                <strong className="text-emerald-600 dark:text-emerald-400">✅ Điểm mạnh:</strong>{' '}
                                {turn.coach_feedback.strengths.join('; ')}
                              </div>
                            )}

                            {turn.coach_feedback.weaknesses.length > 0 && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                <strong className="text-amber-600 dark:text-amber-400">⚠️ Cần cải thiện:</strong>{' '}
                                {turn.coach_feedback.weaknesses.join('; ')}
                              </div>
                            )}

                            {turn.coach_feedback.actionable_suggestions.length > 0 && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                <strong className="text-indigo-600 dark:text-indigo-400">💡 Gợi ý hành động:</strong>{' '}
                                {turn.coach_feedback.actionable_suggestions.join('; ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
          <button
            type="button"
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            onClick={onClose}
          >
            {t.plazaClose || 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Debate Card Component ────────────────────────────────────────────────────

interface DebateCardProps {
  item: PlazaItem;
  t: Strings;
  onLike: (id: string) => void;
  onFavorite: (id: string) => void;
  onStudy: (id: string) => void;
  likePending: boolean;
  favoritePending: boolean;
}

function DebateCard({
  item,
  t,
  onLike,
  onFavorite,
  onStudy,
  likePending,
  favoritePending,
}: DebateCardProps) {
  return (
    <article
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 cursor-pointer group"
      onClick={() => onStudy(item.id)}
    >
      {/* Top section: Score & Topic */}
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 border ${getScoreBadgeClass(
            item.overall_score,
          )}`}
        >
          {item.overall_score}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {item.topic}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`px-2 py-0.5 rounded-md font-bold font-mono ${
                item.user_side === 'AFFIRMATIVE'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
              }`}
            >
              {sideLabel(item.user_side, t)}
            </span>
            <span className="px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {characterName(item.character_id, t)}
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              {item.turn_count} {t.plazaTurns || 'lượt'}
            </span>
          </div>
        </div>
      </div>

      {/* Highlight Quote */}
      {item.highlight_quote && (
        <blockquote className="text-xs italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 line-clamp-3">
          "{item.highlight_quote}"
        </blockquote>
      )}

      {/* Footer Date & Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {/* Like Button */}
          <button
            type="button"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              item.is_liked
                ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-500/5'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onLike(item.id);
            }}
            disabled={likePending}
            aria-label={t.plazaLike || 'Thích'}
            aria-pressed={item.is_liked}
          >
            <Heart size={14} aria-hidden fill={item.is_liked ? 'currentColor' : 'none'} />
            <span className="font-mono">{item.like_count}</span>
          </button>

          {/* Favorite Button */}
          <button
            type="button"
            className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
              item.is_favorited
                ? 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50/50'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(item.id);
            }}
            disabled={favoritePending}
            aria-label={t.plazaFavorite || 'Lưu bookmark'}
            aria-pressed={item.is_favorited}
            title={item.is_favorited ? 'Đã lưu vào danh sách học tập' : 'Lưu bài đấu'}
          >
            <Star size={14} aria-hidden fill={item.is_favorited ? 'currentColor' : 'none'} />
          </button>

          {/* View Counter */}
          <div
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 dark:text-slate-500 font-mono"
            aria-label={`${item.view_count} ${t.plazaViews || 'lượt xem'}`}
          >
            <Eye size={13} aria-hidden />
            <span>{item.view_count}</span>
          </div>
        </div>

        {/* Study Action Button */}
        <button
          type="button"
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onStudy(item.id);
          }}
          aria-label={t.plazaStudy || 'Nghiên cứu bài nói'}
        >
          <BookOpen size={13} aria-hidden />
          <span>{t.plazaStudy || 'Nghiên cứu bài nói'}</span>
        </button>
      </div>
    </article>
  );
}

// ─── PlazaTab Main Component ──────────────────────────────────────────────────

export default function PlazaTab({ t, language, hidden = false }: PlazaTabProps) {
  // ── Feed State ─────────────────────────────────────────────────────────────
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<PlazaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Interaction State ──────────────────────────────────────────────────────
  const [likePending, setLikePending] = useState<Set<string>>(new Set());
  const [favoritePending, setFavoritePending] = useState<Set<string>>(new Set());

  // ── Learning View State ────────────────────────────────────────────────────
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlazaDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── Search debounce ref ────────────────────────────────────────────────────
  const searchRef = useRef(searchQuery);
  searchRef.current = searchQuery;

  // ── Load Feed ──────────────────────────────────────────────────────────────
  const loadFeed = useCallback(
    async (currentSort: 'latest' | 'popular', keyword: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const resp = await fetchPlazaFeed(currentSort, keyword);
        setItems(resp.items);
      } catch (err) {
        const msg =
          err instanceof ArenaApiError
            ? `${t.plazaLoadError || 'Không thể tải danh sách Quảng trường'} (${err.status})`
            : (t.plazaLoadError || 'Không thể tải danh sách Quảng trường');
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    },
    [t.plazaLoadError],
  );

  useEffect(() => {
    if (!hidden) {
      void loadFeed(sort, searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, hidden]);

  // Load when search is submitted (Enter key)
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loadFeed(sort, searchQuery);
  }

  // ── Like Toggle with Optimistic UI & Rollback ──────────────────────────────
  async function handleLike(sessionId: string) {
    if (likePending.has(sessionId)) return;

    const currentItem = items.find((i) => i.id === sessionId);
    if (!currentItem) return;

    const wasLiked = currentItem.is_liked;
    const prevLikeCount = currentItem.like_count;
    const nextLiked = !wasLiked;
    const nextLikeCount = wasLiked ? Math.max(0, prevLikeCount - 1) : prevLikeCount + 1;

    // 1. Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id !== sessionId
          ? item
          : {
              ...item,
              is_liked: nextLiked,
              like_count: nextLikeCount,
            },
      ),
    );

    setLikePending((prev) => new Set([...prev, sessionId]));
    try {
      // 2. Call API (add or remove)
      const resp = wasLiked
        ? await removePlazaLike(sessionId)
        : await addPlazaLike(sessionId);

      // 3. Sync with server response
      setItems((prev) =>
        prev.map((item) =>
          item.id !== sessionId
            ? item
            : {
                ...item,
                is_liked: resp.is_liked ?? nextLiked,
                like_count: resp.like_count ?? nextLikeCount,
              },
        ),
      );
    } catch {
      // 4. Rollback optimistic update on error
      setItems((prev) =>
        prev.map((item) =>
          item.id !== sessionId
            ? item
            : {
                ...item,
                is_liked: wasLiked,
                like_count: prevLikeCount,
              },
        ),
      );
    } finally {
      setLikePending((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }

  // ── Favorite Toggle with Optimistic UI & Rollback ──────────────────────────
  async function handleFavorite(sessionId: string) {
    if (favoritePending.has(sessionId)) return;

    const currentItem = items.find((i) => i.id === sessionId);
    if (!currentItem) return;

    const wasFavorited = currentItem.is_favorited;
    const nextFavorited = !wasFavorited;

    // 1. Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id !== sessionId
          ? item
          : {
              ...item,
              is_favorited: nextFavorited,
            },
      ),
    );

    setFavoritePending((prev) => new Set([...prev, sessionId]));
    try {
      // 2. Call API (add or remove)
      const resp = wasFavorited
        ? await removePlazaFavorite(sessionId)
        : await addPlazaFavorite(sessionId);

      setItems((prev) =>
        prev.map((item) =>
          item.id !== sessionId
            ? item
            : {
                ...item,
                is_favorited: resp.is_favorited ?? nextFavorited,
              },
        ),
      );
    } catch {
      // 3. Rollback
      setItems((prev) =>
        prev.map((item) =>
          item.id !== sessionId
            ? item
            : {
                ...item,
                is_favorited: wasFavorited,
              },
        ),
      );
    } finally {
      setFavoritePending((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  }

  // ── Open Learning Modal & Record View ──────────────────────────────────────
  async function handleStudy(sessionId: string) {
    setOpenSessionId(sessionId);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    // Fire record view in background
    void recordPlazaView(sessionId)
      .then((viewResp) => {
        if (viewResp.view_count !== undefined) {
          setItems((prev) =>
            prev.map((item) =>
              item.id !== sessionId ? item : { ...item, view_count: viewResp.view_count! },
            ),
          );
        }
      })
      .catch(() => {
        // Non-blocking view tracking
      });

    try {
      const resp = await fetchPlazaDetail(sessionId);
      setDetail(resp);
      // Sync updated view count back to feed
      setItems((prev) =>
        prev.map((item) =>
          item.id !== sessionId ? item : { ...item, view_count: resp.session.view_count },
        ),
      );
    } catch {
      setDetailError(t.plazaLoadError || 'Không thể tải dữ liệu bài đấu');
    } finally {
      setDetailLoading(false);
    }
  }

  function closeModal() {
    setOpenSessionId(null);
    setDetail(null);
    setDetailError(null);
  }

  if (hidden) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto text-slate-900 dark:text-slate-100">
      {/* ── Top Header Card ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users size={24} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t.plazaTitle || 'Quảng trường Tranh biện'}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t.plazaSubtitle || 'Học hỏi từ các bài tranh biện xuất sắc của cộng đồng'}
            </p>
          </div>
        </div>

        {/* Sort Tabs & Search Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Segmented Sort Tabs */}
          <div className="inline-flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60" role="tablist" aria-label="Sắp xếp bài tranh biện">
            <button
              type="button"
              role="tab"
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sort === 'latest'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              onClick={() => setSort('latest')}
              aria-selected={sort === 'latest'}
            >
              {t.plazaLatest || 'Mới nhất'}
            </button>
            <button
              type="button"
              role="tab"
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sort === 'popular'
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              onClick={() => setSort('popular')}
              aria-selected={sort === 'popular'}
            >
              {t.plazaPopular || 'Phổ biến'}
            </button>
          </div>

          {/* Search Form */}
          <form className="relative flex-1 sm:w-64" onSubmit={handleSearchSubmit} role="search">
            <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.plazaSearchPlaceholder || 'Tìm kiếm chủ đề tranh luận...'}
              aria-label={t.plazaSearchPlaceholder || 'Tìm kiếm chủ đề tranh luận'}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                onClick={() => {
                  setSearchQuery('');
                  void loadFeed(sort, '');
                }}
                aria-label="Xóa tìm kiếm"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── Feed Content Section ── */}
      <div>
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
            <Loader2 size={32} className="animate-spin text-indigo-500" aria-hidden />
            <span className="text-xs font-medium">{t.plazaLoading || 'Đang tải dữ liệu Quảng trường...'}</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex flex-col items-center justify-center gap-3 text-center">
            <AlertCircle size={28} aria-hidden />
            <span className="text-xs font-semibold">{loadError}</span>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              onClick={() => loadFeed(sort, searchQuery)}
            >
              {t.loading || 'Thử lại'}
            </button>
          </div>
        )}

        {!loading && !loadError && items.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center">
            <Users size={40} className="text-slate-300 dark:text-slate-700" aria-hidden />
            <p className="text-sm font-medium">
              {searchQuery ? (t.plazaNoResults || 'Không tìm thấy bài tranh biện nào phù hợp') : (t.plazaEmpty || 'Chưa có bài tranh biện nào')}
            </p>
          </div>
        )}

        {!loading && !loadError && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <DebateCard
                key={item.id}
                item={item}
                t={t}
                onLike={handleLike}
                onFavorite={handleFavorite}
                onStudy={handleStudy}
                likePending={likePending.has(item.id)}
                favoritePending={favoritePending.has(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Learning View Modal ── */}
      {openSessionId && (
        <>
          {detailLoading && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-2xl">
                <Loader2 size={32} className="animate-spin text-indigo-500" aria-hidden />
                <p className="text-xs font-semibold">{t.plazaLoading || 'Đang tải chi tiết bài tranh biện...'}</p>
              </div>
            </div>
          )}

          {detailError && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-rose-500 shadow-2xl max-w-sm text-center">
                <AlertCircle size={28} aria-hidden />
                <p className="text-xs font-semibold">{detailError}</p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <ChevronLeft size={14} className="inline mr-1" aria-hidden /> {t.plazaClose || 'Đóng'}
                </button>
              </div>
            </div>
          )}

          {detail && !detailLoading && !detailError && (
            <LearningModal detail={detail} t={t} language={language} onClose={closeModal} />
          )}
        </>
      )}
    </div>
  );
}
