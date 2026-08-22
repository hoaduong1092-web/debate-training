/**
 * Business plan & quota registry (domain layer).
 *
 * Plan names / prices (Blueprint §05 / docs/02_DOMAIN_SPEC.md §5.3):
 * - COMPETITION_7D: 29.000 VNĐ / 7 ngày
 * - BASIC: 49.000 VNĐ / 30 ngày
 * - STANDARD: 129.000 VNĐ / 30 ngày
 * - PREMIUM: 399.000 VNĐ / 30 ngày
 *
 * Entitlements — Configurable Quota Baseline v1.1.0
 * (docs/16_PLAN_QUOTA_BUSINESS_SPEC.md §4 / §8):
 * - COMPETITION_7D: text 5,  voice 2,  assistant 2
 * - BASIC:          text 8,  voice 3,  assistant 2
 * - STANDARD:       text 20, voice 10, assistant 8
 * - PREMIUM:        text 50, voice 30, assistant 25
 *
 * Unit definitions:
 * - 1 text      = 1 Text Debate Session (≤20 turns)
 * - 1 voice     = 1 Voice Debate Session (≤15 mins)
 * - 1 assistant = 1 Assistant Draft/Report
 *
 * Action aliases (case-insensitive):
 * - TEXT_DEBATE, VOICE_DEBATE, AUDIO_DEBATE, ASSISTANT_DRAFT
 *
 * Credit Pack Add-ons (FEFO — First Expired, First Out):
 * - PACK_VOICE_5  (+5 voice units, 30 days)
 * - PACK_VOICE_10 (+10 voice units, 30 days)
 * - PACK_TEXT_10  (+10 text units, 30 days)
 * - PACK_ASST_5   (+5 assistant units, 30 days)
 *
 * This module NEVER imports pricingRegistry / costCalculator / token rates.
 */

export type PlanCode =
  | 'BASIC_MONTHLY'
  | 'BASIC_YEARLY'
  | 'STANDARD_MONTHLY'
  | 'STANDARD_YEARLY'
  | 'PREMIUM_MONTHLY'
  | 'PREMIUM_YEARLY';

export type CreditPackCode =
  | 'PACK_VOICE_15'
  | 'PACK_VOICE_60'
  | 'PACK_TEXT_10'
  | 'PACK_ASST_5';

export type VipPassCode =
  | 'VIP_1D'
  | 'VIP_3D'
  | 'VIP_7D'
  | 'VIP_30D';

export type TeamBundleCode =
  | 'TEAM_3_SPRINT'
  | 'TEAM_3_STANDARD'
  | 'TEAM_5_WSDC'
  | 'SCHOOL_10_STANDARD';

/**
 * Standardized Usage Dimensions across Domain, Database, and UI:
 * - text: Text debate sessions
 * - voice: Voice debate sessions (audio dimension alias)
 * - assistant: Assistant drafts and reports
 */
export type QuotaDimension = 'text' | 'voice' | 'assistant';

/**
 * Business action aliases that map 1:1 onto QuotaDimension.
 * Controllers may pass either form into quotaManager.
 */
export type QuotaActionType =
  | QuotaDimension
  | 'audio'
  | 'textDebate'
  | 'voiceDebate'
  | 'audioDebate'
  | 'assistantDraft';

/**
 * Per-dimension period limits (units defined above).
 * Canonical dimension: voice (audio provided as backward-compatible alias).
 */
export interface PlanQuotaLimits {
  text: number;
  voice: number;
  assistant: number;
  /** Backward-compatible alias for voice. */
  audio?: number;
}

export interface PlanDefinition {
  code: PlanCode;
  displayName: string;
  /** Illustrative list price from Blueprint / Spec 16 (VNĐ). */
  listPriceVnd: number;
  /** Validity duration in days (30 for monthly plans, 365 for yearly plans). */
  durationDays: number;
  /** Canonical dimension limits. */
  limits: PlanQuotaLimits;
  /** Business-spec aliases (same numbers as limits). */
  textDebateQuota: number;
  voiceDebateQuota: number;
  /** Backward-compatible alias for voiceDebateQuota */
  audioDebateQuota: number;
  assistantDraftQuota: number;
}

