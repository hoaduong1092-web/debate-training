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
import { VoiceRecorder } from './VoiceRecorder';
import { AudioCheckModal } from './AudioCheckModal';
import { PricingModal } from './PricingModal';
import { speakOpponentResponse, stopSpeaking } from '../utils/tts';
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
      void checkVoiceEntitlement();
    }
  }, [inputMode, checkVoiceEntitlement]);

  // ─── Argument Map & Structured Draft Tracking (Contract Closure v1.1) ─────
  const [currentFinalDraft, setCurrentFinalDraft] = useState<FinalDebateDraft | null>(finalDraft || null);
  const [activeArgumentId, setActiveArgumentId] = useState<string | null>(null);
  const [targetArgumentId, setTargetArgumentId] = useState<string | null>(null);
  const [debatedArgumentIds, setDebatedArgumentIds] = useState<Set<string>>(new Set());

  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [autoPlayTts, setAutoPlayTts] = useState<boolean>(false);

  const [turns, setTurns] = useState<TurnData[]>([]);
  const [selectedTurn, setSelectedTurn] = useState<number>(0);

  const [speechSeconds, setSpeechSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [poiStatus, setPoiStatus] = useState<'INACTIVE' | 'REQUESTED' | 'ACCEPTED' | 'REJECTED'>('INACTIVE');
  const [poiSecondsLeft, setPoiSecondsLeft] = useState(15);

  const [isCompleted, setIsCompleted] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showAudioCheckModal, setShowAudioCheckModal] = useState(false);

  // Stable session reference to prevent duplicate history records
  const stableSessionIdRef = useRef<string>(sessionId || `session-${Date.now()}`);

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
          if (parsed.sessionId) {
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
      stopSpeaking();
      if (userAudioRef.current) userAudioRef.current.pause();
    };
  }, []);

  // Cut off speech and user audio playback when switching turns in Arena
  useEffect(() => {
    stopSpeaking();
    setIsTtsPlaying(false);
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      setUserAudioPlayingTurn(null);
    }
  }, [selectedTurn]);

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
    if (activeId && !activeId.startsWith('session-')) {
      stableSessionIdRef.current = activeId;
      if (sessionId !== activeId) setSessionId(activeId);
      return activeId;
    }
    const targetUserId = user?.id || '22222222-2222-2222-2222-222222222222';
    try {
      const res = await createDebateSession({
        userId: targetUserId,
        topic,
        character_id: 'sonTung',
        user_side: stance,
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
    } catch {
      const fallbackId = stableSessionIdRef.current || `session-${Date.now()}`;
      setSessionId(fallbackId);
      stableSessionIdRef.current = fallbackId;
      return fallbackId;
    }
    return stableSessionIdRef.current;
  }, [sessionId, topic, stance, user?.id]);

  // Guaranteed Opponent Speech Playback (Auto-play & Explicit play)
  const playOpponentTts = useCallback((text: string, audioUrl?: string | null) => {
    stopSpeaking();
    setIsTtsPlaying(true);
    const res = speakOpponentResponse(text, {
      lang: 'vi-VN',
      gender: 'male',
      voiceId: 'sonTung',
      rate: 1.0,
      pitch: 1.0,
      audioUrl: audioUrl || undefined,
      onEnd: () => setIsTtsPlaying(false),
    });
    if (res !== 'ok') {
      setIsTtsPlaying(false);
    }
  }, []);

  // Manual Toggle button helper (Play / Pause)
  const handleTtsPlayback = useCallback((text: string, audioUrl?: string | null) => {
    if (isTtsPlaying) {
      stopSpeaking();
      setIsTtsPlaying(false);
    } else {
      playOpponentTts(text, audioUrl);
    }
  }, [isTtsPlaying, playOpponentTts]);

  // --- SAVE SESSION TO HISTORY (STRICT UPSERT TO PREVENT DUPLICATES) ---
  const saveSessionToHistory = useCallback(async (currentTurns = turns, sid = sessionId, isFinal = false) => {
    if (currentTurns.length === 0) return;
    const targetUserId = user?.id || '22222222-2222-2222-2222-222222222222';
    const finalSid = sid || sessionId || stableSessionIdRef.current;

    // 1. Only call completeDebateSession on backend when session is genuinely completed
    if (isFinal && finalSid && !finalSid.startsWith('session-')) {
      try {
        await completeDebateSession(finalSid, targetUserId);
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
        // If session was completed on backend or invalid, auto-renew clean session and retry
        const errStr = String(sendErr?.message || sendErr?.error || '');
        if (errStr.includes('SESSION_COMPLETED') || sendErr?.status === 400) {
          console.warn('[Arena] Previous session completed on backend, auto-renewing fresh session...');
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
        if (inputMode === 'voice' && autoPlayTts && opponentReply) {
          setTimeout(() => {
            playOpponentTts(opponentReply, opponentAudio);
          }, 150);
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
      alert('Bạn cần thực hiện ít nhất 1 lượt tranh biện trước khi kết thúc phiên.');
      return;
    }
    setIsLoading(true);
    try {
      await saveSessionToHistory(turns, sessionId, true);
      setIsCompleted(true);
      setShowSummaryModal(true);
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
    stopSpeaking();
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

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Color calculation for Neural Score Ring (INVARIANT-SCORE-02, INVARIANT-SCORE-04)
  const getScoreColor = (score: number | null) => {
    if (score === null) return { stroke: '#94a3b8', text: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/30' };
    if (score >= 8.0) return { stroke: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' };
    if (score >= 6.0) return { stroke: '#f59e0b', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30' };
    return { stroke: '#f43f5e', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/30' };
  };

  const scoreTheme = currentTurnData ? getScoreColor(currentTurnData.logicScore) : getScoreColor(null);

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
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 transition-all">
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
              onClick={() => setShowFormatRules(!showFormatRules)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              title={isVi ? 'Xem thông tin luật thi đấu thể thức này' : 'View tournament format rules'}
            >
              ℹ️ {showFormatRules ? (isVi ? 'Ẩn luật thi đấu' : 'Hide rules') : (isVi ? 'Xem luật thi đấu' : 'View rules')}
            </button>
          </div>

          {/* Pre-match Audio Device Check Button */}
          <button
            type="button"
            onClick={() => setShowAudioCheckModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title={isVi ? 'Kiểm tra Micro thu âm và Loa phát trước khi đấu' : 'Test microphone and speaker before debate'}
          >
            <Icons.Mic />
            <span>🎤 {isVi ? 'Kiểm tra Âm thanh' : 'Audio Check'}</span>
          </button>
        </div>

        {/* Center: Interactive Match Stepper */}
        <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto py-1 max-w-full">
          {Array.from({ length: Math.max(3, turns.length) }, (_, i) => {
            const turnNum = i + 1;
            const isCompletedTurn = i < turns.length;
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
            className={`px-3 py-1 rounded-lg transition-all font-semibold text-xs flex items-center gap-1 ${
              isCompleted
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold cursor-pointer'
                : turns.length > 0
                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 cursor-pointer'
                : 'bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <Icons.Flag />
            <span>{isVi ? 'Tổng Kết' : 'Match Summary'}</span>
          </button>
        </div>

        {/* Right: Actions & Stance Toggle */}
        <div className="flex items-center gap-2">
          {/* End Session Button */}
          {turns.length > 0 && (
            <button
              type="button"
              onClick={() => void handleEndSession()}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
              title={isVi ? 'Kết thúc và lưu phiên làm việc vào Lịch sử' : 'End session and save to History'}
            >
              <Icons.Flag />
              <span>{isVi ? 'Kết Thúc Phiên' : 'End Match'}</span>
            </button>
          )}

          {/* New Debate Button */}
          {turns.length > 0 && (
            <button
              type="button"
              onClick={handleStartNewDebate}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition active:scale-95 cursor-pointer"
              title={isVi ? 'Bắt đầu phiên tranh biện mới' : 'Start new debate'}
              aria-label={isVi ? 'Tạo phiên mới' : 'New debate'}
            >
              <Icons.RotateCcw />
            </button>
          )}

          {/* Stance Toggle */}
          <button
            type="button"
            onClick={() => setStance((s) => (s === 'AFFIRMATIVE' ? 'NEGATIVE' : 'AFFIRMATIVE'))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
              stance === 'AFFIRMATIVE' ? 'neon-pill-affirmative' : 'neon-pill-negative'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${stance === 'AFFIRMATIVE' ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-rose-500 dark:bg-rose-400 animate-pulse'}`} />
            <span>{stance === 'AFFIRMATIVE' ? (isVi ? 'Ủng Hộ (Government)' : 'Affirmative (Gov)') : (isVi ? 'Phản Đối (Opposition)' : 'Negative (Opp)')}</span>
          </button>
        </div>

        {/* Toggleable Format Rules Info Card (Glassmorphism) */}
        {showFormatRules && FORMAT_RULES[format] && (
          <div className="w-full mt-3 p-4 glass-panel bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-sm text-slate-700 dark:text-zinc-300 animate-fade-in-down transition-all">
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
            <ul className="space-y-2">
              <li><strong>👥 {isVi ? 'Cấu trúc:' : 'Teams:'}</strong> {FORMAT_RULES[format].teams}</li>
              <li><strong>⏱️ {isVi ? 'Thời gian:' : 'Timing:'}</strong> {FORMAT_RULES[format].time}</li>
              <li><strong>🎯 {isVi ? 'Đặc trưng:' : 'Key features:'}</strong> {FORMAT_RULES[format].features}</li>
              <li><strong>🌟 {isVi ? 'Phù hợp:' : 'Best for:'}</strong> {FORMAT_RULES[format].audience}</li>
            </ul>
          </div>
        )}
      </div>

      {/* ── 2. MAIN 2-COLUMN ARENA GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── LEFT COLUMN: LIVE SPARRING STAGE (7 Cols) ── */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Card 1: Motion Card with Glassmorphic Focus */}
          <div className="glass-panel-elevated rounded-2xl p-5 relative overflow-hidden transition-all">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                <Icons.Sparkles />
                <span>{isVi ? `Kiến Nghị Tranh Biện (${format})` : `DEBATE MOTION (${format})`}</span>
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Nút Đổi Kiến Nghị / Mở Motion Hub */}
                <button
                  type="button"
                  onClick={() => setShowMotionModal(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  title={isVi ? 'Đổi chủ đề tranh biện hoặc chọn từ thư viện kiến nghị WSDC/BP/AP' : 'Change topic or pick from WSDC/BP/AP curated library'}
                >
                  <Icons.Edit />
                  <span>{isVi ? '🎯 Đổi Kiến Nghị' : '🎯 Change Motion'}</span>
                </button>

                {/* Nút Mở Trợ Lý AI Phân Tích */}
                {onOpenAssistant && (
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      onOpenAssistant(topic, stance);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/25 border border-violet-200 dark:border-violet-500/30 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title={isVi ? 'Mở Trợ lý AI để phân tích đa chiều và gợi ý dàn ý cho kiến nghị này' : 'Open AI Assistant for motion analysis and speech drafting'}
                  >
                    <Icons.Bot />
                    <span>{isVi ? '🤖 Trợ Lý Phân Tích' : '🤖 AI Assistant'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsTimerRunning((r) => !r)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isTimerRunning ? <Icons.Pause /> : <Icons.Play />}
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
                    <Icons.Lock />
                    <span>{isVi ? 'Thời gian an toàn (Không POI)' : 'Protected Time (No POI)'}</span>
                  </span>
                ) : (
                  <span className="neon-pill-affirmative px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 text-[11px]">
                    <Icons.Bell />
                    <span>{isVi ? 'Mở sàn chất vấn (POI Allowed)' : 'Active Floor (POI Available)'}</span>
                  </span>
                )}
              </div>

              {!isProtectedTime && poiStatus !== 'ACCEPTED' && (
                <button
                  type="button"
                  onClick={() => {
                    setPoiStatus('ACCEPTED');
                    setPoiSecondsLeft(15);
                  }}
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

          {/* Card 2: User's Argument for Selected Turn (If at least 1 turn exists) */}
          {currentTurnData && (
            <div className="glass-panel-elevated rounded-2xl p-5 border border-indigo-200 dark:border-indigo-500/30 shadow-md relative transition-all">
              <div className="flex items-start gap-4">
                {/* User Avatar Badge */}
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
                  <Icons.User />
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
                        >
                          {userAudioPlayingTurn === selectedTurn ? <Icons.Pause /> : <Icons.Play />}
                          <span>{userAudioPlayingTurn === selectedTurn ? (isVi ? 'Dừng nghe' : 'Pause') : (isVi ? 'Nghe lại' : 'Replay')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
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
                  <Icons.Bot />
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
                      >
                        {isTtsPlaying ? <Icons.VolumeX /> : <Icons.Volume />}
                        <span>{isTtsPlaying ? (isVi ? 'Dừng đọc' : 'Stop') : (isVi ? 'Phát âm' : 'Listen')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-800 dark:text-slate-300 leading-relaxed relative">
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

          {/* Argument Map HUD (Contract Closure v1.1 — Cognitive & Navigation Scaffold) */}
          {currentFinalDraft && currentFinalDraft.arguments && currentFinalDraft.arguments.length > 0 && (
            <div className="glass-panel-elevated rounded-2xl p-4 md:p-5 border border-indigo-500/20 shadow-lg flex flex-col gap-3.5 transition-all">
              {/* HUD Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Icons.Target />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{isVi ? 'Bản Đồ Luận Điểm (Argument Map)' : 'Argument Map HUD'}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        {currentFinalDraft.arguments.length} {isVi ? 'luận điểm' : 'args'}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isVi ? 'Định vị tư duy • Chọn luận điểm để xem chi tiết hoặc nạp vào lượt phát biểu' : 'Cognitive scaffolding • Select an argument to inspect or load into turn'}
                    </p>
                  </div>
                </div>

                {onOpenAssistant && (
                  <button
                    type="button"
                    onClick={() => onOpenAssistant(topic, stance)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>✏️ {isVi ? 'Chỉnh sửa bản thảo' : 'Edit draft'}</span>
                  </button>
                )}
              </div>

              {/* Argument Navigation Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {currentFinalDraft.arguments.map((arg) => {
                  const isDebated = debatedArgumentIds.has(arg.argumentId);
                  const isFocused = arg.argumentId === activeArgumentId;
                  const isTarget = arg.argumentId === targetArgumentId;

                  return (
                    <button
                      key={arg.argumentId}
                      type="button"
                      onClick={() => setActiveArgumentId(arg.argumentId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
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
              {(() => {
                const focused = currentFinalDraft.arguments.find((a) => a.argumentId === activeArgumentId) || currentFinalDraft.arguments[0];
                if (!focused) return null;
                const isTarget = focused.argumentId === targetArgumentId;
                const isDebated = debatedArgumentIds.has(focused.argumentId);

                return (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 flex flex-col gap-2.5 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px]">
                          {isVi ? `LUẬN ĐIỂM ${focused.order}` : `ARGUMENT ${focused.order}`}
                        </span>
                        {isDebated && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px]">
                            • {isVi ? 'Đã tranh biện ở lượt trước' : 'Debated in prior turn'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const toInsert = `${focused.claim}. ${focused.reasoning ? `Bởi vì ${focused.reasoning}. ` : ''}${focused.evidenceSuggestion ? `Dẫn chứng: ${focused.evidenceSuggestion}` : ''}`.trim();
                            setInputText((prev) => (prev.trim() ? `${prev.trim()}\n\n${toInsert}` : toInsert));
                            setInputMode('text');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-bold transition flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <span>⚡ {isVi ? 'Nạp Vào Ô Nhập' : 'Insert into Editor'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetArgumentId((prev) => (prev === focused.argumentId ? null : focused.argumentId))}
                          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer text-[11px] border ${
                            isTarget
                              ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                          }`}
                        >
                          <span>{isTarget ? (isVi ? '🎯 Đang là Mục Tiêu' : '🎯 Target Bound') : (isVi ? '📌 Gán Làm Mục Tiêu' : '📌 Bind Target')}</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-slate-800 dark:text-slate-200">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        <strong>{isVi ? 'Luận điểm (Claim): ' : 'Claim: '}</strong>
                        {focused.claim}
                      </p>
                      {focused.reasoning && (
                        <p className="text-slate-600 dark:text-slate-400">
                          <strong>{isVi ? 'Lý lẽ (Reasoning): ' : 'Reasoning: '}</strong>
                          {focused.reasoning}
                        </p>
                      )}
                      {focused.evidenceSuggestion && (
                        <p className="text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                          <strong>📚 {isVi ? 'Dẫn chứng gợi ý: ' : 'Evidence: '}</strong>
                          {focused.evidenceSuggestion}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Card 4: Action Console & Next Turn Input / Recorder */}
          <div className="glass-panel-elevated rounded-2xl p-5 transition-all">
            {/* Mode Selector & Turn Navigation Header */}
            <div className="flex items-center justify-between mb-3.5 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('text');
                    setAutoPlayTts(false);
                    stopSpeaking();
                    try { localStorage.setItem('arena_autoplay_tts', 'false'); } catch {}
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-semibold cursor-pointer ${
                    inputMode === 'text'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Icons.Text />
                  <span>{isVi ? 'Soạn Văn Bản' : 'Text Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('voice');
                    setAutoPlayTts(true);
                    try { localStorage.setItem('arena_autoplay_tts', 'true'); } catch {}
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition font-semibold cursor-pointer ${
                    inputMode === 'voice'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Icons.Mic />
                  <span>{isVi ? 'Phát Biểu Giọng Nói' : 'Voice Recording'}</span>
                </button>
              </div>

              {/* Turn selector buttons */}
              {turns.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500 text-[11px] mr-0.5">{isVi ? 'Xem Lượt:' : 'View Turn:'}</span>
                  {turns.map((t, idx) => (
                    <button
                      key={t.turnNumber}
                      type="button"
                      onClick={() => setSelectedTurn(idx)}
                      className={`w-7 h-7 text-xs font-bold rounded-lg transition cursor-pointer ${
                        selectedTurn === idx
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {t.turnNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input / Recorder Area */}
            {inputMode === 'text' ? (
              <div className="flex flex-col gap-3">
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isVi ? `Nhập luận cứ của bạn cho Lượt ${turns.length + 1} theo cấu trúc C-R-E (Claim, Reasoning, Evidence)...` : `State your argument for Turn ${turns.length + 1} following C-R-E (Claim, Reasoning, Evidence)...`}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none transition"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void handleSendArgument();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{isVi ? 'Mẹo: Nhấn Ctrl + Enter để gửi' : 'Tip: Press Ctrl + Enter to submit'}</span>
                  <button
                    type="button"
                    onClick={() => handleSendArgument()}
                    disabled={isLoading || !inputText.trim()}
                    className="px-5 py-2.5 shimmer-btn disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <span>{isLoading ? (isVi ? 'Đang phân tích...' : 'Analyzing...') : (isVi ? `Gửi Luận Điểm (Lượt ${turns.length + 1})` : `Submit Argument (Turn ${turns.length + 1})`)}</span>
                    <Icons.Send />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-1 space-y-3">
                {isCheckingEntitlement ? (
                  <div className="py-8 text-center text-xs text-slate-500 animate-pulse flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    <span>{isVi ? 'Đang kiểm tra quyền hạn phát biểu Voice AI...' : 'Verifying Voice AI entitlement...'}</span>
                  </div>
                ) : voiceEntitlement && !voiceEntitlement.allowed ? (
                  /* STATE G: QUOTA EXCEEDED */
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                    <div className="text-2xl">⚠️</div>
                    <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {isVi ? 'Hạn Ngạch Giọng Nói Đã Hết (Quota Exceeded)' : 'Voice AI Quota Exceeded'}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                      {isVi
                        ? 'Bạn đã sử dụng hết số phút Voice AI khả dụng trong chu kỳ hiện tại. Hãy nạp thêm gói Voice Boost hoặc nâng cấp để tiếp tục phát biểu trực tiếp.'
                        : 'Your available voice minutes are fully exhausted. Top up with Voice Boost or upgrade your tier to continue.'}
                    </p>
                    <div className="flex justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsPricingModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                      >
                        ⚡ {isVi ? 'Nạp Voice Boost (15k / 49k)' : 'Top Up Voice Boost'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('text')}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {isVi ? 'Chuyển Sang Soạn Văn Bản' : 'Switch to Text Mode'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STATE B-F: ENTITLED */
                  <>
                    {voiceEntitlement && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          {voiceEntitlement.source === 'VIP' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              👑 VIP Pass: Không trừ quota
                            </span>
                          ) : (
                            <span className="font-semibold">
                              💎 {isVi ? 'Khả dụng:' : 'Available:'} {voiceEntitlement.availableMinutes ?? 0} {isVi ? 'phút' : 'mins'}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {isVi ? 'Tối đa 15 phút / phiên' : 'Max 15 min / session'}
                        </span>
                      </div>
                    )}

                    <VoiceRecorder
                      key={`voice-turn-${turns.length + 1}`}
                      language={language}
                      currentTurn={turns.length + 1}
                      onTranscriptReady={(text) => setInputText(text)}
                      onRecordingComplete={(transcript, metrics) => {
                        void handleSendArgument(
                          transcript,
                          {
                            wpm: metrics.wpm,
                            fillerCount: metrics.fillerCount,
                            durationMs: metrics.durationMs,
                            tier: metrics.tier ?? undefined,
                            stt_source: metrics.stt_source ?? undefined,
                          },
                          metrics.audioUrl,
                        );
                        void checkVoiceEntitlement();
                        void refreshUser();
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── RIGHT COLUMN: LOGIC COACH HUD (5 Cols) ── */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="glass-panel-elevated rounded-2xl p-5 transition-all">
            {/* HUD Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-500/30 flex items-center gap-1.5 shadow-sm">
                <Icons.Brain />
                <span>Logic Coach HUD {currentTurnData ? `(${isVi ? 'Lượt' : 'Turn'} ${currentTurnData.turnNumber})` : ''}</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{isVi ? 'Chuẩn Sư phạm v16' : 'Pedagogical Standard v16'}</span>
            </div>

            {currentTurnData ? (
              <div className="space-y-3.5">
                {/* 1. Neural Score Radial Banner */}
                <div className={`p-4 rounded-xl border ${scoreTheme.border} ${scoreTheme.bg} flex items-center justify-between shadow-sm`}>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isVi ? `Điểm Đánh Giá C-R-E (Lượt ${currentTurnData.turnNumber})` : `C-R-E Evaluation Score (Turn ${currentTurnData.turnNumber})`}</div>
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
                      <Icons.Target />
                      <span>Claim ({isVi ? 'Luận điểm' : 'Core Claim'})</span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 leading-relaxed">{currentTurnData.cre.claim}</div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 p-3 rounded-xl">
                    <div className="font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
                      <Icons.Brain />
                      <span>Reasoning ({isVi ? 'Lập luận' : 'Logical Reasoning'})</span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 leading-relaxed">{currentTurnData.cre.reasoning}</div>
                  </div>

                  {/* Evidence */}
                  <div className="bg-teal-50/80 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-500/30 p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                        <Icons.BarChart />
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
                      <Icons.AlertTriangle />
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
                      <Icons.Sparkles />
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
            ) : (
              /* Welcome Preview when empty */
              <div className="py-8 px-4 flex flex-col gap-4 text-xs">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
                    <Icons.Brain />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {isVi ? 'Sẵn Sàng Chẩn Đoán Tư Duy' : 'Ready for Cognitive Diagnostics'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isVi ? 'Hệ thống sẽ tự động bóc tách và phản hồi theo chuẩn Sư phạm v16 ngay khi bạn gửi lượt phát biểu đầu tiên.' : 'The system will automatically extract and evaluate your speech against pedagogical standards as soon as you submit your first turn.'}
                  </p>
                </div>

                <div className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-3.5">
                  <div className="bg-slate-100 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-3">
                    <Icons.Target />
                    <div>
                      <div className="font-bold text-cyan-700 dark:text-cyan-300 text-xs">{isVi ? 'Chẩn Đoán C-R-E Thời Gian Thực' : 'Real-time C-R-E Diagnostics'}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{isVi ? 'Đánh giá tính mạch lạc của Claim, Reasoning và Evidence.' : 'Evaluates coherence and rigor of Claim, Reasoning, and Evidence.'}</div>
                    </div>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-start gap-3">
                    <Icons.BarChart />
                    <div>
                      <div className="font-bold text-teal-700 dark:text-teal-300 text-xs">{isVi ? 'Phát Hiện Ngụy Biện & DSP Voice' : 'Fallacy Detection & Voice DSP'}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{isVi ? 'Bắt lỗi Strawman, Ad Hominem, đo tốc độ WPM & từ đệm.' : 'Catches Strawman, Ad Hominem, measures WPM tempo and filler words.'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

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
