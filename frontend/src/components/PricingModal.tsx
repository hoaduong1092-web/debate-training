import React, { useState, useEffect } from 'react';
import { api, DynamicPlan, CreditPackItem, VipPassItem } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Strings, Language } from '../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
  t?: Strings;
}

interface PurchasableItem {
  id: string;
  type: 'PLAN' | 'CREDIT_PACK' | 'VIP';
  name: string;
  priceVnd: number;
  durationDays: number;
  dimension?: string;
  units?: number;
  description?: string;
  features?: string[];
  isPopular?: boolean;
}

const DEFAULT_VIP_PASSES: VipPassItem[] = [
  {
    code: 'VIP_1D',
    display_name: 'VIP Pass 1 Ngày',
    list_price_vnd: 19000,
    duration_days: 1,
    description_vi: 'Không giới hạn quota trong 24 giờ',
    description_en: 'Unlimited quota for 24 hours',
  },
  {
    code: 'VIP_3D',
    display_name: 'VIP Pass 3 Ngày (Chiến Dịch)',
    list_price_vnd: 49000,
    duration_days: 3,
    description_vi: 'Không giới hạn quota trong 72 giờ (Hero Campaign)',
    description_en: 'Unlimited quota for 72 hours',
  },
  {
    code: 'VIP_7D',
    display_name: 'VIP Pass 7 Ngày',
    list_price_vnd: 89000,
    duration_days: 7,
    description_vi: 'Không giới hạn quota trong 7 ngày',
    description_en: 'Unlimited quota for 7 days',
  },
  {
    code: 'VIP_30D',
    display_name: 'VIP Pass 30 Ngày',
    list_price_vnd: 199000,
    duration_days: 30,
    description_vi: 'Không giới hạn quota trong 30 ngày',
    description_en: 'Unlimited quota for 30 days',
  },
];

const DEFAULT_MONTHLY_PLANS: DynamicPlan[] = [
  {
    id: 'BASIC_MONTHLY',
    name: 'Cơ Bản (Khám Phá)',
    billingCycle: 'monthly',
    priceVnd: 49000,
    durationDays: 30,
    textTurnsQuota: 30,
    voiceMinsQuota: 15,
    assistantQuota: 10,
    isPopular: false,
    isActive: true,
    features: [
      '30 lượt tranh biện văn bản',
      '15 phút luyện nói Voice AI',
      '10 câu hỏi Trợ lý phân tích',
      'Logic Coach C-R-E cơ bản',
    ],
  },
  {
    id: 'STANDARD_MONTHLY',
    name: 'Tiêu Chuẩn (Rèn Luyện)',
    billingCycle: 'monthly',
    priceVnd: 129000,
    durationDays: 30,
    textTurnsQuota: 100,
    voiceMinsQuota: 60,
    assistantQuota: 50,
    isPopular: true,
    isActive: true,
    features: [
      '100 lượt tranh biện văn bản',
      '60 phút luyện nói Voice AI',
      '50 câu hỏi Trợ lý phân tích',
      'Mở rộng 4 AI Coaches (Logic, Voice, Interaction, Psychology)',
      'Luyện tập phản biện đa lượt',
    ],
  },
  {
    id: 'PREMIUM_MONTHLY',
    name: 'Cao Cấp (Bứt Phá)',
    billingCycle: 'monthly',
    priceVnd: 399000,
    durationDays: 30,
    textTurnsQuota: 500,
    voiceMinsQuota: 300,
    assistantQuota: 200,
    isPopular: false,
    isActive: true,
    features: [
      '500 lượt tranh biện văn bản',
      '300 phút luyện nói Voice AI',
      '200 câu hỏi Trợ lý',
      'Đầy đủ tính năng chuyên sâu',
      'Ưu tiên Realtime AI Streaming',
    ],
  },
];