export interface CreditPackDefinition {
  code: CreditPackCode;
  displayName: string;
  listPriceVnd: number;
  durationDays: number;
  dimension: QuotaDimension;
  units: number;
  descriptionVi: string;
  descriptionEn: string;
}

export interface VipPassDefinition {
  code: VipPassCode;
  displayName: string;
  listPriceVnd: number;
  durationDays: number;
  descriptionVi: string;
  descriptionEn: string;
}

export interface TeamBundleDefinition {
  code: TeamBundleCode;
  displayName: string;
  listPriceVnd: number;
  seats: number;
  targetPlan: PlanCode;
  durationDays: number;
  descriptionVi: string;
  descriptionEn: string;
}

const PLAN_ORDER: PlanCode[] = [
  'BASIC_MONTHLY',
  'BASIC_YEARLY',
  'STANDARD_MONTHLY',
  'STANDARD_YEARLY',
  'PREMIUM_MONTHLY',
  'PREMIUM_YEARLY',
];
const PACK_ORDER: CreditPackCode[] = [
  'PACK_VOICE_15',
  'PACK_VOICE_60',
  'PACK_TEXT_10',
  'PACK_ASST_5',
];
const VIP_ORDER: VipPassCode[] = [
  'VIP_1D',
  'VIP_3D',
  'VIP_7D',
  'VIP_30D',
];
const TEAM_BUNDLE_ORDER: TeamBundleCode[] = [
  'TEAM_3_SPRINT',
  'TEAM_3_STANDARD',
  'SCHOOL_10_STANDARD',
];

/** Canonical Dual-Cycle Commerce Registry (Aligned with DB Source of Truth & Spec 16). */
const PLAN_REGISTRY: Record<PlanCode, PlanDefinition> = {
  BASIC_MONTHLY: {
    code: 'BASIC_MONTHLY',
    displayName: 'Cơ Bản (Khám Phá)',
    listPriceVnd: 49_000,
    durationDays: 30,
    limits: { text: 30, voice: 15, audio: 15, assistant: 10 },
    textDebateQuota: 30,
    voiceDebateQuota: 15,
    audioDebateQuota: 15,
    assistantDraftQuota: 10,
  },
  BASIC_YEARLY: {
    code: 'BASIC_YEARLY',
    displayName: 'Cơ Bản (Khám Phá)',
    listPriceVnd: 490_000,
    durationDays: 365,
    limits: { text: 360, voice: 180, audio: 180, assistant: 120 },
    textDebateQuota: 360,
    voiceDebateQuota: 180,
    audioDebateQuota: 180,
    assistantDraftQuota: 120,
  },
  STANDARD_MONTHLY: {
    code: 'STANDARD_MONTHLY',
    displayName: 'Tiêu Chuẩn (Rèn Luyện)',
    listPriceVnd: 129_000,
    durationDays: 30,
    limits: { text: 100, voice: 60, audio: 60, assistant: 50 },
    textDebateQuota: 100,
    voiceDebateQuota: 60,
    audioDebateQuota: 60,
    assistantDraftQuota: 50,
  },
  STANDARD_YEARLY: {
    code: 'STANDARD_YEARLY',
    displayName: 'Tiêu Chuẩn (Rèn Luyện)',
    listPriceVnd: 1_190_000,
    durationDays: 365,
    limits: { text: 1200, voice: 720, audio: 720, assistant: 600 },
    textDebateQuota: 1200,
    voiceDebateQuota: 720,
    audioDebateQuota: 720,
    assistantDraftQuota: 600,
  },
  PREMIUM_MONTHLY: {
    code: 'PREMIUM_MONTHLY',
    displayName: 'Cao Cấp (Bứt Phá)',
    listPriceVnd: 399_000,
    durationDays: 30,
    limits: { text: 500, voice: 300, audio: 300, assistant: 200 },
    textDebateQuota: 500,
    voiceDebateQuota: 300,
    audioDebateQuota: 300,
    assistantDraftQuota: 200,
  },
  PREMIUM_YEARLY: {
    code: 'PREMIUM_YEARLY',
    displayName: 'Cao Cấp (Bứt Phá)',
    listPriceVnd: 3_590_000,
    durationDays: 365,
    limits: { text: 6000, voice: 3600, audio: 3600, assistant: 2400 },
    textDebateQuota: 6000,
    voiceDebateQuota: 3600,
    audioDebateQuota: 3600,
    assistantDraftQuota: 2400,
  },
};

