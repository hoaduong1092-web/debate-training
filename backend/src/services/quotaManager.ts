/**
 * Persistent subscription & quota manager (domain layer) - v15.0.0.
 *
 * Dynamic DB-Driven Model:
 * - Subscription Plans (SubscriptionPlan): configured dynamically in database
 * - User Subscriptions (UserSubscription): period entitlements (ACTIVE, EXPIRED, CANCELLED)
 * - User Quotas (UserQuota): atomic conditional decrement on user_quotas
 *
 * Consumption Priority Engine:
 * 1. Priority 1 (Subscription Quota): Atomic conditional decrement on UserQuota
 * 2. Reject: QUOTA_EXCEEDED (HTTP 403)
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  getPlanDefinition,
  getPlanQuotaLimits,
  parsePlanCode,
  resolveQuotaDimension,
  getCreditPackDefinition,
  parseCreditPackCode,
  getVipPassDefinition,
  parseVipPassCode,
  type PlanCode,
  type PlanQuotaLimits,
  type QuotaDimension,
  type CreditPackCode,
  type VipPassCode,
} from './planQuotaRegistry';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export type QuotaDecision = 'ALLOW' | 'QUOTA_EXCEEDED';

export type QuotaSource = 'SUBSCRIPTION' | 'CREDIT_PACK';

export type QuotaDomainErrorCode =
  | 'QUOTA_UNDEFINED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_AMOUNT'
  | 'INVALID_DIMENSION'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_INACTIVE'
  | 'SUBSCRIPTION_MISSING'
  | 'PLAN_INVALID'
  | 'CREDIT_PACK_INVALID';

export interface QuotaDomainError {
  code: QuotaDomainErrorCode;
  message: string;
}

export interface DimensionBalance {
  /** Quota entitlement limit for current subscription period (null if no active sub). */
  subscriptionLimit: number | null;
  /** Remaining quota in current subscription period. */
  subscriptionRemaining: number | null;
  /** Remaining quota in active credit packs. */
  creditPackRemaining: number;
  /** Combined available units right now. */
  totalAvailable: number;
  /** Alias for backward compatibility. */
  limit: number | null;
  /** Alias for backward compatibility. */
  remaining: number | null;
}

export interface ActiveCreditPackInfo {
  id: string;
  packCode: string;
  dimension: QuotaDimension;
  totalUnits: number;
  remainingUnits: number;
  expiresAt: Date;
}

export interface UserQuotaStatus {
  userId: string;
  plan: PlanCode | null;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  usable: boolean;
  limits: PlanQuotaLimits | { text: null; voice: null; audio: null; assistant: null };
  balances: {
    text: DimensionBalance;
    voice: DimensionBalance;
    assistant: DimensionBalance;
    audio: DimensionBalance;
  };
  creditPacks: ActiveCreditPackInfo[];
  error: QuotaDomainError | null;
}

export interface QuotaCheckResult {
  decision: QuotaDecision | null;
  error: QuotaDomainError | null;
  dimension: QuotaDimension | null;
  remaining: number | null;
  totalAvailable: number;
  source: QuotaSource | null;
  amount: number;
  subscriptionId: string | null;
  quotaId: string | null;
}

export interface QuotaConsumeResult {
  decision: QuotaDecision | null;
  error: QuotaDomainError | null;
  dimension: QuotaDimension | null;
  amount: number;
  source: QuotaSource | null;
  remainingBefore: number | null;
  remainingAfter: number | null;
  persisted: boolean;
  subscriptionId: string | null;
  quotaId: string | null;
  creditPackId: string | null;
}

export interface ProvisionSubscriptionInput {
  userId: string;
  plan: PlanCode | string;
  status?: SubscriptionStatus | string;
  periodStart?: Date;
  periodEnd?: Date;
  replaceExisting?: boolean;
}

export interface ProvisionSubscriptionResult {
  subscriptionId: string;
  quotaId: string;
  plan: PlanCode | string;
  status: SubscriptionStatus | string;
  periodStart: Date;
  periodEnd: Date;
  limits: PlanQuotaLimits;
  remaining: PlanQuotaLimits;
}

export interface ProvisionCreditPackInput {
  userId: string;
  packCode: CreditPackCode | string;
  purchasedAt?: Date;
}