const DEFAULT_YEARLY_PLANS: DynamicPlan[] = [
  {
    id: 'BASIC_YEARLY',
    name: 'Cơ Bản (Khám Phá)',
    billingCycle: 'yearly',
    priceVnd: 490000,
    durationDays: 365,
    textTurnsQuota: 360,
    voiceMinsQuota: 180,
    assistantQuota: 120,
    isPopular: false,
    isActive: true,
    features: [
      'Hạn mức 365 ngày trọn gói',
      '360 lượt tranh biện văn bản',
      '180 phút luyện nói Voice AI',
      '120 câu hỏi Trợ lý',
      'Tiết kiệm ~17%',
    ],
  },
  {
    id: 'STANDARD_YEARLY',
    name: 'Tiêu Chuẩn (Rèn Luyện)',
    billingCycle: 'yearly',
    priceVnd: 1190000,
    durationDays: 365,
    textTurnsQuota: 1200,
    voiceMinsQuota: 720,
    assistantQuota: 600,
    isPopular: true,
    isActive: true,
    features: [
      'Hạn mức 365 ngày trọn gói',
      '1.200 lượt tranh biện văn bản',
      '720 phút (12 giờ) Voice AI',
      '600 câu hỏi Trợ lý',
      'Mở rộng 4 AI Coaches',
      'Tiết kiệm ~23%',
    ],
  },
  {
    id: 'PREMIUM_YEARLY',
    name: 'Cao Cấp (Bứt Phá)',
    billingCycle: 'yearly',
    priceVnd: 3590000,
    durationDays: 365,
    textTurnsQuota: 6000,
    voiceMinsQuota: 3600,
    assistantQuota: 2400,
    isPopular: false,
    isActive: true,
    features: [
      'Hạn mức 365 ngày trọn gói',
      '6.000 lượt tranh biện văn bản',
      '3.600 phút (60 giờ) Voice AI',
      '2.400 câu hỏi Trợ lý',
      'Đầy đủ tính năng cao cấp',
      'Ưu tiên Realtime AI Streaming',
      'Tiết kiệm 25%',
    ],
  },
];

const DEFAULT_ACTIVE_CREDIT_PACKS: CreditPackItem[] = [
  {
    code: 'PACK_VOICE_15',
    display_name: 'Gói Voice Boost 15 phút',
    list_price_vnd: 15000,
    duration_days: 30,
    dimension: 'voice',
    units: 15,
    description_vi: '15 phút luyện phát biểu Voice AI thời gian thực',
    description_en: '15 minutes real-time Voice AI debate',
  },
  {
    code: 'PACK_VOICE_60',
    display_name: 'Gói Voice Boost 60 phút',
    list_price_vnd: 49000,
    duration_days: 30,
    dimension: 'voice',
    units: 60,
    description_vi: '60 phút luyện phát biểu Voice AI (1 giờ đàm thoại)',
    description_en: '60 minutes real-time Voice AI debate',
  },
  {
    code: 'PACK_TEXT_10',
    display_name: 'Gói Text Debate 10 phiên',
    list_price_vnd: 19000,
    duration_days: 30,
    dimension: 'text',
    units: 10,
    description_vi: '10 phiên tranh biện văn bản đa lượt cùng AI Opponent',
    description_en: '10 multi-turn text debate sessions',
  },
  {
    code: 'PACK_ASST_5',
    display_name: 'Gói Trợ Lý AI 5 câu hỏi',
    list_price_vnd: 15000,
    duration_days: 30,
    dimension: 'assistant',
    units: 5,
    description_vi: '5 câu hỏi phân tích kiến nghị và gợi ý dàn ý bài nói',
    description_en: '5 motion analysis and speech drafting queries',
  },
];

