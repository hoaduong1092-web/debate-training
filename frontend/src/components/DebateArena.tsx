import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  sendDebateMessage,
  createDebateSession,
  completeDebateSession,
  fetchVoiceEntitlement,
  VoiceEntitlementResult,
  MessageResponse,
  DebateStance,
  VoiceMetricsPayload,
  FinalDebateDraft,
  TurnArgumentContext,
} from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { AudioCheckModal } from './AudioCheckModal';
import { PricingModal } from './PricingModal';
import { MatchHeader } from './arena/MatchHeader';
import { ArenaSetup } from './arena/ArenaSetup';
import { SparringFeed } from './arena/SparringFeed';
import { DebateInput } from './arena/DebateInput';
import { CoachPanel } from './arena/CoachPanel';
import { CoachBottomSheet } from './arena/CoachBottomSheet';
import { ArgumentMapHUD } from './arena/ArgumentMapHUD';
import { speakOpponentResponse, stopActiveSpeech, isAudioUnlocked, isActuallyPlaying, onPlaybackStateChange, logVoiceDebateDiagnostics } from '../utils/tts';
import { Strings, Language } from '../lib/i18n';

// --- INLINE SVG ICONS (CLEAN & ADAPTIVE) ---
const Icons = {
  Mic: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  ),
  Text: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>
    </svg>
  ),
  Send: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Volume: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  ),
  VolumeX: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" x2="17" y1="9" y2="15"/>
      <line x1="17" x2="23" y1="9" y2="15"/>
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Bell: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  ),
  Bot: () => (
    <svg width="20" height="20" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" className="w-4 h-4 text-white shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Play: () => (
    <svg width="12" height="12" className="w-3 h-3 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Pause: () => (
    <svg width="12" height="12" className="w-3 h-3 shrink-0 inline-block" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  Target: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Brain: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
      <path d="M12 5v13"/>
    </svg>
  ),
  BarChart: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Sparkles: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Flag: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  RotateCcw: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" className="w-3.5 h-3.5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

export interface TurnData {
  turnNumber: number;
  userText: string;
  opponentText: string;
  logicScore: number | null;
  cre: { claim: string; reasoning: string; evidence: string };
  evidenceStar?: number;
  fallacies: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  wpm?: number;
  fillers?: number;
  durationMs?: number;
  audioUrl?: string | null;
  opponentAudioUrl?: string | null;
}

export type DebateFormat = 'WSDC' | 'AP' | 'BP';

export const FORMAT_RULES: Record<string, { teams: string; time: string; features: string; audience: string }> = {
  'WSDC': {
    teams: '2 đội (3 người/đội)',
    time: '8 phút chính, 4 phút tổng kết',
    features: 'Có hỏi đáp trực tiếp (POI). Trọng tâm vào tính hệ thống và làm việc nhóm.',
    audience: 'Học sinh cấp 2, cấp 3; Người mới bắt đầu.'
  },
  'BP': {
    teams: '4 đội (2 người/đội)',
    time: '7 phút/lượt',
    features: 'Cạnh tranh đa chiều (phải đấu với cả đội cùng phe). Không có lượt tổng kết.',
    audience: 'Sinh viên Đại học, người thích tư duy đào sâu.'
  },
  'AP': {
    teams: '2 đội (3 người/đội)',
    time: '7 phút chính, 4 phút tổng kết',
    features: 'Có Lượt phản hồi (Reply speech). Nhịp độ nhanh.',
    audience: 'Người luyện tốc độ phản xạ và chiến thuật.'
  }
};

export interface DebateTopicItem {
  id: string;
  category: 'education' | 'tech' | 'society' | 'environment' | 'economy';
  categoryLabel: string;
  title: string;
  context?: string;
  suggestedFormat?: DebateFormat;
}

export const CURATED_DEBATE_TOPICS: DebateTopicItem[] = [
  {
    id: 'ai-teachers',
    category: 'tech',
    categoryLabel: '🤖 Công nghệ & AI',
    title: 'Trí tuệ nhân tạo sẽ thay thế giáo viên trong tương lai',
    context: 'Xem xét sự phát triển của LLM, tính cá nhân hóa trong giáo dục và vai trò truyền cảm hứng sư phạm của con người.',
    suggestedFormat: 'WSDC',
  },
  {
    id: 'ai-art-copyright',
    category: 'tech',
    categoryLabel: '🤖 Công nghệ & AI',
    title: 'Nên cấm các sản phẩm nghệ thuật tạo bằng AI tham gia các giải thưởng sáng tạo',
    context: 'Bảo vệ giá trị lao động sáng tạo của con người và tính minh bạch trong quyền tác giả.',
    suggestedFormat: 'AP',
  },
  {
    id: 'social-media-age',
    category: 'tech',
    categoryLabel: '🤖 Công nghệ & AI',
    title: 'Cấm trẻ em dưới 16 tuổi sử dụng mạng xã hội độc lập',
    context: 'Cân bằng giữa bảo vệ sức khỏe tâm thần trẻ vị thành niên và quyền tiếp cận thông tin kỹ thuật số.',
    suggestedFormat: 'WSDC',
  },
  {
    id: 'school-uniform',
    category: 'education',
    categoryLabel: '🎓 Giáo dục & Học đường',
    title: 'Nên bãi bỏ quy định mặc đồng phục bắt buộc tại các trường phổ thông',
    context: 'Tranh luận về sự tự do thể hiện cá nhân so với sự bình đẳng, kỷ luật và chống phân biệt giàu nghèo.',
    suggestedFormat: 'WSDC',
  },
  {
    id: 'standardized-testing',
    category: 'education',
    categoryLabel: '🎓 Giáo dục & Học đường',
    title: 'Các kỳ thi chuẩn hóa quốc gia làm suy giảm tư duy phản biện của học sinh',
    context: 'Đánh giá giữa tính công bằng khách quan của thi chuẩn hóa với việc rèn luyện tư duy sáng tạo thực tiễn.',
    suggestedFormat: 'BP',
  },
  {
    id: 'carbon-tax',
    category: 'environment',
    categoryLabel: '🌍 Môi trường & Bền vững',
    title: 'Áp thuế carbon toàn cầu lên tất cả các doanh nghiệp sản xuất phát thải cao',
    context: 'Trách nhiệm đối với biến đổi khí hậu và tác động tới chi phí tiêu dùng của người dân.',
    suggestedFormat: 'BP',
  },
  {
    id: 'single-use-plastic',
    category: 'environment',
    categoryLabel: '🌍 Môi trường & Bền vững',
    title: 'Cấm hoàn toàn đồ nhựa dùng một lần trong ngành ẩm thực và bán lẻ',
    context: 'Tác động môi trường đại dương và khả năng thích ứng của các doanh nghiệp vừa và nhỏ.',
    suggestedFormat: 'WSDC',
  },
  {
    id: 'four-day-workweek',
    category: 'society',
    categoryLabel: '⚖️ Xã hội & Đạo đức',
    title: 'Áp dụng tuần làm việc 4 ngày (32 giờ) với mức lương không đổi',
    context: 'Cải thiện sức khỏe thể chất/tinh thần của người lao động và bài toán năng suất kinh tế vĩ mô.',
    suggestedFormat: 'AP',
  },
  {
    id: 'ubi',
    category: 'society',
    categoryLabel: '⚖️ Xã hội & Đạo đức',
    title: 'Chính phủ nên cung cấp Thu nhập Cơ bản Phổ quát (UBI) cho toàn bộ công dân',
    context: 'Giải quyết bất bình đẳng và thất nghiệp do tự động hóa kỷ nguyên AI.',
    suggestedFormat: 'BP',
  },
  {
    id: 'cashless-society',
    category: 'economy',
    categoryLabel: '💰 Kinh tế & Toàn cầu',
    title: 'Xóa bỏ hoàn toàn tiền mặt và chuyển sang nền kinh tế kỹ thuật số 100%',
    context: 'Minh bạch tài chính, chống trốn thuế so với quyền riêng tư và nguy cơ an ninh mạng.',
    suggestedFormat: 'AP',
  },
];

const STORAGE_KEY = 'active_debate_session_v15';

export interface DebateArenaProps {
  onNavigateToHistory?: () => void;
  onOpenAssistant?: (topic?: string, stance?: DebateStance) => void;
  prefilledTopic?: string;
  prefilledStance?: DebateStance;
  prefilledDraft?: string;
  finalDraft?: FinalDebateDraft | null;
  onClearPrefill?: () => void;
  language?: Language;
  t?: Strings;
}



export const DebateArena: React.FC<DebateArenaProps> = ({
  onNavigateToHistory,
  onOpenAssistant,
  prefilledTopic,
  prefilledStance,
  prefilledDraft,
  finalDraft,
  onClearPrefill,
  language = 'vi',
}) => {
  const isVi = language === 'vi';
  const { user, refreshUser } = useAuth();
  const [topic, setTopic] = useState('Trí tuệ nhân tạo sẽ thay thế giáo viên trong tương lai');
  const [stance, setStance] = useState<DebateStance>('AFFIRMATIVE');
  const [format, setFormat] = useState<DebateFormat>('WSDC');
  const [showFormatRules, setShowFormatRules] = useState<boolean>(false);
  const [showMotionModal, setShowMotionModal] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ─── Voice Entitlement Preflight State (Phases B6 & B9 Authority) ─────────
  const [voiceEntitlement, setVoiceEntitlement] = useState<VoiceEntitlementResult | null>(null);
  const [isCheckingEntitlement, setIsCheckingEntitlement] = useState<boolean>(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);

  const checkVoiceEntitlement = useCallback(async () => {
    setIsCheckingEntitlement(true);
    try {
      const res = await fetchVoiceEntitlement(user?.id);
      if (res.success && res.entitlement) {
        setVoiceEntitlement(res.entitlement);
      }
    } catch (e) {
      console.warn('[Arena] Failed to check voice entitlement:', e);
    } finally {
      setIsCheckingEntitlement(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (inputMode === 'voice') {
      // Only check voice entitlement when switching to voice mode.
      // Do NOT override autoPlayTts — respect the user's saved preference.
      void checkVoiceEntitlement();
    }
  }, [inputMode, checkVoiceEntitlement]);

  // ─── Argument Map & Structured Draft Tracking (Contract Closure v1.1) ─────
  const [currentFinalDraft, setCurrentFinalDraft] = useState<FinalDebateDraft | null>(finalDraft || null);
  const [activeArgumentId, setActiveArgumentId] = useState<string | null>(null);
  const [targetArgumentId, setTargetArgumentId] = useState<string | null>(null);
  const [debatedArgumentIds, setDebatedArgumentIds] = useState<Set<string>>(new Set());

  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [autoPlayTts, setAutoPlayTts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arena_autoplay_tts');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default auto-play enabled for hands-free voice debate
  });

  // ═══ PLAYBACK STATE MACHINE SYNC ═══
  // Subscribe to the authoritative playback state from tts.ts.
  // This is the ONLY place isTtsPlaying should be set — never from onEnd callbacks.
  useEffect(() => {
    const unsubscribe = onPlaybackStateChange((state) => {
      const isPlaying = state === 'playing_audio' || state === 'playing_speech';
      setIsTtsPlaying(isPlaying);
    });
    return unsubscribe;
  }, []);

  // Track the turn index that has already initiated speech to prevent duplicate playback on re-render
  const lastSpokenTurnRef = useRef<number>(-1);

  const [turns, setTurns] = useState<TurnData[]>([]);
  const [selectedTurn, setSelectedTurn] = useState<number>(0);

  const [speechSeconds, setSpeechSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [poiStatus, setPoiStatus] = useState<'INACTIVE' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED'>('INACTIVE');
  const [poiSecondsLeft, setPoiSecondsLeft] = useState(15);

  const [isCompleted, setIsCompleted] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showAudioCheckModal, setShowAudioCheckModal] = useState(false);
  const [isCoachSheetOpen, setIsCoachSheetOpen] = useState(false);
  const [showNewResponseIndicator, setShowNewResponseIndicator] = useState(false);
  const isNearBottomRef = useRef(true);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const prevTurnsCountRef = useRef(0);

  // Smart scroll tracker: detect if user is near bottom
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPos = window.innerHeight + window.scrollY;
          const threshold = document.documentElement.scrollHeight - 280;
          const isNear = scrollPos >= threshold;
          isNearBottomRef.current = isNear;
          if (isNear) {
            setShowNewResponseIndicator(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // When turns array increases: auto-scroll if near bottom, else show indicator
  useEffect(() => {
    if (turns.length > prevTurnsCountRef.current) {
      if (isNearBottomRef.current) {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setShowNewResponseIndicator(false);
      } else {
        setShowNewResponseIndicator(true);
      }
      prevTurnsCountRef.current = turns.length;
    }
  }, [turns.length]);

  // Escape key handler for modals
  useEffect(() => {
    if (!showSummaryModal && !showAudioCheckModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSummaryModal) setShowSummaryModal(false);
        if (showAudioCheckModal) setShowAudioCheckModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSummaryModal, showAudioCheckModal]);

  // Stable session reference to prevent duplicate history records
  const stableSessionIdRef = useRef<string>(sessionId || '');

  // Audio player for user's own recording
  const [userAudioPlayingTurn, setUserAudioPlayingTurn] = useState<number | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const totalDuration = 480; // 8 minutes speech
  const isProtectedTime = speechSeconds < 60 || speechSeconds > (totalDuration - 60);

  // Handle Motion Switch with Safety Confirmation if match in-flight
  const handleSelectMotion = useCallback((newTopic: string, suggestedFormat?: DebateFormat) => {
    const trimmed = newTopic.trim();
    if (!trimmed) return;

    if (turns.length > 0) {
      const confirmChange = window.confirm(
        'Bạn đang có một phiên tranh biện dở dang. Đổi sang kiến nghị mới sẽ bắt đầu một phiên đấu mới từ Lượt 1. Bạn có muốn tiếp tục?'
      );
      if (!confirmChange) return;
    }

    stopActiveSpeech();
    lastSpokenTurnRef.current = -1;
    setTurns([]);
    setSelectedTurn(0);
    setSpeechSeconds(0);
    setIsTimerRunning(false);
    setIsCompleted(false);
    setInputText('');
    setTopic(trimmed);
    setCurrentFinalDraft(null);
    setActiveArgumentId(null);
    setTargetArgumentId(null);
    setDebatedArgumentIds(new Set());
    if (suggestedFormat) {
      setFormat(suggestedFormat);
    }
    const newSid = `session-${Date.now()}`;
    setSessionId(newSid);
    stableSessionIdRef.current = newSid;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setShowMotionModal(false);
  }, [turns.length]);

  // Sync incoming FinalDebateDraft from props
  useEffect(() => {
    if (finalDraft) {
      setCurrentFinalDraft(finalDraft);
      if (finalDraft.arguments && finalDraft.arguments.length > 0) {
        setActiveArgumentId(finalDraft.arguments[0]!.argumentId);
        setTargetArgumentId(finalDraft.arguments[0]!.argumentId);
      }
    }
  }, [finalDraft]);

  // Apply Prefilled Topic / Stance / Draft from Assistant Panel
  useEffect(() => {
    if (prefilledTopic && prefilledTopic.trim()) {
      setTopic(prefilledTopic.trim());
    }
    if (prefilledStance) {
      setStance(prefilledStance);
    }
    // Only prefill plain text into inputText if NO structured finalDraft is provided
    if (!finalDraft && prefilledDraft && prefilledDraft.trim()) {
      setInputText(prefilledDraft.trim());
      setInputMode('text');
    }
    if (prefilledTopic || prefilledDraft || finalDraft) {
      onClearPrefill?.();
    }
  }, [prefilledTopic, prefilledStance, prefilledDraft, finalDraft, onClearPrefill]);

  // --- RESTORE PERSISTED STATE ON INITIAL MOUNT ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.topic) setTopic(parsed.topic);
          if (parsed.stance) setStance(parsed.stance);
          if (parsed.format) setFormat(parsed.format);
          if (parsed.sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.sessionId)) {
            setSessionId(parsed.sessionId);
            stableSessionIdRef.current = parsed.sessionId;
          }
          if (Array.isArray(parsed.turns) && parsed.turns.length > 0) {
            setTurns(parsed.turns);
            setSelectedTurn(parsed.selectedTurn ?? parsed.turns.length - 1);
          }
          if (typeof parsed.speechSeconds === 'number') setSpeechSeconds(parsed.speechSeconds);
          if (typeof parsed.isCompleted === 'boolean') setIsCompleted(parsed.isCompleted);
          if (parsed.finalDraft) {
            setCurrentFinalDraft(parsed.finalDraft);
            if (parsed.finalDraft.arguments && parsed.finalDraft.arguments.length > 0) {
              setActiveArgumentId(parsed.finalDraft.arguments[0]!.argumentId);
            }
          }
          if (Array.isArray(parsed.debatedArgumentIds)) {
            setDebatedArgumentIds(new Set(parsed.debatedArgumentIds));
          }
        }
      }
    } catch (e) {
      console.warn('[Arena] Failed to restore session from localStorage:', e);
    }
  }, []);

  // --- SAVE STATE ON UPDATES ---
  useEffect(() => {
    try {
      if (turns.length > 0 || sessionId) {
        const sidToSave = sessionId || stableSessionIdRef.current;
        const stateToSave = {
          topic,
          stance,
          format,
          sessionId: sidToSave,
          turns,
          selectedTurn,
          speechSeconds,
          isCompleted,
          finalDraft: currentFinalDraft,
          debatedArgumentIds: Array.from(debatedArgumentIds),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }
    } catch (e) {
      console.warn('[Arena] Failed to save session to localStorage:', e);
    }
  }, [topic, stance, format, sessionId, turns, selectedTurn, speechSeconds, isCompleted, currentFinalDraft, debatedArgumentIds]);

  // Safe global cleanup on unmount
  useEffect(() => {
    return () => {
      stopActiveSpeech();
      if (userAudioRef.current) userAudioRef.current.pause();
    };
  }, []);

  // Manual turn navigation by user (from MatchHeader or Turn tabs)
  const handleManualSelectTurn = useCallback((turnIdx: number) => {
    stopActiveSpeech();
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      setUserAudioPlayingTurn(null);
    }
    setSelectedTurn(turnIdx);
  }, []);

  // Pause user recording audio playback when switching turns (do NOT stop opponent TTS here)
  useEffect(() => {
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      setUserAudioPlayingTurn(null);
    }
  }, [selectedTurn]);

  // Cut off speech immediately if user switches from voice to text mode
  useEffect(() => {
    if (inputMode === 'text') {
      stopActiveSpeech();
    }
  }, [inputMode]);

  // Speech Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => setSpeechSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // POI 15s Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (poiStatus === 'ACCEPTED' && poiSecondsLeft > 0) {
      timer = setInterval(() => {
        setPoiSecondsLeft((s) => {
          if (s <= 1) {
            setPoiStatus('INACTIVE');
            return 15;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [poiStatus, poiSecondsLeft]);

  // Auto-init session if empty (strictly reused across all turns)
  const ensureSession = useCallback(async () => {
    const activeId = stableSessionIdRef.current || sessionId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (activeId && isUuid.test(activeId)) {
      stableSessionIdRef.current = activeId;
      if (sessionId !== activeId) setSessionId(activeId);
      return activeId;
    }
    const targetUserId = user?.id || '22222222-2222-2222-2222-222222222222';
    const res = await createDebateSession({
      userId: targetUserId,
      topic,
      character_id: 'sonTung',
      user_side: stance,
      input_mode: inputMode,
    });
    if (res.success && res.session?.id) {
      const oldId = stableSessionIdRef.current;
      setSessionId(res.session.id);
      stableSessionIdRef.current = res.session.id;

      // Clean up temporary session entry if saved before API returned
      if (oldId && oldId !== res.session.id) {
        try {
          const raw = localStorage.getItem('local_debate_history_v15');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              localStorage.setItem('local_debate_history_v15', JSON.stringify(list.filter((s: any) => s.id !== oldId)));
            }
          }
        } catch {}
      }

      return res.session.id;
    }
    throw new Error('Không thể khởi tạo phiên tranh biện trên máy chủ.');
  }, [sessionId, topic, stance, user?.id]);

  // Guaranteed Opponent Speech Playback (Auto-play & Explicit play)
  // UI state (isTtsPlaying) is driven by the playback state machine subscription,
  // NOT by onEnd/onStart callbacks here.
  const playOpponentTts = useCallback((text: string, audioUrl?: string | null) => {
    speakOpponentResponse(text, {
      lang: 'vi-VN',
      gender: 'male',
      voiceId: 'sonTung',
      rate: 1.0,
      pitch: 1.0,
      audioUrl: audioUrl || undefined,
      // onEnd/onStart NOT needed here — playback state machine drives UI
    });
  }, []);

  // Manual Toggle button helper (Play / Stop)
  // CRITICAL: Uses isActuallyPlaying() from the playback controller as the
  // AUTHORITATIVE source, not the React isTtsPlaying boolean which can be stale.
  const handleTtsPlayback = useCallback((text: string, audioUrl?: string | null) => {
    if (isActuallyPlaying()) {
      // Audio is truly playing — STOP it
      stopActiveSpeech();
    } else {
      // Audio is not playing — START it
      playOpponentTts(text, audioUrl);
    }
  }, [playOpponentTts]);

  // --- SAVE SESSION TO HISTORY (STRICT UPSERT TO PREVENT DUPLICATES) ---
  const saveSessionToHistory = useCallback(async (currentTurns = turns, sid = sessionId, isFinal = false) => {
    if (currentTurns.length === 0) return;
    const targetUserId = user?.id || '22222222-2222-2222-2222-222222222222';
    const finalSid = sid || sessionId || stableSessionIdRef.current;
    const totalVoiceMs = currentTurns
      .filter((t) => typeof t.durationMs === 'number' && t.durationMs > 0)
      .reduce((sum, t) => sum + Math.round(t.durationMs!), 0);

    // 1. Only call completeDebateSession on backend when session is genuinely completed
    if (isFinal && finalSid && !finalSid.startsWith('session-')) {
      try {
        await completeDebateSession(finalSid, targetUserId, totalVoiceMs > 0 ? totalVoiceMs : undefined);
      } catch (err) {
        console.warn('[Arena] completeDebateSession API warning:', err);
      }
    }

    // 2. Persist to local_debate_history_v15 (Strict UPSERT)
    try {
      const scoredTurns = currentTurns.filter((t) => typeof t.logicScore === 'number' && Number.isFinite(t.logicScore));
      const avgScore = scoredTurns.length > 0
        ? +(scoredTurns.reduce((acc, t) => acc + (t.logicScore as number), 0) / scoredTurns.length).toFixed(1)
        : 0;
      const rawHistory = localStorage.getItem('local_debate_history_v15');
      let historyList: any[] = [];
      if (rawHistory) {
        try {
          historyList = JSON.parse(rawHistory);
          if (!Array.isArray(historyList)) historyList = [];
        } catch {
          historyList = [];
        }
      }

      const summaryEntry = {
        id: finalSid,
        topic,
        topic_title: topic,
        user_side: stance,
        input_mode: inputMode,
        status: isFinal ? 'COMPLETED' : 'IN_PROGRESS',
        score_total: avgScore,
        turn_count: currentTurns.length,
        created_at: historyList.find((s) => s.id === finalSid)?.created_at || new Date().toISOString(),
        completed_at: isFinal ? new Date().toISOString() : undefined,
      };

      // Strict Upsert: if session already exists, update in-place; else prepend
      const existingIdx = historyList.findIndex((s) => s.id === finalSid);
      if (existingIdx >= 0) {
        historyList[existingIdx] = summaryEntry;
      } else {
        historyList = [summaryEntry, ...historyList];
      }
      localStorage.setItem('local_debate_history_v15', JSON.stringify(historyList));

      // 3. Save full replay details for modal replay
      const replayPayload = {
        success: true,
        session: {
          id: finalSid,
          topic,
          topic_title: topic,
          user_side: stance,
          input_mode: inputMode,
          status: isFinal ? 'COMPLETED' : 'IN_PROGRESS',
          score_total: avgScore,
          score_content: null,
          score_style: null,
          score_strategy: null,
          created_at: summaryEntry.created_at,
        },
        transcripts: currentTurns.flatMap((t, idx) => [
          {
            id: `usr-${idx}-${finalSid}`,
            sessionId: finalSid,
            speaker_type: 'user',
            turn_number: idx * 2 + 1,
            text_content: t.userText,
            audio_path: t.audioUrl || null,
            coach_feedback: {
              score: t.logicScore,
              cre_analysis: t.cre,
              strengths: t.strengths,
              weaknesses: t.weaknesses,
              actionable_suggestions: t.suggestions,
            },
            fallacies_detected: t.fallacies,
            voice_metrics: t.wpm != null ? {
              wpm: t.wpm,
              filler_count: t.fillers || 0,
            } : undefined,
          },
          {
            id: `opp-${idx}-${finalSid}`,
            sessionId: finalSid,
            speaker_type: 'opponent',
            turn_number: idx * 2 + 2,
            text_content: t.opponentText,
          },
        ]),
      };
      localStorage.setItem(`local_debate_replay_${finalSid}`, JSON.stringify(replayPayload));

      // Notify History tab
      window.dispatchEvent(new Event('history-updated'));
    } catch (e) {
      console.warn('[Arena] Local history save error:', e);
    }
  }, [turns, sessionId, user?.id, topic, stance, inputMode]);

  const handleSendArgument = async (textToSend?: string, voiceMetrics?: VoiceMetricsPayload, audioUrl?: string | null) => {
    const content = (textToSend || inputText).trim();
    if (!content || isLoading) return;

    setIsLoading(true);
    const targetUserId = user?.id || '22222222-2222-2222-2222-222222222222';
    const currentTurnNum = turns.length + 1;

    // Determine effective target argument context (Priority: explicit targetArgumentId -> activeArgumentId -> undefined)
    const effectiveArgId = targetArgumentId || activeArgumentId;
    let turnArgContext: TurnArgumentContext | undefined = undefined;

    if (effectiveArgId && currentFinalDraft && currentFinalDraft.arguments) {
      const matched = currentFinalDraft.arguments.find((a) => a.argumentId === effectiveArgId);
      if (matched) {
        turnArgContext = {
          argumentId: matched.argumentId,
          order: matched.order,
          claim: matched.claim,
          reasoning: matched.reasoning,
          evidenceSuggestion: matched.evidenceSuggestion,
        };
      }
    }

    try {
      let currentSid = await ensureSession();
      let resp: MessageResponse;
      try {
        resp = await sendDebateMessage(currentSid, {
          userId: targetUserId,
          content,
          stance,
          topic,
          argumentContext: turnArgContext,
          voiceMetrics: voiceMetrics || undefined,
        });
      } catch (sendErr: any) {
        // If session was completed on backend, not found, or invalid UUID, auto-renew clean session and retry
        const errStr = String(sendErr?.message || sendErr?.error || '');
        if (
          errStr.includes('SESSION_COMPLETED') ||
          errStr.includes('SESSION_NOT_FOUND') ||
          errStr.includes('UUID') ||
          sendErr?.status === 400 ||
          sendErr?.status === 404
        ) {
          console.warn('[Arena] Session invalid or expired on backend, auto-renewing fresh session...');
          stableSessionIdRef.current = '';
          setSessionId('');
          currentSid = await ensureSession();
          resp = await sendDebateMessage(currentSid, {
            userId: targetUserId,
            content,
            stance,
            topic,
            argumentContext: turnArgContext,
            voiceMetrics: voiceMetrics || undefined,
          });
        } else {
          throw sendErr;
        }
      }

      if (resp.success && resp.data) {
        if (effectiveArgId) {
          setDebatedArgumentIds((prev) => new Set([...prev, effectiveArgId]));
        }

        const coach = resp.data.coach_feedback;
        const opponentReply = resp.data.opponent_response?.text || '';
        const opponentAudio = resp.data.opponent_response?.audio_url || resp.data.opponent_response?.audio_path || null;

        // Strict Score Integrity (INVARIANT-SCORE-01, INVARIANT-SCORE-02, INVARIANT-SCORE-04)
        const logicScore = typeof coach?.score === 'number' && Number.isFinite(coach.score) ? coach.score : null;
        const evidenceStar = logicScore !== null ? Math.min(5, Math.max(1, Math.round(logicScore / 2))) : 1;

        const newTurn: TurnData = {
          turnNumber: currentTurnNum,
          userText: content,
          opponentText: opponentReply,
          logicScore,
          cre: {
            claim: coach?.cre_analysis?.claim || '',
            reasoning: coach?.cre_analysis?.reasoning || '',
            evidence: coach?.cre_analysis?.evidence || '',
          },
          evidenceStar,
          fallacies: coach?.fallacies_detected?.filter((f) => !f.startsWith('__voice__') && !f.startsWith('__coach__')) || [],
          strengths: coach?.strengths || [],
          weaknesses: coach?.weaknesses || [],
          suggestions: coach?.actionable_suggestions || [],
          wpm: voiceMetrics?.wpm ?? (resp.data.voice_telemetry?.wpm ?? undefined),
          fillers: voiceMetrics?.fillerCount ?? (resp.data.voice_telemetry?.filler_count ?? undefined),
          durationMs: voiceMetrics?.durationMs,
          audioUrl: audioUrl || null,
          opponentAudioUrl: opponentAudio,
        };

        const updatedTurns = [...turns, newTurn];
        setTurns(updatedTurns);
        setSelectedTurn(updatedTurns.length - 1);
        setInputText('');

        // Save progress to history (atomic upsert, in-progress)
        void saveSessionToHistory(updatedTurns, currentSid, resp.session_completed || false);

        // Auto-play TTS on opponent response ONLY in Voice Mode for hands-free voice sparring
        const isVoiceActive = inputMode === 'voice';
        const shouldAutoPlay = isVoiceActive && autoPlayTts && !!opponentReply;
        const alreadySpoken = lastSpokenTurnRef.current === currentTurnNum;

        console.info(`[Voice AutoPlay] Decision point | inputMode=${inputMode} | autoPlayTts=${autoPlayTts} | opponentReplyLen=${opponentReply?.length ?? 0} | isVoiceActive=${isVoiceActive} | shouldAutoPlay=${shouldAutoPlay} | alreadySpoken=${alreadySpoken} | lastSpokenTurn=${lastSpokenTurnRef.current} | currentTurn=${currentTurnNum} | audioUnlocked=${isAudioUnlocked()} | hasOpponentAudio=${!!opponentAudio}`);

        if (shouldAutoPlay) {
          if (!alreadySpoken) {
            lastSpokenTurnRef.current = currentTurnNum;
            logVoiceDebateDiagnostics({
              voiceModeActive: isVoiceActive,
              opponentResponseReceived: true,
              responseRole: 'opponent',
              responseTextLength: opponentReply.length,
              ttsAvailable: true,
              speechSynthesisState: 'initiating_auto_playback',
              audioUnlocked: isAudioUnlocked(),
              playbackStarted: true,
              playbackError: null,
            });
            console.info(`[Voice AutoPlay] ✅ TRIGGERING playOpponentTts for turn ${currentTurnNum}`);
            // Execute speech immediately on the unlocked audio pipeline
            playOpponentTts(opponentReply, opponentAudio);
          } else {
            console.info(`[Voice AutoPlay] ⏭️ SKIPPED — turn ${currentTurnNum} already spoken`);
          }
        } else {
          console.info(`[Voice AutoPlay] ❌ NOT auto-playing — isVoiceActive=${isVoiceActive} autoPlayTts=${autoPlayTts} hasReply=${!!opponentReply}`);
        }

        if (resp.session_completed) {
          setIsCompleted(true);
          setShowSummaryModal(true);
        }
      }
    } catch (err: any) {
      console.error('[Arena] Error sending argument:', err);
      const errMsg = err?.message || (isVi ? 'Không thể gửi luận điểm. Vui lòng thử lại.' : 'Failed to send argument. Please retry.');
      alert(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserAudioPlayback = (audioUrl: string, turnIdx: number) => {
    if (userAudioPlayingTurn === turnIdx) {
      userAudioRef.current?.pause();
      setUserAudioPlayingTurn(null);
    } else {
      if (userAudioRef.current) {
        userAudioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      userAudioRef.current = audio;
      setUserAudioPlayingTurn(turnIdx);
      audio.onended = () => setUserAudioPlayingTurn(null);
      audio.onpause = () => setUserAudioPlayingTurn(null);
      void audio.play().catch(() => setUserAudioPlayingTurn(null));
    }
  };

  const handleEndSession = async () => {
    if (turns.length === 0) {
      alert(isVi ? 'Bạn cần thực hiện ít nhất 1 lượt tranh biện trước khi kết thúc phiên.' : 'Complete at least 1 turn before ending the session.');
      return;
    }
    setIsLoading(true);
    try {
      await saveSessionToHistory(turns, sessionId, true);
      setIsCompleted(true);
      setShowSummaryModal(true);
      await refreshUser();
      await checkVoiceEntitlement();
    } catch (err) {
      console.error('[Arena] Error completing session:', err);
      setIsCompleted(true);
      setShowSummaryModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewDebate = () => {
    if (userAudioRef.current) userAudioRef.current.pause();
    stopActiveSpeech();
    lastSpokenTurnRef.current = -1;
    stableSessionIdRef.current = '';
    setSessionId('');
    setTurns([]);
    setSelectedTurn(0);
    setSpeechSeconds(0);
    setIsTimerRunning(false);
    setIsCompleted(false);
    setShowSummaryModal(false);
    setInputText('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const currentTurnData = turns[selectedTurn] || (turns.length > 0 ? turns[turns.length - 1] : null);

  // Overall average score calculation for match summary (INVARIANT-SCORE-02)
  const scoredTurns = turns.filter((t) => typeof t.logicScore === 'number' && Number.isFinite(t.logicScore));
  const averageScore = scoredTurns.length > 0
    ? +(scoredTurns.reduce((acc, t) => acc + (t.logicScore as number), 0) / scoredTurns.length).toFixed(1)
    : null;

  const voiceTurns = turns.filter((t) => t.wpm != null);
  const hasVoiceTurns = voiceTurns.length > 0;
  const totalFillersCount = voiceTurns.reduce((acc, t) => acc + (t.fillers || 0), 0);
  const averageWpm = hasVoiceTurns
    ? Math.round(voiceTurns.reduce((acc, t) => acc + (t.wpm || 0), 0) / voiceTurns.length)
    : null;

  return (
    <div className="w-full flex flex-col gap-5 animate-fade-in">
      {/* ── 1. MATCH HEADER & CONTROL DOCK ── */}
      <MatchHeader
        format={format}
        setFormat={setFormat}
        showFormatRules={showFormatRules}
        setShowFormatRules={setShowFormatRules}
        onOpenAudioCheck={() => setShowAudioCheckModal(true)}
        turnsCount={turns.length}
        selectedTurn={selectedTurn}
        setSelectedTurn={handleManualSelectTurn}
        isCompleted={isCompleted}
        onOpenSummary={() => {
          if (turns.length > 0) {
            if (isCompleted) {
              setShowSummaryModal(true);
            } else {
              void handleEndSession();
            }
          } else {
            alert(isVi ? 'Thực hiện ít nhất 1 lượt tranh biện để xem tổng kết.' : 'Complete at least 1 turn to view match summary.');
          }
        }}
        onEndSession={() => void handleEndSession()}
        onStartNewDebate={handleStartNewDebate}
        stance={stance}
        setStance={setStance}
        isLoading={isLoading}
        language={language}
      />

      {/* ── 2. MAIN 2-COLUMN ARENA GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: LIVE SPARRING STAGE (7 Cols) ── */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Card 1: Motion Card with Glassmorphic Focus */}
          <ArenaSetup
            topic={topic}
            format={format}
            stance={stance}
            onOpenMotionModal={() => setShowMotionModal(true)}
            onOpenAssistant={onOpenAssistant ? (t, s) => {
              stopActiveSpeech();
              onOpenAssistant(t, s);
            } : undefined}
            isTimerRunning={isTimerRunning}
            setIsTimerRunning={setIsTimerRunning}
            speechSeconds={speechSeconds}
            isProtectedTime={isProtectedTime}
            poiStatus={poiStatus}
            poiSecondsLeft={poiSecondsLeft}
            onRequestPoi={() => {
              setPoiStatus('ACCEPTED');
              setPoiSecondsLeft(15);
            }}
            language={language}
          />

          {/* Sparring Feed: User Argument & AI Opponent Response */}
          <SparringFeed
            currentTurnData={currentTurnData}
            selectedTurn={selectedTurn}
            stance={stance}
            inputMode={inputMode}
            autoPlayTts={autoPlayTts}
            setAutoPlayTts={setAutoPlayTts}
            isTtsPlaying={isTtsPlaying}
            userAudioPlayingTurn={userAudioPlayingTurn}
            toggleUserAudioPlayback={toggleUserAudioPlayback}
            handleTtsPlayback={handleTtsPlayback}
            isLoading={isLoading}
            language={language}
          />

          {/* Argument Map HUD (Contract Closure v1.1 — Cognitive & Navigation Scaffold) */}
          <ArgumentMapHUD
            currentFinalDraft={currentFinalDraft}
            debatedArgumentIds={debatedArgumentIds}
            activeArgumentId={activeArgumentId}
            setActiveArgumentId={setActiveArgumentId}
            targetArgumentId={targetArgumentId}
            setTargetArgumentId={setTargetArgumentId}
            onOpenAssistant={onOpenAssistant}
            topic={topic}
            stance={stance}
            onInsertArgumentText={(toInsert) => {
              setInputText((prev) => (prev.trim() ? `${prev.trim()}\n\n${toInsert}` : toInsert));
              setInputMode('text');
            }}
            language={language}
          />

          {/* Card 4: Action Console & Next Turn Input / Recorder */}
          <DebateInput
            inputMode={inputMode}
            setInputMode={setInputMode}
            setAutoPlayTts={setAutoPlayTts}
            turns={turns}
            selectedTurn={selectedTurn}
            setSelectedTurn={handleManualSelectTurn}
            inputText={inputText}
            setInputText={setInputText}
            onSendArgument={handleSendArgument}
            isLoading={isLoading}
            isCheckingEntitlement={isCheckingEntitlement}
            voiceEntitlement={voiceEntitlement}
            onCheckVoiceEntitlement={checkVoiceEntitlement}
            onRefreshUser={refreshUser}
            onOpenPricingModal={() => setIsPricingModalOpen(true)}
            isCompleted={isCompleted}
            onOpenSummary={() => setShowSummaryModal(true)}
            onStartNewDebate={handleStartNewDebate}
            onNavigateToHistory={onNavigateToHistory}
            language={language}
          />

          {/* Prominent End Debate Session Action Button at bottom of Arena */}
          {turns.length > 0 && !isCompleted && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 transition-all shadow-sm">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="text-lg">🏁</span>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {isVi ? 'Hoàn thành phiên tranh biện' : 'Finish Debate Session'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isVi ? `Đã thực hiện ${turns.length} lượt. Bấm để kết thúc và lưu điểm C-R-E.` : `${turns.length} turns played. End match to view final scores.`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleEndSession()}
                disabled={isLoading}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                aria-label={isVi ? 'Kết thúc phiên tranh luận' : 'End Debate Session'}
              >
                <span>🏁 {isVi ? 'Kết Thúc Phiên Tranh Luận' : 'End Debate Session'}</span>
              </button>
            </div>
          )}

          {/* Anchor for Smart Auto-Scroll */}
          <div ref={feedEndRef} className="h-0 pointer-events-none" />
        </section>

        {/* ── RIGHT COLUMN: LOGIC COACH HUD (5 Cols, Desktop Only) ── */}
        <section className="hidden lg:flex lg:col-span-5 flex-col gap-4">
          <CoachPanel
            currentTurnData={currentTurnData}
            language={language}
          />
        </section>
      </div>

      {/* ── FLOATING "↓ CÓ PHẢN HỒI MỚI" INDICATOR (Mobile Only) ── */}
      {showNewResponseIndicator && (
        <div className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-30 lg:hidden animate-fade-in-up">
          <button
            type="button"
            onClick={() => {
              feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
              setShowNewResponseIndicator(false);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-2xl shadow-indigo-600/50 border border-indigo-300/40 flex items-center gap-2 active:scale-95 transition cursor-pointer"
            aria-label={isVi ? 'Cuộn xuống phản hồi mới của đối thủ AI' : 'Scroll down to new response'}
          >
            <span className="text-sm">↓</span>
            <span>{isVi ? 'Có phản hồi mới' : 'New Response'}</span>
          </button>
        </div>
      )}

      {/* ── MOBILE FLOATING COACH TRIGGER (< lg) ── */}
      <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3.5 z-30 lg:hidden animate-fade-in">
        <button
          type="button"
          onClick={() => setIsCoachSheetOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-500/30 text-slate-800 dark:text-slate-100 shadow-xl shadow-purple-500/20 active:scale-95 transition cursor-pointer min-h-[44px]"
          aria-label={isVi ? 'Mở Logic Coach chẩn đoán tư duy' : 'Open Logic Coach diagnostics'}
        >
          <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
              <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
              <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
              <path d="M12 18v4"/>
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Logic Coach
            </span>
            <span className="text-xs font-black font-mono flex items-center gap-1">
              {currentTurnData && currentTurnData.logicScore !== null ? (
                <>
                  <span className={currentTurnData.logicScore >= 8 ? 'text-emerald-600 dark:text-emerald-400' : currentTurnData.logicScore >= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                    {currentTurnData.logicScore.toFixed(1)}/10
                  </span>
                  <span className="text-[9px] font-normal text-slate-400">🔍</span>
                </>
              ) : (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {isVi ? 'Xem phân tích' : 'Diagnostics'}
                </span>
              )}
            </span>
          </div>
        </button>
      </div>

      {/* ── MOBILE COACH BOTTOM SHEET ── */}
      <CoachBottomSheet
        isOpen={isCoachSheetOpen}
        onClose={() => setIsCoachSheetOpen(false)}
        currentTurnData={currentTurnData}
        language={language}
      />

      {/* ── 3. MATCH SUMMARY / END SESSION MODAL ── */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-6 md:p-8 flex flex-col gap-5 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-lg shadow-md shadow-indigo-600/30">
                  🏆
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                    Tổng Kết Phiên Tranh Biện
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Phiên làm việc đã được lưu thành công vào Lịch sử.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Score & Key Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-center">
                <div className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">{isVi ? 'Điểm C-R-E Trung Bình' : 'Average C-R-E Score'}</div>
                <div className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-300 mt-1">
                  {averageScore !== null ? (
                    <>
                      {averageScore.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 10</span>
                    </>
                  ) : (
                    <span className="text-sm font-normal text-slate-400">{isVi ? 'N/A' : 'N/A'}</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/30 text-center">
                <div className="text-[10px] font-bold uppercase text-cyan-600 dark:text-cyan-400">{isVi ? 'Tổng Số Lượt' : 'Total Turns'}</div>
                <div className="text-2xl font-black font-mono text-cyan-700 dark:text-cyan-300 mt-1">
                  {turns.length} <span className="text-xs font-normal text-slate-500">{isVi ? 'lượt' : 'turns'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-center">
                <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{isVi ? 'Tốc Độ & Từ Đệm' : 'Pace & Fillers'}</div>
                <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                  {hasVoiceTurns ? (
                    <>
                      {averageWpm} WPM <span className="text-xs font-normal text-slate-500">| {totalFillersCount} {isVi ? 'đệm' : 'fillers'}</span>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isVi ? 'Soạn văn bản (N/A)' : 'Text mode (N/A)'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Topic Review */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] mb-1">{isVi ? 'Kiến nghị tranh biện:' : 'Debate Motion:'}</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">{topic}</div>
              <div className="mt-1 text-slate-500">
                {isVi ? 'Lập trường: ' : 'Stance: '}<strong className="text-slate-700 dark:text-slate-300">{stance === 'AFFIRMATIVE' ? (isVi ? 'Ủng Hộ (Government)' : 'Affirmative (Gov)') : (isVi ? 'Phản Đối (Opposition)' : 'Negative (Opp)')}</strong> • {isVi ? 'Thể thức: ' : 'Format: '}<strong>{format}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await saveSessionToHistory(turns, sessionId, true);
                  handleStartNewDebate();
                  if (onNavigateToHistory) {
                    onNavigateToHistory();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <span>📜 {isVi ? 'Xem Trong Lịch Sử & Replay' : 'View in History & Replay'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await saveSessionToHistory(turns, sessionId, true);
                    handleStartNewDebate();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer"
                >
                  🔥 {isVi ? 'Bắt Đầu Phiên Mới' : 'Start New Match'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await saveSessionToHistory(turns, sessionId, true);
                    setShowSummaryModal(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold cursor-pointer"
                >
                  {isVi ? 'Đóng & Xem Lại' : 'Close & Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-match Audio Device Check Modal */}
      <AudioCheckModal
        isOpen={showAudioCheckModal}
        onClose={() => setShowAudioCheckModal(false)}
      />

      {/* Motion Picker & Library Modal */}
      {showMotionModal && (
        <MotionPickerModal
          isOpen={showMotionModal}
          onClose={() => setShowMotionModal(false)}
          currentTopic={topic}
          onSelectTopic={handleSelectMotion}
          isVi={isVi}
        />
      )}

      {/* Pricing & Top-Up Modal */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => {
          setIsPricingModalOpen(false);
          void checkVoiceEntitlement();
          void refreshUser();
        }}
        language={language}
      />
    </div>
  );
};

// ─── MOTION PICKER & CURATED LIBRARY MODAL COMPONENT ─────────────────────────

interface MotionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTopic: string;
  onSelectTopic: (topic: string, format?: DebateFormat) => void;
  isVi?: boolean;
}

export function MotionPickerModal({
  isOpen,
  onClose,
  currentTopic,
  onSelectTopic,
  isVi = true,
}: MotionPickerModalProps) {
  const [activeTab, setActiveTab] = useState<'custom' | 'library'>('library');
  const [customInput, setCustomInput] = useState<string>(currentTopic || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: isVi ? 'Tất cả chủ đề' : 'All Categories' },
    { id: 'tech', label: isVi ? '🤖 Công nghệ & AI' : '🤖 Technology & AI' },
    { id: 'education', label: isVi ? '🎓 Giáo dục & Học đường' : '🎓 Education & Campus' },
    { id: 'environment', label: isVi ? '🌍 Môi trường & Bền vững' : '🌍 Environment & Climate' },
    { id: 'society', label: isVi ? '⚖️ Xã hội & Đạo đức' : '⚖️ Society & Ethics' },
    { id: 'economy', label: isVi ? '💰 Kinh tế & Toàn cầu' : '💰 Economy & Global' },
  ];

  const prefixHelpers = [
    { label: isVi ? 'THBT (Nhà này tin rằng...)' : 'THBT (This House Believes That...)', prefix: isVi ? 'Nhà này tin rằng ' : 'This House Believes That ' },
    { label: isVi ? 'THW (Nhà này sẽ...)' : 'THW (This House Would...)', prefix: isVi ? 'Nhà này sẽ ' : 'This House Would ' },
    { label: isVi ? 'THAs (Với tư cách là...)' : 'THAs (This House As...)', prefix: isVi ? 'Nhà này với tư cách là ' : 'This House As ' },
    { label: isVi ? 'THO (Nhà này phản đối...)' : 'THO (This House Opposes...)', prefix: isVi ? 'Nhà này phản đối ' : 'This House Opposes ' },
  ];

  const filteredTopics = CURATED_DEBATE_TOPICS.filter((t) => {
    const matchCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchQuery =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.context && t.context.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const handleApplyCustom = () => {
    if (customInput.trim()) {
      onSelectTopic(customInput.trim());
    }
  };

  const handleInsertPrefix = (prefix: string) => {
    if (customInput.startsWith(prefix)) return;
    setCustomInput((prev) => `${prefix}${prev}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-elevated w-full max-w-3xl max-h-[90vh] rounded-2xl border border-indigo-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center font-bold">
              🎯
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isVi ? 'Bộ Chọn Kiến Nghị Tranh Biện (Motion Hub)' : 'Debate Motion Hub'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVi ? 'Nhập chủ đề tự do hoặc chọn từ ngân hàng đề chuẩn thi đấu WSDC / BP / AP' : 'Enter a custom motion or choose from official tournament motions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Icons.X />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-3 gap-2 bg-slate-50/50 dark:bg-slate-900/30 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'library'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{isVi ? '📚 Thư Viện Kiến Nghị Chọn Lọc' : '📚 Curated Motions'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {CURATED_DEBATE_TOPICS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'custom'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{isVi ? '✏️ Nhập Kiến Nghị Tự Do' : '✏️ Custom Motion'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'custom' ? (
            <div className="flex flex-col gap-4">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <strong>💡 {isVi ? 'Hướng dẫn định dạng:' : 'Motion Format Guidance:'}</strong> {isVi ? 'Trong tranh biện học thuật, kiến nghị (Motion) thường là một câu khẳng định chính sách hoặc giá trị rõ ràng để hai phe đối đầu trực tiếp.' : 'In competitive debate, a motion is a clear proposition of policy or value for Affirmative and Negative to clash.'}
              </div>

              {/* Prefix Helper Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isVi ? 'Chèn mẫu câu mở đầu:' : 'Insert prefix:'}</span>
                {prefixHelpers.map((ph) => (
                  <button
                    key={ph.label}
                    type="button"
                    onClick={() => handleInsertPrefix(ph.prefix)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                  >
                    + {ph.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {isVi ? 'Nội dung kiến nghị:' : 'Motion Title / Statement:'}
                </label>
                <textarea
                  rows={4}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder={isVi ? 'Ví dụ: Nhà này tin rằng các trường đại học nên miễn học phí cho sinh viên ngành sư phạm...' : 'e.g. This House Believes That AI will replace traditional classroom teachers in the near future...'}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {isVi ? 'Hủy bỏ' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  disabled={!customInput.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold shimmer-btn text-white disabled:opacity-50 transition cursor-pointer shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Icons.Check />
                  <span>{isVi ? 'Áp Dụng Kiến Nghị Này' : 'Apply Motion'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Search & Categories */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Icons.Search />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isVi ? 'Tìm kiếm kiến nghị...' : 'Search motions...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Topic List Cards */}
              <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredTopics.length > 0 ? (
                  filteredTopics.map((topicItem) => (
                    <div
                      key={topicItem.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-indigo-400/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                            {topicItem.categoryLabel}
                          </span>
                          {topicItem.suggestedFormat && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {isVi ? `Thể thức: ${topicItem.suggestedFormat}` : `Format: ${topicItem.suggestedFormat}`}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                          {topicItem.title}
                        </h4>
                        {topicItem.context && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {topicItem.context}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectTopic(topicItem.title, topicItem.suggestedFormat)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 shrink-0 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Icons.Check />
                        <span>{isVi ? 'Chọn Đề Này' : 'Select'}</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    {isVi ? 'Không tìm thấy kiến nghị phù hợp với từ khóa tìm kiếm.' : 'No debate motions found matching your search.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DebateArena;