export interface ProvisionCreditPackResult {
  id: string;
  userId: string;
  packCode: CreditPackCode;
  dimension: QuotaDimension;
  totalUnits: number;
  remainingUnits: number;
  status: string;
  purchasedAt: Date;
  expiresAt: Date;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const REMAINING_COLUMN: Record<QuotaDimension, string> = {
  text: 'text_turns_remaining',
  voice: 'voice_mins_remaining',
  assistant: 'assistant_remaining',
};

// ─── Prisma client ───────────────────────────────────────────────────────────

const defaultPrisma = new PrismaClient();
let prismaRef: PrismaClient = defaultPrisma;

export function setQuotaPrismaClient(client: PrismaClient): void {
  prismaRef = client;
}

export function getQuotaPrismaClient(): PrismaClient {
  return prismaRef;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function err(code: QuotaDomainErrorCode, message: string): QuotaDomainError {
  return { code, message };
}

function emptyLimits(): { text: null; voice: null; audio: null; assistant: null } {
  return { text: null, voice: null, audio: null, assistant: null };
}

function normalizeAmount(amount: number | undefined): number | QuotaDomainError {
  const value = amount === undefined ? 1 : amount;
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    return err(
      'INVALID_AMOUNT',
      `Quota amount must be a positive integer (received ${String(amount)}).`,
    );
  }
  return value;
}

export function isSubscriptionUsable(
  sub: {
    status: string;
    expiresAt?: Date;
    expires_at?: Date;
  },
  now: Date = new Date(),
): boolean {
  const expires = sub.expiresAt ?? sub.expires_at ?? new Date(0);
  const endMs = new Date(expires).getTime();
  const t = now.getTime();
  switch (sub.status) {
    case 'ACTIVE':
    case 'TRIAL':
      return t < endMs;
    case 'CANCELLED':
      return t < endMs;
    case 'PAST_DUE':
      return t < endMs + PAST_DUE_GRACE_MS;
    case 'EXPIRED':
    default:
      return false;
  }
}

// ─── Provisioning ────────────────────────────────────────────────────────────

export async function provisionSubscription(
  input: ProvisionSubscriptionInput,
  txClient?: Prisma.TransactionClient,
): Promise<ProvisionSubscriptionResult> {
  const parsed = parsePlanCode(input.plan) ?? 'BASIC_MONTHLY';
  const planCode = parsed;

  const status = input.status ?? 'ACTIVE';
  const periodStart = input.periodStart ?? new Date();

  const executeProvision = async (tx: Prisma.TransactionClient) => {
    // Look up Plan in DB as Single Source of Truth
    let dbPlan = await tx.subscriptionPlan.findFirst({
      where: {
        OR: [
          { id: planCode },
          { id: input.plan },
        ],
      },
    });

    if (!dbPlan) {
      // Fallback to canonical BASIC_MONTHLY if not found
      dbPlan = await tx.subscriptionPlan.findFirst({
        where: { id: 'BASIC_MONTHLY' },
      });
    }

    const durationDays = dbPlan?.durationDays ?? 30;
    const durationMs = durationDays * 24 * 60 * 60 * 1000;
    const targetPlanId = dbPlan ? dbPlan.id : 'BASIC_MONTHLY';

    // Look up existing subscription to check for Same-Plan Early Renewal (C1-C Contract)
    const existingSub = await tx.userSubscription.findUnique({
      where: { userId: input.userId },
    });

    const now = input.periodStart ?? new Date();
    let periodStart = now;
    let periodEnd: Date;

    const isSamePlan = existingSub && existingSub.planId === targetPlanId;
    const isCurrentlyActive = existingSub && existingSub.status === 'ACTIVE' && existingSub.expiresAt > now;

    if (input.periodEnd) {
      // Explicit caller override
      periodEnd = input.periodEnd;
      if (input.periodStart) periodStart = input.periodStart;
    } else if (isSamePlan && isCurrentlyActive) {
      // C1-C LOCKED CONTRACT: Additive Extension on Same-Plan Early Renewal
      periodStart = existingSub.startedAt;
      periodEnd = new Date(existingSub.expiresAt.getTime() + durationMs);
    } else {
      // First purchase, expired plan, or tier switch
      periodStart = now;
      periodEnd = new Date(now.getTime() + durationMs);
    }

    const limits: PlanQuotaLimits = {
      text: dbPlan?.textTurnsQuota ?? 30,
      voice: dbPlan?.voiceMinsQuota ?? 15,
      audio: dbPlan?.voiceMinsQuota ?? 15,
      assistant: dbPlan?.assistantQuota ?? 10,
    };

    // Atomically upsert subscription (Preserves duration on early renewal)
    const subscription = await tx.userSubscription.upsert({
      where: { userId: input.userId },
      update: {
        planId: targetPlanId,
        status: status as string,
        startedAt: periodStart,
        expiresAt: periodEnd,
      },
      create: {
        userId: input.userId,
        planId: targetPlanId,
        status: status as string,
        startedAt: periodStart,
        expiresAt: periodEnd,
      },
    });

    // Atomically reset quota wallet according to new plan baseline (Replace Policy)
    const quota = await tx.userQuota.upsert({
      where: { userId: input.userId },
      update: {
        textTurnsRemaining: limits.text,
        voiceMinsRemaining: limits.voice,
        assistantRemaining: limits.assistant,
        lastResetAt: new Date(),
      },
      create: {
        userId: input.userId,
        textTurnsRemaining: limits.text,
        voiceMinsRemaining: limits.voice,
        assistantRemaining: limits.assistant,
      },
    });

    return { subscription, quota, limits, periodEnd, targetPlanId };
  };

  const result = txClient
    ? await executeProvision(txClient)
    : await prismaRef.$transaction(executeProvision);

  return {
    subscriptionId: result.subscription.id,
    quotaId: result.quota.id,
    plan: result.targetPlanId,
    status,
    periodStart,
    periodEnd: result.periodEnd,
    limits: result.limits,
    remaining: {
      text: result.quota.textTurnsRemaining,
      voice: result.quota.voiceMinsRemaining,
      audio: result.quota.voiceMinsRemaining,
      assistant: result.quota.assistantRemaining,
    },
  };
}

/**
 * Provisions a Credit Pack for a user (Phase B7).
 * Sets totalUnits, remainingUnits = totalUnits, status = ACTIVE, expiresAt = purchasedAt + 30 days.
 */
export async function provisionCreditPack(
  input: ProvisionCreditPackInput,
  txClient?: Prisma.TransactionClient,
): Promise<ProvisionCreditPackResult> {
  const parsed = parseCreditPackCode(input.packCode);
  if (!parsed) {
    throw new Error(`Invalid credit pack code: ${String(input.packCode)}`);
  }

  const def = getCreditPackDefinition(parsed);
  if (!def) {
    throw new Error(`Definition not found for credit pack: ${parsed}`);
  }

  const purchasedAt = input.purchasedAt ?? new Date();
  const durationMs = def.durationDays * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(purchasedAt.getTime() + durationMs);

  const executeProvision = async (tx: Prisma.TransactionClient) => {
    const pack = await tx.userCreditPack.create({
      data: {
        userId: input.userId,
        packCode: def.code,
        dimension: def.dimension,
        totalUnits: def.units,
        remainingUnits: def.units,
        status: 'ACTIVE',
        purchasedAt,
        expiresAt,
      },
    });

    return {
      id: pack.id,
      userId: pack.userId,
      packCode: pack.packCode as CreditPackCode,
      dimension: pack.dimension as QuotaDimension,
      totalUnits: pack.totalUnits,
      remainingUnits: pack.remainingUnits,
      status: pack.status,
      purchasedAt: pack.purchasedAt,
      expiresAt: pack.expiresAt,
    };
  };

  if (txClient) {
    return executeProvision(txClient);
  }
  return prismaRef.$transaction(executeProvision);
}

/**
 * Provisions a VIP Time Pass for a user (Phase C1).
 * TIME_UNLIMITED access mode for specified duration.
 * If user already has an active VIP pass, extends expiresAt additively.
 */
export interface ProvisionVipPassInput {
  userId: string;
  vipCode: string;
  purchasedAt?: Date;
}

export interface ProvisionVipPassResult {
  vipPassId: string;
  passCode: string;
  status: string;
  startedAt: Date;
  expiresAt: Date;
}

export async function provisionVipPass(
  input: ProvisionVipPassInput,
  txClient?: Prisma.TransactionClient,
): Promise<ProvisionVipPassResult> {
  const parsed = parseVipPassCode(input.vipCode);
  if (!parsed) {
    throw new Error(`Invalid VIP pass code: ${String(input.vipCode)}`);
  }

  const def = getVipPassDefinition(parsed);
  if (!def) {
    throw new Error(`Definition not found for VIP pass: ${parsed}`);
  }

  const purchasedAt = input.purchasedAt ?? new Date();
  const durationMs = def.durationDays * 24 * 60 * 60 * 1000;

  const executeProvision = async (tx: Prisma.TransactionClient) => {
    // Check for existing active VIP pass
    const activeVip = await tx.userVipPass.findFirst({
      where: {
        userId: input.userId,
        status: 'ACTIVE',
        expiresAt: { gt: purchasedAt },
      },
      orderBy: { expiresAt: 'desc' },
    });

    let startedAt = purchasedAt;
    let expiresAt: Date;

    if (activeVip) {
      // Additive extension on active VIP pass
      startedAt = activeVip.startedAt;
      expiresAt = new Date(activeVip.expiresAt.getTime() + durationMs);

      const updated = await tx.userVipPass.update({
        where: { id: activeVip.id },
        data: {
          expiresAt,
          passCode: def.code,
        },
      });

      return {
        vipPassId: updated.id,
        passCode: updated.passCode,
        status: updated.status,
        startedAt: updated.startedAt,
        expiresAt: updated.expiresAt,
      };
    } else {
      expiresAt = new Date(purchasedAt.getTime() + durationMs);
      const created = await tx.userVipPass.create({
        data: {
          userId: input.userId,
          passCode: def.code,
          status: 'ACTIVE',
          startedAt,
          expiresAt,
        },
      });

      return {
        vipPassId: created.id,
        passCode: created.passCode,
        status: created.status,
        startedAt: created.startedAt,
        expiresAt: created.expiresAt,
      };
    }
  };

  if (txClient) {
    return executeProvision(txClient);
  }
  return prismaRef.$transaction(executeProvision);
}

// ─── Status / check / consume ────────────────────────────────────────────────

export async function getUserQuotaStatus(
  userId: string,
  now: Date = new Date(),
): Promise<UserQuotaStatus> {
  const [sub, quota, activePacks] = await Promise.all([
    prismaRef.userSubscription.findUnique({
      where: { userId },
      include: { plan: true },
    }),
    prismaRef.userQuota.findUnique({
      where: { userId },
    }),
    prismaRef.userCreditPack.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: now },
        remainingUnits: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    }),
  ]);

  const textPackRemaining = activePacks
    .filter((p) => p.dimension === 'text')
    .reduce((sum, p) => sum + p.remainingUnits, 0);
  const voicePackRemaining = activePacks
    .filter((p) => p.dimension === 'voice')
    .reduce((sum, p) => sum + p.remainingUnits, 0);
  const assistantPackRemaining = activePacks
    .filter((p) => p.dimension === 'assistant')
    .reduce((sum, p) => sum + p.remainingUnits, 0);

  const creditPackInfos: ActiveCreditPackInfo[] = activePacks.map((p) => ({
    id: p.id,
    packCode: p.packCode,
    dimension: p.dimension as QuotaDimension,
    totalUnits: p.totalUnits,
    remainingUnits: p.remainingUnits,
    expiresAt: p.expiresAt,
  }));

  if (!sub || !isSubscriptionUsable({ status: sub.status, expiresAt: sub.expiresAt }, now)) {
    const error = sub
      ? err('SUBSCRIPTION_EXPIRED', `Subscription for user ${userId} is expired or inactive.`)
      : err('SUBSCRIPTION_MISSING', `No subscription found for user ${userId}.`);

    const textRemaining = quota?.textTurnsRemaining ?? 0;
    const voiceRemaining = quota?.voiceMinsRemaining ?? 0;
    const assistantRemaining = quota?.assistantRemaining ?? 0;

    const voiceBalance: DimensionBalance = {
      subscriptionLimit: null,
      subscriptionRemaining: voiceRemaining,
      creditPackRemaining: voicePackRemaining,
      totalAvailable: voiceRemaining + voicePackRemaining,
      limit: null,
      remaining: voiceRemaining + voicePackRemaining,
    };

    return {
      userId,
      plan: null,
      subscriptionId: sub?.id ?? null,
      subscriptionStatus: sub?.status ?? null,
      periodStart: sub?.startedAt ?? null,
      periodEnd: sub?.expiresAt ?? null,
      usable: (quota ? (textRemaining > 0 || voiceRemaining > 0 || assistantRemaining > 0) : false) || activePacks.length > 0,
      limits: emptyLimits(),
      balances: {
        text: {
          subscriptionLimit: null,
          subscriptionRemaining: textRemaining,
          creditPackRemaining: textPackRemaining,
          totalAvailable: textRemaining + textPackRemaining,
          limit: null,
          remaining: textRemaining + textPackRemaining,
        },
        voice: voiceBalance,
        audio: voiceBalance,
        assistant: {
          subscriptionLimit: null,
          subscriptionRemaining: assistantRemaining,
          creditPackRemaining: assistantPackRemaining,
          totalAvailable: assistantRemaining + assistantPackRemaining,
          limit: null,
          remaining: assistantRemaining + assistantPackRemaining,
        },
      },
      creditPacks: creditPackInfos,
      error,
    };
  }

  const planId = sub.planId;
  const plan = parsePlanCode(planId) ?? parsePlanCode(sub.plan?.id) ?? 'BASIC_MONTHLY';

  const textLimit = sub.plan?.textTurnsQuota ?? 30;
  const voiceLimit = sub.plan?.voiceMinsQuota ?? 15;
  const assistantLimit = sub.plan?.assistantQuota ?? 10;

  const limits: PlanQuotaLimits = {
    text: textLimit,
    voice: voiceLimit,
    audio: voiceLimit,
    assistant: assistantLimit,
  };

  const subTextRemaining = quota ? quota.textTurnsRemaining : 0;
  const subVoiceRemaining = quota ? quota.voiceMinsRemaining : 0;
  const subAssistantRemaining = quota ? quota.assistantRemaining : 0;

  const voiceBalance: DimensionBalance = {
    subscriptionLimit: voiceLimit,
    subscriptionRemaining: subVoiceRemaining,
    creditPackRemaining: voicePackRemaining,
    totalAvailable: subVoiceRemaining + voicePackRemaining,
    limit: voiceLimit,
    remaining: subVoiceRemaining + voicePackRemaining,
  };

  return {
    userId,
    plan,
    subscriptionId: sub.id,
    subscriptionStatus: sub.status,
    periodStart: sub.startedAt,
    periodEnd: sub.expiresAt,
    usable: true,
    limits,
    balances: {
      text: {
        subscriptionLimit: textLimit,
        subscriptionRemaining: subTextRemaining,
        creditPackRemaining: textPackRemaining,
        totalAvailable: subTextRemaining + textPackRemaining,
        limit: textLimit,
        remaining: subTextRemaining + textPackRemaining,
      },
      voice: voiceBalance,
      audio: voiceBalance,
      assistant: {
        subscriptionLimit: assistantLimit,
        subscriptionRemaining: subAssistantRemaining,
        creditPackRemaining: assistantPackRemaining,
        totalAvailable: subAssistantRemaining + assistantPackRemaining,
        limit: assistantLimit,
        remaining: subAssistantRemaining + assistantPackRemaining,
      },
    },
    creditPacks: creditPackInfos,
    error: null,
  };
}