export const PricingModal: React.FC<Props> = ({ isOpen, onClose, language = 'vi' }) => {
  const { user, refreshUser } = useAuth();
  const [pricingCategory, setPricingCategory] = useState<'SUBSCRIPTION' | 'CREDIT_PACK' | 'VIP'>('SUBSCRIPTION');
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPackItem[]>(DEFAULT_ACTIVE_CREDIT_PACKS);
  const [vipPasses, setVipPasses] = useState<VipPassItem[]>(DEFAULT_VIP_PASSES);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [, setLoading] = useState(false);

  // Checkout State
  const [selectedItem, setSelectedItem] = useState<PurchasableItem | null>(null);
  const [provider, setProvider] = useState<'SEPAY' | 'VNPAY' | 'MOMO' | 'SANDBOX'>('SEPAY');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [fulfillmentSuccess, setFulfillmentSuccess] = useState(false);

  // Escape key handler for PricingModal
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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.fetchPlans()
        .then((res: any) => {
          if (res.success) {
            if (res.plans && Array.isArray(res.plans)) {
              const mapped: DynamicPlan[] = res.plans.map((p: any) => {
                const rawCycle = p.billingCycle || p.billing_cycle;
                let cycle: 'monthly' | 'yearly' = 'monthly';
                if (rawCycle) {
                  cycle = rawCycle.toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
                } else if (p.id?.toUpperCase().includes('YEAR') || (p.duration_days ?? p.durationDays) >= 365) {
                  cycle = 'yearly';
                }

                const isPopular =
                  Boolean(p.isPopular) ||
                  Boolean(p.is_popular) ||
                  Boolean(p.id?.toUpperCase().includes('STD')) ||
                  Boolean(p.id?.toUpperCase().includes('STANDARD')) ||
                  Boolean(p.name?.includes('Tiêu Chuẩn'));

                const rawFeatures = p.features ?? p.features_vi ?? [];
                const featuresArray = Array.isArray(rawFeatures) ? rawFeatures : [];

                return {
                  id: p.id || p.code || 'BASIC_MONTHLY',
                  name: p.name || p.display_name || p.displayName || 'Gói Cước',
                  billingCycle: cycle,
                  billing_cycle: cycle,
                  priceVnd: Number(p.priceVnd ?? p.list_price_vnd ?? p.price_vnd ?? 49000),
                  durationDays: p.durationDays ?? p.duration_days ?? (cycle === 'yearly' ? 365 : 30),
                  textTurnsQuota: p.textTurnsQuota ?? p.limits?.text ?? p.text_turns ?? 30,
                  voiceMinsQuota: p.voiceMinsQuota ?? p.limits?.voice ?? 15,
                  assistantQuota: p.assistantQuota ?? p.limits?.assistant ?? 10,
                  isPopular,
                  is_popular: isPopular,
                  features: featuresArray,
                  isActive: p.isActive !== false,
                };
              });
              setPlans(mapped);
            }

            if (res.credit_packs && Array.isArray(res.credit_packs)) {
              // Filter active packs strictly (exclude legacy session-based codes)
              const allowedCodes = new Set(['PACK_VOICE_15', 'PACK_VOICE_60', 'PACK_TEXT_10', 'PACK_ASST_5']);
              const filteredPacks = res.credit_packs.filter((cp: CreditPackItem) => allowedCodes.has(cp.code));
              if (filteredPacks.length > 0) {
                setCreditPacks(filteredPacks);
              }
            }

            if (res.vip_passes && Array.isArray(res.vip_passes) && res.vip_passes.length > 0) {
              setVipPasses(res.vip_passes);
            }
          }
        })
        .catch((err) => console.error('[PricingModal] Error fetching plans:', err))
        .finally(() => setLoading(false));
    } else {
      setSelectedItem(null);
      setCheckoutData(null);
      setFulfillmentSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isPlanMatchCycle = (plan: DynamicPlan, cycle: 'monthly' | 'yearly') => {
    const pCycle = (plan.billingCycle || plan.billing_cycle || '').toLowerCase();
    if (pCycle === 'yearly' || pCycle === 'annual') return cycle === 'yearly';
    if (pCycle === 'monthly') return cycle === 'monthly';
    const idUpper = (plan.id || (plan as any).code || '').toUpperCase();
    if (idUpper.includes('YEAR') || idUpper.includes('365') || (plan.durationDays ?? (plan as any).duration_days ?? 0) >= 365) {
      return cycle === 'yearly';
    }
    return cycle === 'monthly';
  };

  const getTierCategory = (plan: DynamicPlan): 'BASIC' | 'STANDARD' | 'PREMIUM' | null => {
    const idUpper = (plan.id || (plan as any).code || '').toUpperCase();
    const nameUpper = (plan.name || (plan as any).display_name || '').toUpperCase();
    if (idUpper.includes('PREMIUM') || idUpper.includes('PRO') || idUpper.includes('399') || idUpper.includes('359') || nameUpper.includes('CAO CẤP') || nameUpper.includes('BỨT PHÁ')) {
      return 'PREMIUM';
    }
    if (idUpper.includes('STD') || idUpper.includes('STANDARD') || idUpper.includes('129') || idUpper.includes('119') || nameUpper.includes('TIÊU CHUẨN') || nameUpper.includes('RÈN LUYỆN')) {
      return 'STANDARD';
    }
    if (idUpper.includes('BASIC') || idUpper.includes('49') || idUpper.includes('490') || nameUpper.includes('CƠ BẢN') || nameUpper.includes('KHÁM PHÁ')) {
      return 'BASIC';
    }
    return null;
  };

  const matchingDbPlans = plans.filter((p) => isPlanMatchCycle(p, billingCycle) && p.isActive);
  let displayPlans: DynamicPlan[] = [];

  const activeDefaults = billingCycle === 'yearly' ? DEFAULT_YEARLY_PLANS : DEFAULT_MONTHLY_PLANS;
  if (matchingDbPlans.length >= 3) {
    displayPlans = matchingDbPlans;
  } else if (matchingDbPlans.length > 0) {
    const filled: DynamicPlan[] = [];
    (['BASIC', 'STANDARD', 'PREMIUM'] as const).forEach((tier) => {
      const dbMatch = matchingDbPlans.find((p) => getTierCategory(p) === tier);
      if (dbMatch) {
        filled.push(dbMatch);
      } else {
        const defMatch = activeDefaults.find((p) => getTierCategory(p) === tier);
        if (defMatch) filled.push(defMatch);
      }
    });
    displayPlans = filled.length >= 3 ? filled : activeDefaults;
  } else {
    displayPlans = activeDefaults;
  }

  // Handle Initiating Checkout
  const handleStartCheckout = async (item: PurchasableItem) => {
    if (checkoutLoading) return;
    setSelectedItem(item);
    setCheckoutLoading(true);
    try {
      const res = await api.createCheckoutSession({
        itemCode: item.id,
        itemType: item.type,
        provider,
      });
      setCheckoutData(res);
    } catch (err: any) {
      console.error('[Checkout error]', err);
      alert(`Lỗi khởi tạo đơn hàng: ${err.message || 'Vui lòng thử lại'}`);
      setSelectedItem(null);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle Gateway Switch in Checkout View
  const handleSwitchProvider = async (newProvider: 'SEPAY' | 'VNPAY' | 'MOMO' | 'SANDBOX') => {
    if (!selectedItem || checkoutLoading) return;
    setProvider(newProvider);
    setCheckoutLoading(true);
    try {
      const res = await api.createCheckoutSession({
        itemCode: selectedItem.id,
        itemType: selectedItem.type,
        provider: newProvider,
      });
      setCheckoutData(res);
    } catch (err: any) {
      console.error('[Provider switch error]', err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle Sandbox Direct Upgrade
  const handleSandboxSimulate = async () => {
    if (!selectedItem || checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const res = await api.sandboxDirectUpgrade({
        itemCode: selectedItem.id,
        itemType: selectedItem.type,
        planTier: selectedItem.id,
      });
      if (res.success) {
        setFulfillmentSuccess(true);
        await refreshUser();
      }
    } catch (err: any) {
      alert(`Lỗi nâng cấp sandbox: ${err.message || 'Thất bại'}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const copyTransferMemo = () => {
    if (checkoutData?.qrData?.transferMemo || checkoutData?.orderCode) {
      navigator.clipboard.writeText(checkoutData.qrData?.transferMemo || checkoutData.orderCode);
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xl p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl max-w-4xl w-full p-4 sm:p-6 lg:p-7 shadow-2xl relative flex flex-col max-h-[94dvh] overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 sm:pb-4 mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 sm:gap-2.5">
              <span>{selectedItem ? (language === 'vi' ? 'Thanh Toán Gói Hạn Ngạch' : 'Checkout & Activation') : (language === 'vi' ? 'Nâng Cấp Hạn Ngạch Thinking OS' : 'Upgrade Thinking OS Quota')}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                v16.0
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5 sm:mt-1">
              {selectedItem
                ? (language === 'vi'
                    ? 'Quét mã VietQR Napas247 hoặc chọn cổng thanh toán để tự động kích hoạt gói tức thì.'
                    : 'Scan VietQR or select payment gateway for instant server-authoritative fulfillment.')
                : (language === 'vi'
                    ? 'Hạn ngạch phục vụ các phiên tranh biện AI đa lượt, phân tích phản biện và luyện giọng nói.'
                    : 'Allocated quotas for multi-turn AI debate sparring, speech DSP analysis, and logic coaching.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* VIEW 1: CHECKOUT VIEW */}
        {selectedItem ? (
          <div className="overflow-y-auto pr-1 py-1 space-y-5">
            {fulfillmentSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-3">
                <div className="text-4xl">🎉</div>
                <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedItem.type === 'PLAN' ? 'Nâng Cấp Gói Thành Công!' : 'Nạp Gói Bổ Sung Thành Công!'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Gói <strong>{selectedItem.name}</strong> đã được kích hoạt thành công. Hạn ngạch mới đã sẵn sàng trong tài khoản của bạn.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
                >
                  Bắt Đầu Đấu Luyện Ngay
                </button>
              </div>
            ) : (
              <>
                {/* Gateway Selector Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleSwitchProvider('SEPAY')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      provider === 'SEPAY'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>🏦 Chuyển khoản VietQR (SePAY)</span>
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleSwitchProvider('VNPAY')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      provider === 'VNPAY'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>💳 Cổng VNPay</span>
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleSwitchProvider('MOMO')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      provider === 'MOMO'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>📱 Ví MoMo</span>
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleSwitchProvider('SANDBOX')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                      provider === 'SANDBOX'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-900 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <span>⚡ Sandbox Nhanh</span>
                  </button>
                </div>

                {checkoutLoading ? (
                  <div className="py-12 text-center text-xs text-slate-500 animate-pulse">Đang khởi tạo cổng thanh toán...</div>
                ) : provider === 'SEPAY' && checkoutData?.qrData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <img
                        src={checkoutData.qrData.qrImageUrl}
                        alt="VietQR Payment"
                        className="w-56 h-56 rounded-lg shadow-sm"
                      />
                      <p className="text-[10px] text-slate-500 mt-2 font-mono">Quét mã bằng app ngân hàng / Mobile Banking</p>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-slate-500">Mặt hàng:</span>
                        <span className="font-bold">{selectedItem.name}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-slate-500">Ngân hàng:</span>
                        <span className="font-bold">{checkoutData.qrData.bankName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-slate-500">Số tài khoản:</span>
                        <span className="font-mono font-bold">{checkoutData.qrData.accountNumber}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <span className="font-bold uppercase">{checkoutData.qrData.accountName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="text-slate-500">Số tiền:</span>
                        <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {Number(checkoutData.amountVnd).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex justify-between items-center bg-indigo-50/70 dark:bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                        <div>
                          <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block font-medium">Nội dung chuyển khoản (bắt buộc):</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{checkoutData.qrData.transferMemo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={copyTransferMemo}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold"
                        >
                          {copiedMemo ? '✓ Đã chép' : 'Sao chép'}
                        </button>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={checkoutLoading}
                          onClick={handleSandboxSimulate}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md disabled:opacity-50"
                        >
                          ✓ Xác Nhận Đã Chuyển Khoản (Simulate)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(null)}
                          className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                        >
                          Quay lại
                        </button>
                      </div>
                    </div>
                  </div>
                ) : provider === 'SANDBOX' ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
                    <h4 className="text-base font-bold text-amber-700 dark:text-amber-400">Môi Trường Sandbox Thử Nghiệm</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                      Kích hoạt ngay <strong>{selectedItem.name}</strong> không cần thực hiện giao dịch tiền thật (Dành cho Development & Verification).
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={handleSandboxSimulate}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50"
                      >
                        ⚡ Kích Hoạt Tức Thì (Sandbox)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                      >
                        Quay lại
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                    <h4 className="text-base font-bold">Chuyển hướng đến cổng thanh toán {provider}</h4>
                    <p className="text-xs text-slate-500">Mã đơn hàng: <span className="font-mono font-bold">{checkoutData?.orderCode}</span></p>
                    <div className="flex justify-center gap-3">
                      {checkoutData?.checkoutUrl && (
                        <a
                          href={checkoutData.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs inline-block shadow-lg"
                        >
                          Mở Cổng Thanh Toán →
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={handleSandboxSimulate}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                      >
                        Mô Phỏng Thành Công
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs"
                      >
                        Quay lại
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* VIEW 2: PRODUCT SELECTOR */
          <>
            {/* Category Switcher: Subscription Plans vs Credit Packs vs VIP Passes */}
            <div className="flex justify-center mb-4">
              <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPricingCategory('SUBSCRIPTION')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    pricingCategory === 'SUBSCRIPTION'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {language === 'vi' ? '💎 Gói Hội Viên' : '💎 Subscriptions'}
                </button>
                <button
                  type="button"
                  onClick={() => setPricingCategory('CREDIT_PACK')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    pricingCategory === 'CREDIT_PACK'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{language === 'vi' ? '⚡ Gói Nạp Lẻ' : '⚡ Add-ons'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPricingCategory('VIP')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    pricingCategory === 'VIP'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200'
                  }`}
                >
                  <span>👑 {language === 'vi' ? 'Vé VIP Không Giới Hạn' : 'VIP Pass'}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 uppercase tracking-tight shadow-sm">
                    {language === 'vi' ? 'Hot' : 'Hot'}
                  </span>
                </button>
              </div>
            </div>

            {/* Current Balance Overview */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 dark:text-slate-400 font-semibold">{language === 'vi' ? 'Số dư hạn ngạch hiện tại:' : 'Current Quota Balance:'}</div>
              <div className="flex items-center gap-3 font-mono font-bold">
                <span className="text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/20">
                  {user?.quota?.textTurnsRemaining ?? 20} {language === 'vi' ? 'Lượt Text' : 'Text Turns'}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                  {user?.quota?.voiceMinsRemaining ?? 15} {language === 'vi' ? 'Phút Voice' : 'Voice Mins'}
                </span>
                <span className="text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-500/20">
                  {user?.quota?.assistantRemaining ?? 10} {language === 'vi' ? 'Trợ Lý' : 'Assistant Questions'}
                </span>
              </div>
            </div>

            {pricingCategory === 'SUBSCRIPTION' ? (
              <>
                {/* Dual-Cycle Billing Selector */}
                <div className="flex justify-center mb-4">
                  <div className="bg-slate-100 dark:bg-slate-900/90 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        billingCycle === 'monthly'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {language === 'vi' ? 'Hàng tháng' : 'Monthly'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        billingCycle === 'yearly'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{language === 'vi' ? 'Hàng năm' : 'Yearly'}</span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-tight shadow-sm">
                        {language === 'vi' ? '-25%' : '-25%'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plans Grid (Strictly 3 Core Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto pr-1 py-1">
                  {displayPlans.map((plan) => {
                    const isPopular = Boolean(plan.isPopular) || Boolean(plan.is_popular);
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-5 flex flex-col justify-between transition-all relative ${
                          isPopular
                            ? 'bg-indigo-50/80 dark:bg-slate-900/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/15 md:-translate-y-1'
                            : 'bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        <div>
                          {isPopular ? (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">{language === 'vi' ? 'Khuyên Dùng' : 'Recommended'}</span>
                              <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md shadow-indigo-600/30">
                                {language === 'vi' ? 'Phổ Biến' : 'Popular'}
                              </span>
                            </div>
                          ) : (
                            <div className="h-5 mb-2" />
                          )}

                          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h4>
                          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mb-3">
                            {language === 'vi' ? Number(plan.priceVnd).toLocaleString('vi-VN') : Number(plan.priceVnd).toLocaleString('en-US')}{' '}
                            <span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal">
                              {language === 'vi' ? (billingCycle === 'yearly' ? 'VNĐ / năm' : 'VNĐ / tháng') : (billingCycle === 'yearly' ? 'VND / yr' : 'VND / mo')}
                            </span>
                          </div>

                          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 mb-5 border-t border-slate-200 dark:border-slate-800/80 pt-3">
                            {plan.features && plan.features.length > 0 ? (
                              plan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                                  <span>{feat}</span>
                                </li>
                              ))
                            ) : (
                              <>
                                <li className="flex items-center gap-2">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                                  <span><strong>{plan.textTurnsQuota}</strong> {language === 'vi' ? 'lượt tranh biện văn bản' : 'text debate turns'}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                                  <span><strong>{plan.voiceMinsQuota}</strong> {language === 'vi' ? 'phút phát biểu giọng nói' : 'minutes Voice AI'}</span>
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                                  <span><strong>{plan.assistantQuota}</strong> {language === 'vi' ? 'câu hỏi cố vấn tư duy' : 'assistant questions'}</span>
                                </li>
                              </>
                            )}
                          </ul>
                        </div>

                        <button
                          type="button"
                          disabled={checkoutLoading}
                          onClick={() => handleStartCheckout({
                            id: plan.id,
                            type: 'PLAN',
                            name: plan.name,
                            priceVnd: plan.priceVnd,
                            durationDays: plan.durationDays ?? 30,
                            features: plan.features,
                            isPopular,
                          })}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                            isPopular
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                              : 'bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <span>{language === 'vi' ? 'Đăng Ký Ngay' : 'Select & Upgrade'}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : pricingCategory === 'CREDIT_PACK' ? (
              /* CREDIT PACKS GRID (Active 4 Catalog Items) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-1 py-1">
                {creditPacks.map((pack) => {
                  const isVoice = pack.dimension === 'voice';
                  const isText = pack.dimension === 'text';

                  const badgeColor = isVoice
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : isText
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30';

                  return (
                    <div
                      key={pack.code}
                      className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                            {pack.dimension.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">Hạn 30 ngày</span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{pack.display_name}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                          {language === 'vi' ? pack.description_vi : pack.description_en}
                        </p>

                        <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mb-4">
                          {Number(pack.list_price_vnd).toLocaleString('vi-VN')} đ
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={() => handleStartCheckout({
                          id: pack.code,
                          type: 'CREDIT_PACK',
                          name: pack.display_name,
                          priceVnd: pack.list_price_vnd,
                          durationDays: pack.duration_days ?? 30,
                          dimension: pack.dimension,
                          units: pack.units,
                          description: pack.description_vi,
                        })}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                      >
                        <span>{language === 'vi' ? 'Nạp Gói Này' : 'Buy Pack'}</span>
                        <span>→</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIP PASSES GRID (Phase C1-B VIP Commercialization) */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-1 py-1">
                {vipPasses.map((vip) => {
                  const isHero = vip.code === 'VIP_3D';
                  return (
                    <div
                      key={vip.code}
                      className={`rounded-2xl p-4 flex flex-col justify-between transition-all relative ${
                        isHero
                          ? 'bg-amber-500/10 dark:bg-amber-500/10 border-2 border-amber-500 shadow-xl shadow-amber-500/10 sm:-translate-y-1'
                          : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-amber-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            {vip.duration_days} {language === 'vi' ? 'NGÀY' : 'DAYS'}
                          </span>
                          {isHero && (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              {language === 'vi' ? 'Chiến Dịch' : 'Campaign'}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{vip.display_name}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                          {language === 'vi' ? vip.description_vi : vip.description_en}
                        </p>

                        <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mb-3">
                          {Number(vip.list_price_vnd).toLocaleString('vi-VN')} đ
                        </div>

                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2 mb-3">
                          <li className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                            <span>👑</span>
                            <span>{language === 'vi' ? 'Không trừ lượt Text / Voice' : 'Zero quota deduction'}</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span>⏱️</span>
                            <span>{language === 'vi' ? 'Tối đa 15 phút / phiên Voice' : 'Max 15 mins per voice session'}</span>
                          </li>
                        </ul>
                      </div>

                      <button
                        type="button"
                        disabled={checkoutLoading}
                        onClick={() => handleStartCheckout({
                          id: vip.code,
                          type: 'VIP',
                          name: vip.display_name,
                          priceVnd: vip.list_price_vnd,
                          durationDays: vip.duration_days,
                          description: vip.description_vi,
                          isPopular: isHero,
                        })}
                        className={`w-full py-2 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer ${
                          isHero
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-amber-500/20'
                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                        }`}
                      >
                        <span>{language === 'vi' ? 'Kích Hoạt VIP' : 'Get VIP Pass'}</span>
                        <span>→</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Disclaimer Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                🛡️ Chế độ VIP Pass không tiêu hao số dư trong ví. Gói nạp lẻ tự động trừ theo nguyên tắc FEFO (gói hết hạn sớm nhất dùng trước).
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PricingModal;