/** Credit Packs / Add-ons catalog per Spec 16 v1.1.0 & VOICE_QUOTA_CONTRACT_v1.0 §11. */
const CREDIT_PACK_REGISTRY: Record<CreditPackCode, CreditPackDefinition> = {
  PACK_VOICE_15: {
    code: 'PACK_VOICE_15',
    displayName: 'Voice Boost 15',
    listPriceVnd: 15_000,
    durationDays: 30,
    dimension: 'voice',
    units: 15,
    descriptionVi: '+15 phút Voice AI (tối đa 15 phút/phiên)',
    descriptionEn: '+15 Voice AI minutes (max 15 mins/session)',
  },
  PACK_VOICE_60: {
    code: 'PACK_VOICE_60',
    displayName: 'Voice Boost 60',
    listPriceVnd: 49_000,
    durationDays: 30,
    dimension: 'voice',
    units: 60,
    descriptionVi: '+60 phút Voice AI (tối đa 15 phút/phiên)',
    descriptionEn: '+60 Voice AI minutes (max 15 mins/session)',
  },
  PACK_TEXT_10: {
    code: 'PACK_TEXT_10',
    displayName: 'Text Boost 10',
    listPriceVnd: 19_000,
    durationDays: 30,
    dimension: 'text',
    units: 10,
    descriptionVi: '+10 phiên Text Debate (tối đa 20 turns/phiên)',
    descriptionEn: '+10 Text Debate sessions (max 20 turns/session)',
  },
  PACK_ASST_5: {
    code: 'PACK_ASST_5',
    displayName: 'Assistant Boost 5',
    listPriceVnd: 15_000,
    durationDays: 30,
    dimension: 'assistant',
    units: 5,
    descriptionVi: '+5 lượt tạo Bản thảo / Báo cáo kiến nghị',
    descriptionEn: '+5 Speech Draft / Motion Report generations',
  },
};

/** VIP Time-Based Unlimited Access Catalog per VOICE_QUOTA_CONTRACT_v1.0 §10 & Phase C1. */
const VIP_REGISTRY: Record<VipPassCode, VipPassDefinition> = {
  VIP_1D: {
    code: 'VIP_1D',
    displayName: 'VIP Pass 1 Ngày',
    listPriceVnd: 19_000,
    durationDays: 1,
    descriptionVi: 'Không giới hạn quota trong 24 giờ (tối đa 15 phút/phiên)',
    descriptionEn: 'Unlimited quota sparring for 24 hours (max 15 mins/session)',
  },
  VIP_3D: {
    code: 'VIP_3D',
    displayName: 'VIP Pass 3 Ngày (Chiến Dịch)',
    listPriceVnd: 49_000,
    durationDays: 3,
    descriptionVi: 'Không giới hạn quota trong 72 giờ (tối đa 15 phút/phiên)',
    descriptionEn: 'Unlimited quota sparring for 72 hours (max 15 mins/session)',
  },
  VIP_7D: {
    code: 'VIP_7D',
    displayName: 'VIP Pass 7 Ngày',
    listPriceVnd: 89_000,
    durationDays: 7,
    descriptionVi: 'Không giới hạn quota trong 7 ngày (tối đa 15 phút/phiên)',
    descriptionEn: 'Unlimited quota sparring for 7 days (max 15 mins/session)',
  },
  VIP_30D: {
    code: 'VIP_30D',
    displayName: 'VIP Pass 30 Ngày',
    listPriceVnd: 199_000,
    durationDays: 30,
    descriptionVi: 'Không giới hạn quota trong 30 ngày (tối đa 15 phút/phiên)',
    descriptionEn: 'Unlimited quota sparring for 30 days (max 15 mins/session)',
  },
};

