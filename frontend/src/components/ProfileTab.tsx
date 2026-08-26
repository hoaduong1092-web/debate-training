/**
 * ProfileTab — Profile & Subscription Domain UI (v15/v16 Dual-Cycle & Thinking OS)
 *
 * Modern Tailwind CSS implementation with full bilingual support (VI / EN):
 *   1. Profile Header Card (Avatar, Name, Phone, Active Tier Badge, Member Since)
 *   2. Account Settings (Display Name Edit, Language Switcher)
 *   3. Real-Time Quota Dashboard (Text turns, Voice mins [NO NaN], Assistant questions)
 *   4. Voice Entitlement & Precedence Authority Card (VIP, Sub, Add-on FEFO, Trial)
 *   5. Subscription Tier Hub (Dual-Cycle Canonical Plans, Pricing & Upgrade Actions)
 *   6. Activity & Thinking OS Analytics Summary
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User as UserIcon,
  Zap,
  MessageSquare,
  Mic,
  Sparkles,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Globe,
  ArrowRight,
  Calendar,
  Phone,
  RefreshCw,
  Crown,
  Layers,
  Clock,
  Receipt,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import {
  UserProfileResponse,
  fetchUserProfile,
  updateUserProfile,
  fetchSubscriptionPlans,
  fetchVoiceEntitlement,
  fetchUserOrders,
  deleteUserOrder,
  deleteUserOrdersBatch,
  clearUserOrderHistory,
  PaymentOrderDTO,
  VoiceEntitlementResult,
  ArenaApiError,
} from '../lib/api';
import { Strings, Language } from '../lib/i18n';
import PricingModal from './PricingModal';
import { useAuth } from '../contexts/AuthContext';

export interface ProfileTabProps {
  t: Strings;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onTabChange?: (tab: 'arena' | 'history' | 'plaza' | 'profile' | 'assistant') => void;
  hidden?: boolean;
}

function formatDate(iso: string | undefined, language: Language): string {
  if (!iso) return language === 'vi' ? '20 thg 8, 2026' : 'Aug 20, 2026';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getPlanBadge(planId: string | null | undefined, language: Language) {
  const p = (planId || '').toUpperCase();
  if (p.includes('PREMIUM') || p.includes('PRO')) {
    return {
      label: language === 'vi' ? 'CAO CẤP (BỨT PHÁ)' : 'PREMIUM TIER',
      bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    };
  }
  if (p.includes('STD') || p.includes('STANDARD')) {
    return {
      label: language === 'vi' ? 'TIÊU CHUẨN (RÈN LUYỆN)' : 'STANDARD TIER',
      bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    };
  }
  if (p.includes('BASIC')) {
    return {
      label: language === 'vi' ? 'CƠ BẢN (KHÁM PHÁ)' : 'BASIC TIER',
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    };
  }
  return {
    label: language === 'vi' ? 'MIỄN PHÍ (TỰ DO)' : 'FREE PLAN',
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
  };
}

export default function ProfileTab({
  t,
  language,
  onLanguageChange,
  onTabChange,
  hidden = false,
}: ProfileTabProps) {
  const { user, updateDisplayName, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [voiceEntitlement, setVoiceEntitlement] = useState<VoiceEntitlementResult | null>(null);
  const [orders, setOrders] = useState<PaymentOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Edit Name State
  const [editName, setEditName] = useState(user?.displayName || user?.full_name || 'Học Viên Mẫu');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Pricing Modal Trigger
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // Order History Management State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'batch' | 'all';
    targetOrder?: PaymentOrderDTO;
    count?: number;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const allOrderIds = orders.map((o) => o.id);
  const isAllSelected = allOrderIds.length > 0 && allOrderIds.every((id) => selectedOrderIds.has(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allOrderIds));
    }
  };

  const handleToggleSelectOrder = (orderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleSingleDeleteClick = (order: PaymentOrderDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      type: 'single',
      targetOrder: order,
    });
  };

  const handleBatchDeleteClick = () => {
    if (selectedOrderIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'batch',
      count: selectedOrderIds.size,
    });
  };

  const handleClearAllClick = () => {
    if (orders.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'all',
      count: orders.length,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmModal) return;
    setIsDeleting(true);
    try {
      if (confirmModal.type === 'single' && confirmModal.targetOrder) {
        const targetId = confirmModal.targetOrder.id;
        await deleteUserOrder(targetId);
        setOrders((prev) => prev.filter((o) => o.id !== targetId));
        setSelectedOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        setToast({ message: t.ordersDeleteSuccess, type: 'success' });
      } else if (confirmModal.type === 'batch') {
        const targetIds = Array.from(selectedOrderIds);
        await deleteUserOrdersBatch(targetIds);
        setOrders((prev) => prev.filter((o) => !selectedOrderIds.has(o.id)));
        setSelectedOrderIds(new Set());
        setToast({
          message: t.ordersDeleteBatchSuccess.replace('{n}', String(targetIds.length)),
          type: 'success',
        });
      } else if (confirmModal.type === 'all') {
        await clearUserOrderHistory();
        setOrders([]);
        setSelectedOrderIds(new Set());
        setIsSelectMode(false);
        setToast({ message: t.ordersDeleteAllSuccess, type: 'success' });
      }
      setConfirmModal(null);
    } catch (err) {
      console.error('[ProfileTab] Delete error:', err);
      setToast({ message: t.ordersDeleteError, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profileResp, entitlementResp, , ordersResp] = await Promise.all([
        fetchUserProfile(),
        fetchVoiceEntitlement().then((r) => (r.success ? r.entitlement : null)).catch(() => null),
        fetchSubscriptionPlans().catch(() => ({ plans: [], credit_packs: [] })),
        fetchUserOrders().catch(() => ({ success: false, total: 0, orders: [] })),
      ]);
      setProfile(profileResp);
      if (entitlementResp) {
        setVoiceEntitlement(entitlementResp);
      }
      if (ordersResp && ordersResp.success && Array.isArray(ordersResp.orders)) {
        setOrders(ordersResp.orders);
      }
      const name = profileResp.profile.display_name || profileResp.profile.full_name || user?.displayName || user?.full_name || 'Học Viên Mẫu';
      setEditName(name);
      if (name && name !== user?.displayName) {
        updateDisplayName(name);
      }
    } catch (err) {
      const msg =
        err instanceof ArenaApiError
          ? `${t.profileLoadError} (${err.status})`
          : t.profileLoadError;
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [t.profileLoadError, updateDisplayName, user?.displayName, user?.full_name]);

  useEffect(() => {
    if (!hidden) {
      void loadData();
    }
  }, [hidden, loadData]);

  // Keep local editName synced if user.displayName updates
  useEffect(() => {
    if (user?.displayName) {
      setEditName(user.displayName);
    }
  }, [user?.displayName]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editName.trim();
    if (!cleanName || saveState === 'saving') return;
    setSaveState('saving');
    try {
      updateDisplayName(cleanName);
      await updateUserProfile({
        full_name: cleanName,
        language_preference: language,
      });
      setProfile((prev) =>
        prev ? { ...prev, profile: { ...prev.profile, full_name: cleanName } } : null
      );
      setSaveState('saved');
      await refreshUser();
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  if (hidden) return null;

  // Canonical Quota Calculations (Aligned with active subscription presence & zero-limit representation)
  const hasActivePlan = Boolean(profile?.subscription?.plan);

  const textRemaining = Number(
    profile?.quota?.text_remaining ?? user?.quota?.textTurnsRemaining ?? 20
  );
  const rawTextLimit = Number(profile?.quota?.text_limit ?? 0);
  const hasTextLimit = hasActivePlan && rawTextLimit > 0;
  const textLimit = hasTextLimit ? rawTextLimit : null;
  const textPct = hasTextLimit ? Math.min(100, Math.max(0, Math.round((textRemaining / rawTextLimit) * 100))) : 100;

  const voiceRemaining = Number(
    voiceEntitlement?.availableMinutes ??
    profile?.quota?.voice_remaining ??
    profile?.quota?.audio_remaining ??
    user?.quota?.voiceMinsRemaining ??
    15
  );
  const rawVoiceLimit = Number(
    profile?.quota?.voice_limit ??
    profile?.quota?.audio_limit ??
    0
  );
  const hasVoiceLimit = hasActivePlan && rawVoiceLimit > 0;
  const voiceLimit = hasVoiceLimit ? rawVoiceLimit : null;
  const voicePct = hasVoiceLimit ? Math.min(100, Math.max(0, Math.round((voiceRemaining / rawVoiceLimit) * 100))) : 100;

  const assistantRemaining = Number(
    profile?.quota?.assistant_remaining ?? user?.quota?.assistantRemaining ?? 10
  );
  const rawAsstLimit = Number(profile?.quota?.assistant_limit ?? 0);
  const hasAsstLimit = hasActivePlan && rawAsstLimit > 0;
  const assistantLimit = hasAsstLimit ? rawAsstLimit : null;
  const asstPct = hasAsstLimit ? Math.min(100, Math.max(0, Math.round((assistantRemaining / rawAsstLimit) * 100))) : 100;

  const currentDisplayName = user?.displayName || user?.full_name || profile?.profile?.full_name || 'Học Viên Mẫu';
  const currentPlanId = (profile?.subscription?.plan ?? user?.plan ?? '').toUpperCase();
  const badge = getPlanBadge(currentPlanId, language);
  
  let currentTier = 'FREE';
  if (currentPlanId.includes('PREMIUM') || currentPlanId.includes('PRO')) {
    currentTier = 'PREMIUM';
  } else if (currentPlanId.includes('STD') || currentPlanId.includes('STANDARD')) {
    currentTier = 'STANDARD';
  } else if (currentPlanId.includes('BASIC')) {
    currentTier = 'BASIC';
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* ── Top Alert Error if any ── */}
      {loadError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-500 transition cursor-pointer"
          >
            {language === 'vi' ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      )}

      {/* ── 1. Profile Header Card ── */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-indigo-500/20 shrink-0">
              {currentDisplayName.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {currentDisplayName}
                </h2>
                <span className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded-md border ${badge.bg}`}>
                  {badge.label}
                </span>
                {voiceEntitlement?.source === 'VIP' && (
                  <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Crown size={12} /> VIP PASS
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Phone size={13} className="text-indigo-500 shrink-0" />
                  {user?.phoneNumber || '+84901234567'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-500 shrink-0" />
                  {language === 'vi' ? 'Thành viên từ:' : 'Member since:'} {formatDate(profile?.profile?.created_at, language)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-95 cursor-pointer min-h-[44px]"
            >
              <Zap size={14} className="fill-current" />
              <span>{language === 'vi' ? 'Nâng Cấp Gói' : 'Upgrade Plan'}</span>
            </button>
            <button
              type="button"
              onClick={() => void loadData()}
              title={language === 'vi' ? 'Làm mới dữ liệu' : 'Refresh data'}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Real-Time Thinking OS Quota Dashboard ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <Zap size={18} className="text-amber-500" />
              <span>{language === 'vi' ? 'Hạn Ngạch Thời Gian Thực (Thinking OS Quota)' : 'Real-Time Quota Dashboard'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'vi'
                ? 'Hạn ngạch phục vụ các phiên tranh biện AI đa lượt, phân tích phản biện và luyện giọng nói.'
                : 'Allocated limits for multi-turn AI debate sparring, speech DSP analysis, and logic coaching.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Text Debate */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <MessageSquare size={16} />
                </div>
                <span>{language === 'vi' ? 'Tranh Biện Văn Bản' : 'Text Debate Turns'}</span>
              </div>
              <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                {hasTextLimit && textLimit ? (
                  <>
                    {textRemaining} <span className="text-xs text-slate-400 font-normal">/ {textLimit} {language === 'vi' ? 'lượt' : 'turns'}</span>
                  </>
                ) : (
                  <>
                    {textRemaining} <span className="text-xs text-slate-400 font-normal">{language === 'vi' ? 'lượt khả dụng' : 'turns available'}</span>
                  </>
                )}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${textPct}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {hasTextLimit
                ? (language === 'vi' ? `Hạn mức chu kỳ thuê bao: ${textLimit} lượt tranh biện văn bản.` : `Subscription period allowance: ${textLimit} debate turns.`)
                : (language === 'vi' ? 'Số dư khả dụng từ tài khoản dùng thử / gói nạp thêm (không giới hạn chu kỳ).' : 'Available balance from free trial or top-up packs.')}
            </p>
          </div>

          {/* Card 2: Voice Debate */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Mic size={16} />
                </div>
                <span>{language === 'vi' ? 'Tranh Biện Giọng Nói (Voice AI)' : 'Voice Debate (Voice AI)'}</span>
              </div>
              <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                {voiceEntitlement?.mode === 'TIME_UNLIMITED' ? (
                  language === 'vi' ? 'VIP (Không trừ)' : 'VIP (No deduction)'
                ) : hasVoiceLimit && voiceLimit ? (
                  <>
                    {voiceRemaining} <span className="text-xs text-slate-400 font-normal">/ {voiceLimit} {language === 'vi' ? 'phút' : 'mins'}</span>
                  </>
                ) : (
                  <>
                    {voiceRemaining} <span className="text-xs text-slate-400 font-normal">{language === 'vi' ? 'phút khả dụng' : 'mins available'}</span>
                  </>
                )}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: voiceEntitlement?.mode === 'TIME_UNLIMITED' ? '100%' : `${voicePct}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {voiceEntitlement?.mode === 'TIME_UNLIMITED'
                ? (language === 'vi' ? 'VIP Time Pass: Không trừ quota (tối đa 15 phút mỗi phiên tranh biện).' : 'VIP Time Pass: Zero quota deduction (15 min cap per session).')
                : hasVoiceLimit
                ? (language === 'vi' ? `Định mức chu kỳ: ${voiceLimit} phút luyện giọng Voice AI.` : `Subscription period allowance: ${voiceLimit} mins voice debate.`)
                : (language === 'vi' ? 'Voice DSP phân tích tốc độ WPM, từ đệm (ừm, à) và cao độ phát âm trực tiếp.' : 'Speech DSP measures real-time speaking pace (WPM), pitch, and filler words.')}
            </p>
          </div>

          {/* Card 3: Assistant Drafts */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles size={16} />
                </div>
                <span>{language === 'vi' ? 'Trợ Lý & Cố Vấn Tư Duy' : 'AI Assistant Consultations'}</span>
              </div>
              <span className="font-mono text-sm font-black text-purple-600 dark:text-purple-400">
                {hasAsstLimit && assistantLimit ? (
                  <>
                    {assistantRemaining} <span className="text-xs text-slate-400 font-normal">/ {assistantLimit} {language === 'vi' ? 'câu' : 'credits'}</span>
                  </>
                ) : (
                  <>
                    {assistantRemaining} <span className="text-xs text-slate-400 font-normal">{language === 'vi' ? 'câu khả dụng' : 'credits available'}</span>
                  </>
                )}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${asstPct}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'vi'
                ? 'Hỗ trợ phân tích lập luận C-R-E, phát hiện ngụy biện và gợi ý phản đề chuyên sâu.'
                : 'Supports C-R-E argument synthesis, fallacy diagnosis, and counter-rebuttal drafting.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Voice Entitlement & Precedence Details (Phases B6 & B7 Authority) ── */}
      {voiceEntitlement && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {language === 'vi' ? 'Chi Tiết Quyền Hạn Phát Biểu Voice (Entitlement Precedence)' : 'Voice Entitlement Precedence Breakdown'}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Tối đa: {Math.round(voiceEntitlement.maxAllowedMs / 60000)} phút / phiên
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                voiceEntitlement.allowed
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {voiceEntitlement.allowed ? '✓ SẴN SÀNG THI ĐẤU' : '⚠️ HẾT HẠN NGẠCH'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Priority 1: VIP Time Pass */}
            <div className={`p-3.5 rounded-xl border ${
              voiceEntitlement.source === 'VIP'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/30'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Crown size={13} className={voiceEntitlement.source === 'VIP' ? 'text-amber-500' : 'text-slate-400'} />
                  1. VIP Time Pass
                </span>
                {voiceEntitlement.source === 'VIP' && <span className="font-bold text-[10px] text-amber-500">ĐANG ƯU TIÊN</span>}
              </div>
              <p className="text-[11px] mt-1">
                {voiceEntitlement.source === 'VIP'
                  ? `Mã: ${voiceEntitlement.breakdown?.vipPassCode || 'VIP_ACTIVE'} — Không trừ quota`
                  : 'Chưa kích hoạt'}
              </p>
            </div>

            {/* Priority 2: Subscription Quota */}
            <div className={`p-3.5 rounded-xl border ${
              voiceEntitlement.source === 'SUBSCRIPTION'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/30'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Zap size={13} className={voiceEntitlement.source === 'SUBSCRIPTION' ? 'text-indigo-500' : 'text-slate-400'} />
                  2. Gói Thuê Bao
                </span>
                {voiceEntitlement.source === 'SUBSCRIPTION' && <span className="font-bold text-[10px] text-indigo-500">ĐANG ƯU TIÊN</span>}
              </div>
              <p className="text-[11px] mt-1">
                {voiceEntitlement.breakdown?.subscriptionMinutes ?? 0} phút khả dụng
              </p>
            </div>

            {/* Priority 3: Add-on Credit Packs (FEFO) */}
            <div className={`p-3.5 rounded-xl border ${
              voiceEntitlement.source === 'ADD_ON'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/30'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock size={13} className={voiceEntitlement.source === 'ADD_ON' ? 'text-emerald-500' : 'text-slate-400'} />
                  3. Gói Nạp FEFO
                </span>
                {voiceEntitlement.source === 'ADD_ON' && <span className="font-bold text-[10px] text-emerald-500">ĐANG ƯU TIÊN</span>}
              </div>
              <p className="text-[11px] mt-1">
                {voiceEntitlement.breakdown?.addonMinutes ?? 0} phút nạp thêm
              </p>
            </div>

            {/* Priority 4: Free Trial */}
            <div className={`p-3.5 rounded-xl border ${
              voiceEntitlement.source === 'TRIAL'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-900 dark:text-purple-200 shadow-sm ring-1 ring-purple-500/30'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 text-slate-500'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles size={13} className={voiceEntitlement.source === 'TRIAL' ? 'text-purple-500' : 'text-slate-400'} />
                  4. Dùng Thử (Trial)
                </span>
                {voiceEntitlement.source === 'TRIAL' && <span className="font-bold text-[10px] text-purple-500">ĐANG ƯU TIÊN</span>}
              </div>
              <p className="text-[11px] mt-1">
                {voiceEntitlement.breakdown?.trialMinutes ?? 0} phút dùng thử
              </p>
            </div>
          </div>

          {/* Active Packs List if any */}
          {voiceEntitlement.breakdown?.activePacks && voiceEntitlement.breakdown.activePacks.length > 0 && (
            <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                📦 Danh sách gói nạp active (Thứ tự FEFO: hết hạn sớm dùng trước):
              </span>
              <div className="flex flex-wrap gap-2">
                {voiceEntitlement.breakdown.activePacks.map((pack) => (
                  <span
                    key={pack.packId}
                    className="font-mono text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2"
                  >
                    <strong>{pack.packCode}</strong>: {pack.remainingUnits} phút • Hạn: {formatDate(String(pack.expiresAt), language)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Quick Settings & Account Preferences ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box A: Edit Name */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <UserIcon size={16} className="text-indigo-500" />
            <span>{language === 'vi' ? 'Thông Tin Tài Khoản' : 'Account Settings'}</span>
          </h4>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                {language === 'vi' ? 'Tên hiển thị:' : 'Display Name:'}
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập họ và tên...' : 'Enter your name...'}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saveState === 'saving'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {saveState === 'saving'
                  ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
                  : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
              </button>

              {saveState === 'saved' && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 size={14} /> {language === 'vi' ? 'Đã cập nhật thành công' : 'Updated successfully'}
                </span>
              )}
              {saveState === 'error' && (
                <span className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle size={14} /> {language === 'vi' ? 'Có lỗi xảy ra' : 'Error updating profile'}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Box B: Language Switcher */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Globe size={16} className="text-indigo-500" />
            <span>{language === 'vi' ? 'Ngôn Ngữ Giao Diện' : 'Interface Language'}</span>
          </h4>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'vi'
              ? 'Lựa chọn ngôn ngữ hiển thị mặc định trên toàn bộ hệ thống AI Debate Master.'
              : 'Choose the default display language across AI Debate Master.'}
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onLanguageChange('vi')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                language === 'vi'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇻🇳</span>
              <span>Tiếng Việt</span>
            </button>

            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                language === 'en'
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇺🇸</span>
              <span>English</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Subscription Packages Catalogue Hub ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <CreditCard size={18} className="text-indigo-500" />
              <span>{language === 'vi' ? 'Gói Cước & Nạp Hạn Ngạch' : 'Subscription & Quota Plans'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'vi'
                ? 'Chọn các gói cước chuẩn Dual-Cycle với mức giá và định mức tối ưu cho từng lộ trình.'
                : 'Select canonical Dual-Cycle plans tailored for sparring velocity and tournament preparation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsPricingModalOpen(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>{language === 'vi' ? 'Mở Bảng Giá Chi Tiết' : 'View Full Pricing Table'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Plan 1: Basic */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                {language === 'vi' ? 'Gói Khám Phá' : 'Discovery Tier'}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Cơ Bản (Basic)' : 'Basic Plan'}
              </h4>
              <div className="text-2xl font-black font-mono my-2 text-slate-900 dark:text-white">
                {language === 'vi' ? '49.000' : '49,000'}{' '}
                <span className="text-xs font-sans text-slate-400 font-normal">
                  {language === 'vi' ? 'VNĐ / tháng' : 'VND / month'}
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
                <li>✓ <strong>30</strong> {language === 'vi' ? 'lượt tranh biện văn bản' : 'text debate turns'}</li>
                <li>✓ <strong>15</strong> {language === 'vi' ? 'phút luyện nói Voice AI' : 'minutes Voice AI'}</li>
                <li>✓ <strong>10</strong> {language === 'vi' ? 'câu hỏi cố vấn tư duy' : 'assistant questions'}</li>
                <li>✓ Logic Coach C-R-E {language === 'vi' ? 'cơ bản' : 'fundamentals'}</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {currentTier === 'BASIC' ? (language === 'vi' ? 'Gói Hiện Tại' : 'Current Plan') : currentTier === 'FREE' ? (language === 'vi' ? 'Nâng Cấp Ngay' : 'Upgrade Now') : (language === 'vi' ? 'Hạ Cấp' : 'Downgrade')}
            </button>
          </div>

          {/* Plan 2: Standard */}
          <div className="bg-indigo-50/70 dark:bg-slate-900/90 border-2 border-indigo-500 rounded-2xl p-5 shadow-lg shadow-indigo-500/10 flex flex-col justify-between relative md:-translate-y-1 transition">
            <span className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md shadow-indigo-600/30">
              {language === 'vi' ? 'Phổ Biến Nhất' : 'Most Popular'}
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                {language === 'vi' ? 'Gói Rèn Luyện' : 'Training Tier'}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Tiêu Chuẩn (Standard)' : 'Standard Plan'}
              </h4>
              <div className="text-2xl font-black font-mono my-2 text-indigo-600 dark:text-indigo-400">
                {language === 'vi' ? '129.000' : '129,000'}{' '}
                <span className="text-xs font-sans text-slate-400 font-normal">
                  {language === 'vi' ? 'VNĐ / tháng' : 'VND / month'}
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-indigo-200 dark:border-slate-800 pt-3 mb-4">
                <li>✓ <strong>100</strong> {language === 'vi' ? 'lượt tranh biện văn bản' : 'text debate turns'}</li>
                <li>✓ <strong>60</strong> {language === 'vi' ? 'phút luyện nói Voice AI' : 'minutes Voice AI'}</li>
                <li>✓ <strong>50</strong> {language === 'vi' ? 'câu hỏi cố vấn tư duy' : 'assistant questions'}</li>
                <li>✓ {language === 'vi' ? 'Mở rộng 4 AI Coaches chuyên sâu' : 'Full 4 AI Coaches access'}</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              {currentTier === 'STANDARD' ? (language === 'vi' ? 'Gói Hiện Tại' : 'Current Plan') : currentTier === 'PREMIUM' ? (language === 'vi' ? 'Hạ Cấp' : 'Downgrade') : (language === 'vi' ? 'Nâng Cấp Ngay' : 'Upgrade Now')}
            </button>
          </div>

          {/* Plan 3: Premium */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                {language === 'vi' ? 'Gói Bứt Phá' : 'Mastery Tier'}
              </span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'vi' ? 'Cao Cấp (Premium)' : 'Premium Plan'}
              </h4>
              <div className="text-2xl font-black font-mono my-2 text-slate-900 dark:text-white">
                {language === 'vi' ? '399.000' : '399,000'}{' '}
                <span className="text-xs font-sans text-slate-400 font-normal">
                  {language === 'vi' ? 'VNĐ / tháng' : 'VND / month'}
                </span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
                <li>✓ <strong>500</strong> {language === 'vi' ? 'lượt tranh biện văn bản' : 'text debate turns'}</li>
                <li>✓ <strong>300</strong> {language === 'vi' ? 'phút luyện nói Voice AI' : 'minutes Voice AI'}</li>
                <li>✓ <strong>200</strong> {language === 'vi' ? 'câu hỏi cố vấn tư duy' : 'assistant questions'}</li>
                <li>✓ {language === 'vi' ? 'Ưu tiên Realtime AI Streaming cao nhất' : 'Highest AI streaming priority'}</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {currentTier === 'PREMIUM' ? (language === 'vi' ? 'Gói Hiện Tại' : 'Current Plan') : (language === 'vi' ? 'Nâng Cấp Ngay' : 'Upgrade Now')}
            </button>
          </div>
        </div>
      </div>

      {/* ── 6. Lịch Sử Giao Dịch & Đơn Hàng (Phase C1-A User Transaction History) ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white">
              <Receipt size={18} className="text-indigo-500" />
              <span>{t.ordersTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t.ordersSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {orders.length} {t.ordersCount}
            </span>

            {orders.length > 0 && !isSelectMode && (
              <>
                <button
                  type="button"
                  onClick={() => setIsSelectMode(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare size={13} />
                  <span>{t.ordersManage}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllClick}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>{t.ordersDeleteAll}</span>
                </button>
              </>
            )}

            {isSelectMode && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold px-2 text-indigo-600 dark:text-indigo-400">
                  {t.ordersSelectedCount.replace('{n}', String(selectedOrderIds.size))}
                </span>

                {selectedOrderIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchDeleteClick}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>{t.ordersDeleteSelected.replace('{n}', String(selectedOrderIds.size))}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedOrderIds(new Set());
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {t.ordersCancelSelect}
                </button>
              </div>
            )}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2 text-xl">
              🧾
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t.ordersEmptyTitle}
            </h4>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              {t.ordersEmptySubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile Presentation */}
            <div className="md:hidden space-y-3">
              {isSelectMode && (
                <div className="flex items-center p-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm cursor-pointer" onClick={handleToggleSelectAll}>
                  <button
                    type="button"
                    className="mr-3 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px]"
                    title={isAllSelected ? t.ordersDeselectAll : t.ordersSelectAll}
                  >
                    {isAllSelected ? (
                      <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {isAllSelected ? t.ordersDeselectAll : t.ordersSelectAll}
                  </span>
                </div>
              )}

              {orders.map((ord) => {
                const isPaid = ord.status === 'PAID';
                const isPending = ord.status === 'PENDING';
                const isFailed = ord.status === 'FAILED';
                const isSelected = selectedOrderIds.has(ord.id);

                const statusBadge = isPaid
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : isPending
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : isFailed
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                  : 'bg-slate-500/10 text-slate-500 border-slate-500/30';

                const statusText = isPaid
                  ? (language === 'vi' ? '✓ Đã thanh toán' : '✓ Paid')
                  : isPending
                  ? (language === 'vi' ? '⏳ Chờ thanh toán' : '⏳ Pending')
                  : isFailed
                  ? (language === 'vi' ? '✕ Thất bại' : '✕ Failed')
                  : ord.status;

                return (
                  <div
                    key={ord.id}
                    onClick={isSelectMode ? (e) => handleToggleSelectOrder(ord.id, e) : undefined}
                    className={`p-4 rounded-xl bg-white dark:bg-slate-900/90 border shadow-sm transition ${
                      isSelected
                        ? 'border-indigo-500/50 ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    } ${isSelectMode ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {isSelectMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectOrder(ord.id, e);
                            }}
                            className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px] -ml-3 -my-3"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        )}
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {ord.orderCode}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge}`}>
                        {statusText}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3 font-sans font-medium text-slate-900 dark:text-white">
                      {ord.itemType === 'VIP' && <span className="text-amber-500">👑</span>}
                      {ord.itemType === 'CREDIT_PACK' && <span className="text-indigo-500">⚡</span>}
                      {ord.itemType === 'PLAN' && <span className="text-blue-500">💎</span>}
                      <span>{ord.itemName}</span>
                      <span className="text-xs text-slate-500 ml-auto">{ord.provider}</span>
                    </div>

                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                      <div>
                        <div className="font-bold text-indigo-600 dark:text-indigo-400">
                          {Number(ord.amountVnd).toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-slate-500 text-[11px] font-sans mt-0.5">
                          {formatDate(ord.createdAt, language)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleDeleteClick(ord, e);
                        }}
                        title={t.ordersDeleteSingle}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Presentation */}
            <div className="hidden md:block bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold">
                      {isSelectMode && (
                        <th className="py-3 px-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-center mx-auto"
                            title={isAllSelected ? t.ordersDeselectAll : t.ordersSelectAll}
                          >
                            {isAllSelected ? (
                              <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="py-3 px-4">{language === 'vi' ? 'Mã Đơn' : 'Order Code'}</th>
                      <th className="py-3 px-4">{language === 'vi' ? 'Mặt Hàng' : 'Item'}</th>
                      <th className="py-3 px-4">{language === 'vi' ? 'Số Tiền' : 'Amount'}</th>
                      <th className="py-3 px-4">{language === 'vi' ? 'Cổng TT' : 'Gateway'}</th>
                      <th className="py-3 px-4">{language === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                      <th className="py-3 px-4">{language === 'vi' ? 'Thời Gian' : 'Date'}</th>
                      <th className="py-3 px-4 text-right">{language === 'vi' ? 'Thao Tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {orders.map((ord) => {
                      const isPaid = ord.status === 'PAID';
                      const isPending = ord.status === 'PENDING';
                      const isFailed = ord.status === 'FAILED';
                      const isSelected = selectedOrderIds.has(ord.id);

                      const statusBadge = isPaid
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : isPending
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : isFailed
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : 'bg-slate-500/10 text-slate-500 border-slate-500/30';

                      const statusText = isPaid
                        ? (language === 'vi' ? '✓ Đã thanh toán' : '✓ Paid')
                        : isPending
                        ? (language === 'vi' ? '⏳ Chờ thanh toán' : '⏳ Pending')
                        : isFailed
                        ? (language === 'vi' ? '✕ Thất bại' : '✕ Failed')
                        : ord.status;

                      return (
                        <tr
                          key={ord.id}
                          onClick={isSelectMode ? (e) => handleToggleSelectOrder(ord.id, e) : undefined}
                          className={`transition ${
                            isSelected
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                          } ${isSelectMode ? 'cursor-pointer' : ''}`}
                        >
                          {isSelectMode && (
                            <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => handleToggleSelectOrder(ord.id, e)}
                                className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer flex items-center justify-center mx-auto"
                              >
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <Square size={16} />
                                )}
                              </button>
                            </td>
                          )}
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {ord.orderCode}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">
                            <div className="flex items-center gap-1.5">
                              {ord.itemType === 'VIP' && <span className="text-amber-500">👑</span>}
                              {ord.itemType === 'CREDIT_PACK' && <span className="text-indigo-500">⚡</span>}
                              {ord.itemType === 'PLAN' && <span className="text-blue-500">💎</span>}
                              <span>{ord.itemName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                            {Number(ord.amountVnd).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-sans">
                            {ord.provider}
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] font-sans">
                            {formatDate(ord.createdAt, language)}
                          </td>
                          <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleSingleDeleteClick(ord, e)}
                              title={t.ordersDeleteSingle}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 7. Activity Metrics Summary ── */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 block">
                {language === 'vi' ? 'Tổng số phiên tranh biện:' : 'Total Debate Sessions:'}
              </span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                {profile?.stats?.total_sessions ?? 27}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-500 block">
                {language === 'vi' ? 'Đã hoàn thành:' : 'Completed:'}
              </span>
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                {profile?.stats?.completed_sessions ?? 25}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-500 block">
                {language === 'vi' ? 'Tỷ lệ hoàn thành:' : 'Completion Rate:'}
              </span>
              <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                {profile?.stats?.total_sessions
                  ? `${Math.round(((profile.stats.completed_sessions || 0) / profile.stats.total_sessions) * 100)}%`
                  : '92.6%'}
              </span>
            </div>
          </div>

          {onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange('arena')}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>{language === 'vi' ? 'Vào Đấu Trường Luyện Tập' : 'Enter Debate Arena'}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Order Deletion Confirmation Modal ── */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModal.type === 'all'
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
              }`}>
                {confirmModal.type === 'all' ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {confirmModal.type === 'single'
                    ? t.ordersDeleteSingleConfirmTitle
                    : confirmModal.type === 'batch'
                    ? t.ordersDeleteBatchConfirmTitle.replace('{n}', String(confirmModal.count || 0))
                    : t.ordersDeleteAllConfirmTitle}
                </h4>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {confirmModal.type === 'single'
                ? t.ordersDeleteSingleConfirmBody
                : confirmModal.type === 'batch'
                ? t.ordersDeleteBatchConfirmBody
                : t.ordersDeleteAllConfirmBody}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                {t.ordersCancelBtn}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void handleConfirmDelete()}
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  confirmModal.type === 'all'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                }`}
              >
                {isDeleting && <RefreshCw size={13} className="animate-spin" />}
                <span>
                  {confirmModal.type === 'all'
                    ? t.ordersConfirmDeleteAllBtn
                    : t.ordersConfirmDeleteBtn}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-slide-up ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950 border-rose-500/40 text-rose-800 dark:text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Pricing Modal Overlay ── */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => {
          setIsPricingModalOpen(false);
          void loadData();
        }}
      />
    </div>
  );
}