export async function checkQuotaAvailable(
  userId: string,
  actionType: string,
  amount?: number,
  now: Date = new Date(),
): Promise<QuotaCheckResult> {
  const normalized = normalizeAmount(amount);
  if (typeof normalized !== 'number') {
    return {
      decision: null,
      error: normalized,
      dimension: null,
      remaining: null,
      totalAvailable: 0,
      source: null,
      amount: amount === undefined ? 1 : amount,
      subscriptionId: null,
      quotaId: null,
    };
  }

  const dimension = resolveQuotaDimension(actionType);
  if (!dimension) {
    return {
      decision: null,
      error: err('INVALID_DIMENSION', `Unknown quota actionType "${actionType}".`),
      dimension: null,
      remaining: null,
      totalAvailable: 0,
      source: null,
      amount: normalized,
      subscriptionId: null,
      quotaId: null,
    };
  }

  const status = await getUserQuotaStatus(userId, now);
  const balance = status.balances[dimension];

  if (balance.totalAvailable >= normalized) {
    const source: QuotaSource =
      (balance.subscriptionRemaining ?? 0) >= normalized ? 'SUBSCRIPTION' : 'CREDIT_PACK';

    return {
      decision: 'ALLOW',
      error: null,
      dimension,
      remaining: balance.totalAvailable,
      totalAvailable: balance.totalAvailable,
      source,
      amount: normalized,
      subscriptionId: status.subscriptionId,
      quotaId: null,
    };
  }

  return {
    decision: 'QUOTA_EXCEEDED',
    error: null,
    dimension,
    remaining: balance.totalAvailable,
    totalAvailable: balance.totalAvailable,
    source: null,
    amount: normalized,
    subscriptionId: status.subscriptionId,
    quotaId: null,
  };
}