/** Team Pass & School Bundles catalog per Spec 16 v1.2.0 Phase 2. */
const TEAM_BUNDLE_REGISTRY: Record<TeamBundleCode, TeamBundleDefinition> = {
  TEAM_3_SPRINT: {
    code: 'TEAM_3_SPRINT',
    displayName: 'Gói Đội thi Sprint 3 Người',
    listPriceVnd: 79_000,
    seats: 3,
    targetPlan: 'BASIC_MONTHLY',
    durationDays: 7,
    descriptionVi: 'Dành cho đội thi 3 người (7 ngày, 30 Text / 15 Voice / 10 Assistant mỗi người)',
    descriptionEn: 'For 3-member team (7 days, 30 Text / 15 Voice / 10 Assistant each)',
  },
  TEAM_3_STANDARD: {
    code: 'TEAM_3_STANDARD',
    displayName: 'Gói Đội thi Chuẩn 3 Người',
    listPriceVnd: 299_000,
    seats: 3,
    targetPlan: 'STANDARD_MONTHLY',
    durationDays: 30,
    descriptionVi: 'Dành cho đội thi 3 người (30 ngày, 100 Text / 60 Voice / 50 Assistant mỗi người)',
    descriptionEn: 'For 3-member team (30 days, 100 Text / 60 Voice / 50 Assistant each)',
  },
  TEAM_5_WSDC: {
    code: 'TEAM_5_WSDC',
    displayName: 'Gói Đội tuyển WSDC (5 bạn)',
    listPriceVnd: 469_000,
    seats: 5,
    targetPlan: 'STANDARD_MONTHLY',
    durationDays: 30,
    descriptionVi: 'Dành cho đội tuyển WSDC 5 người (30 ngày, 3 ra sân + 2 dự bị/research, 100 Text / 60 Voice / 50 Assistant mỗi người)',
    descriptionEn: 'For 5-member WSDC team (30 days, 3 main + 2 subs/researchers, 100 Text / 60 Voice / 50 Assistant each)',
  },
  SCHOOL_10_STANDARD: {
    code: 'SCHOOL_10_STANDARD',
    displayName: 'Gói Trường học / CLB 10 Ghế',
    listPriceVnd: 890_000,
    seats: 10,
    targetPlan: 'STANDARD_MONTHLY',
    durationDays: 30,
    descriptionVi: 'Dành cho CLB / Trường học 10 thành viên (30 ngày, 100 Text / 60 Voice / 50 Assistant mỗi người)',
    descriptionEn: 'For School / Club with 10 members (30 days, 100 Text / 60 Voice / 50 Assistant each)',
  },
};

export function listPlanCodes(): PlanCode[] {
  return [...PLAN_ORDER];
}

export function listCreditPackCodes(): CreditPackCode[] {
  return [...PACK_ORDER];
}

export function listVipPassCodes(): VipPassCode[] {
  return [...VIP_ORDER];
}

export function listTeamBundleCodes(): TeamBundleCode[] {
  return [...TEAM_BUNDLE_ORDER];
}

export function getPlanDefinition(plan: PlanCode): PlanDefinition {
  return PLAN_REGISTRY[plan];
}

export function getCreditPackDefinition(pack: CreditPackCode): CreditPackDefinition {
  return CREDIT_PACK_REGISTRY[pack];
}

export function getVipPassDefinition(vip: VipPassCode): VipPassDefinition {
  return VIP_REGISTRY[vip];
}

export function getTeamBundleDefinition(bundle: TeamBundleCode): TeamBundleDefinition {
  return TEAM_BUNDLE_REGISTRY[bundle];
}

export function getPlanQuotaLimits(plan: PlanCode): PlanQuotaLimits {
  const def = PLAN_REGISTRY[plan];
  return {
    text: def.limits.text,
    voice: def.limits.voice,
    audio: def.limits.audio ?? def.limits.voice,
    assistant: def.limits.assistant,
  };
}

/**
 * Normalizes free-form plan labels to PlanCode.
 * Returns null for unknown labels — does not invent a default plan.
 */