export async function consumeQuota(
  userId: string,
  actionType: string,
  amount?: number,
  now: Date = new Date(),
): Promise<QuotaConsumeResult> {
  const normalized = normalizeAmount(amount);
  if (typeof normalized !== 'number') {
    return {
      decision: null,
      error: normalized,
      dimension: null,
      amount: amount === undefined ? 1 : amount,
      source: null,
      remainingBefore: null,
      remainingAfter: null,
      persisted: false,
      subscriptionId: null,
      quotaId: null,
      creditPackId: null,
    };
  }

  const dimension = resolveQuotaDimension(actionType);
  if (!dimension) {
    return {
      decision: null,
      error: err('INVALID_DIMENSION', `Unknown quota actionType "${actionType}".`),
      dimension: null,
      amount: normalized,
      source: null,
      remainingBefore: null,
      remainingAfter: null,
      persisted: false,
      subscriptionId: null,
      quotaId: null,
      creditPackId: null,
    };
  }

  const col = REMAINING_COLUMN[dimension];

  // 1. Priority 1: Atomic conditional decrement on user_quotas (Subscription Quota)
  const rows = await prismaRef.$executeRaw(
    Prisma.sql`
      UPDATE user_quotas
      SET ${Prisma.raw(col)} = ${Prisma.raw(col)} - ${normalized},
          last_reset_at = NOW()
      WHERE user_id = ${userId}::uuid
        AND ${Prisma.raw(col)} >= ${normalized}
    `,
  );

  if (rows === 1) {
    const updated = await prismaRef.userQuota.findUnique({
      where: { userId },
    });
    const remainingAfter = updated
      ? dimension === 'text'
        ? updated.textTurnsRemaining
        : dimension === 'voice'
        ? updated.voiceMinsRemaining
        : updated.assistantRemaining
      : 0;

    return {
      decision: 'ALLOW',
      error: null,
      dimension,
      amount: normalized,
      source: 'SUBSCRIPTION',
      remainingBefore: remainingAfter + normalized,
      remainingAfter,
      persisted: true,
      subscriptionId: null,
      quotaId: updated?.id ?? null,
      creditPackId: null,
    };
  }

  // 2. Priority 2: Atomic conditional decrement on UserCreditPack (FEFO: expiresAt ASC)
  const eligiblePack = await prismaRef.userCreditPack.findFirst({
    where: {
      userId,
      dimension,
      status: 'ACTIVE',
      expiresAt: { gt: now },
      remainingUnits: { gte: normalized },
    },
    orderBy: { expiresAt: 'asc' },
  });

  if (eligiblePack) {
    const updatedCount = await prismaRef.$executeRaw(
      Prisma.sql`
        UPDATE user_credit_packs
        SET remaining_units = remaining_units - ${normalized},
            status = CASE WHEN remaining_units - ${normalized} = 0 THEN 'DEPLETED' ELSE 'ACTIVE' END
        WHERE id = ${eligiblePack.id}::uuid
          AND remaining_units >= ${normalized}
          AND status = 'ACTIVE'
      `,
    );

    if (updatedCount === 1) {
      const remainingAfter = eligiblePack.remainingUnits - normalized;
      return {
        decision: 'ALLOW',
        error: null,
        dimension,
        amount: normalized,
        source: 'CREDIT_PACK',
        remainingBefore: eligiblePack.remainingUnits,
        remainingAfter,
        persisted: true,
        subscriptionId: null,
        quotaId: null,
        creditPackId: eligiblePack.id,
      };
    }
  }

  return {
    decision: 'QUOTA_EXCEEDED',
    error: null,
    dimension,
    amount: normalized,
    source: null,
    remainingBefore: null,
    remainingAfter: null,
    persisted: false,
    subscriptionId: null,
    quotaId: null,
    creditPackId: null,
  };
}