export function parsePlanCode(raw: string | null | undefined): PlanCode | null {
  if (raw == null) return null;
  const key = raw.trim().toUpperCase();

  // Exact Canonical Matches
  if (
    key === 'BASIC_MONTHLY' ||
    key === 'BASIC_YEARLY' ||
    key === 'STANDARD_MONTHLY' ||
    key === 'STANDARD_YEARLY' ||
    key === 'PREMIUM_MONTHLY' ||
    key === 'PREMIUM_YEARLY'
  ) {
    return key;
  }

  // Monthly Aliases / Legacy Boundary Normalization
  if (key === 'BASIC' || key === 'PLAN_BASIC_49K' || key === 'BASIC_49K') {
    return 'BASIC_MONTHLY';
  }
  if (key === 'STANDARD' || key === 'PLAN_STD_129K' || key === 'STD_129K' || key === 'STD') {
    return 'STANDARD_MONTHLY';
  }
  if (key === 'PREMIUM' || key === 'PLAN_PRO_399K' || key === 'PRO_399K' || key === 'PRO') {
    return 'PREMIUM_MONTHLY';
  }

  // Yearly Aliases
  if (key === 'BASIC_YEAR' || key === 'BASIC_ANNUAL' || key === 'BASIC_365') {
    return 'BASIC_YEARLY';
  }
  if (key === 'STANDARD_YEAR' || key === 'STANDARD_ANNUAL' || key === 'STANDARD_365' || key === 'STD_YEAR') {
    return 'STANDARD_YEARLY';
  }
  if (key === 'PREMIUM_YEAR' || key === 'PREMIUM_ANNUAL' || key === 'PREMIUM_365' || key === 'PRO_YEAR') {
    return 'PREMIUM_YEARLY';
  }

  return null;
}

export function parseCreditPackCode(raw: string | null | undefined): CreditPackCode | null {
  if (raw == null) return null;
  const key = raw.trim().toUpperCase();
  if (
    key === 'PACK_VOICE_15' ||
    key === 'PACK_VOICE_60' ||
    key === 'PACK_TEXT_10' ||
    key === 'PACK_ASST_5'
  ) {
    return key;
  }
  return null;
}

export function parseVipPassCode(raw: string | null | undefined): VipPassCode | null {
  if (raw == null) return null;
  const key = raw.trim().toUpperCase();
  if (
    key === 'VIP_1D' ||
    key === 'VIP_3D' ||
    key === 'VIP_7D' ||
    key === 'VIP_30D'
  ) {
    return key;
  }
  if (key === 'VIP_1' || key === 'VIP_1DAY' || key === 'VIP_24H') return 'VIP_1D';
  if (key === 'VIP_3' || key === 'VIP_3DAYS' || key === 'VIP_72H') return 'VIP_3D';
  if (key === 'VIP_7' || key === 'VIP_7DAYS' || key === 'VIP_WEEK') return 'VIP_7D';
  if (key === 'VIP_30' || key === 'VIP_30DAYS' || key === 'VIP_MONTH') return 'VIP_30D';
  return null;
}

export function parseTeamBundleCode(raw: string | null | undefined): TeamBundleCode | null {
  if (raw == null) return null;
  const key = raw.trim().toUpperCase();
  if (
    key === 'TEAM_3_SPRINT' ||
    key === 'TEAM_3_STANDARD' ||
    key === 'TEAM_5_WSDC' ||
    key === 'SCHOOL_10_STANDARD'
  ) {
    return key;
  }
  return null;
}

export function isQuotaDimension(value: string): value is QuotaDimension {
  return value === 'text' || value === 'voice' || value === 'audio' || value === 'assistant';
}

/**
 * Maps business action names onto the three standardized quota dimensions (text, voice, assistant).
 * Unknown actions return null (caller fails closed).
 */
export function resolveQuotaDimension(
  actionType: string,
): QuotaDimension | null {
  const key = actionType.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (
    key === 'TEXT' ||
    key === 'TEXT_DEBATE' ||
    key === 'TEXTDEBATE' ||
    key === 'TEXT_DEBATE_CREDIT'
  ) {
    return 'text';
  }
  if (
    key === 'VOICE' ||
    key === 'VOICE_DEBATE' ||
    key === 'VOICEDEBATE' ||
    key === 'VOICE_DEBATE_CREDIT' ||
    key === 'AUDIO' ||
    key === 'AUDIO_DEBATE' ||
    key === 'AUDIODEBATE' ||
    key === 'AUDIO_DEBATE_CREDIT'
  ) {
    return 'voice';
  }
  if (
    key === 'ASSISTANT' ||
    key === 'ASSISTANT_DRAFT' ||
    key === 'ASSISTANTDRAFT' ||
    key === 'ASSISTANT_CREDIT'
  ) {
    return 'assistant';
  }
  return null;
}

