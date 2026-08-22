/**
 * Voice Entitlement Resolver Domain Engine.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * Phase: B6 — VIP Time Pass & Free Trial Entitlement Resolvers
 * 
 * Pure, deterministic, read-only resolution layer executed BEFORE session creation.
 * Enforces strict precedence:
 *   1. Active VIP (TIME_UNLIMITED)
 *   2. Subscription Quota
 *   3. Add-on Credit Packs (FEFO: expiresAt ASC)
 *   4. Free Trial Quota
 *   5. QUOTA_EXCEEDED (HTTP 403)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  VoiceEntitlementResult,
  VoiceEntitlementBreakdown,
} from '../types/voiceSessionTypes';

const prisma = new PrismaClient();

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Hard technical ceiling for any voice session (15 minutes = 900,000ms) */
export const MAX_SESSION_DURATION_MS = 900_000;

export class VoiceEntitlementResolver {
  /**
   * Resolves Voice Entitlement for a user deterministically without mutating any balances.
   * 
   * Strict Precedence (docs/VOICE_QUOTA_CONTRACT_v1.0.md §12):
   *  Priority 1: Active VIP Time Pass (startedAt <= now < expiresAt, status === 'ACTIVE')
   *  Priority 2: Subscription Quota (user_quotas.voice_mins_remaining >= 1)
   *  Priority 3: Add-on Credit Packs (user_credit_packs: FEFO expiresAt ASC)
   *  Priority 4: Free Trial (user_free_trials: expiresAt > now, voice_mins_remaining > 0)
   *  Priority 5: Quota Exceeded (Total Available < 1)
   */
  static async resolveVoiceEntitlement(
    userId: string,
    now: Date = new Date(),
    db: DbClient = prisma,
  ): Promise<VoiceEntitlementResult> {
    const evalTime = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();

    // ─── PRIORITY 1: Active VIP Time Pass Check ──────────────────────────────
    const activeVip = await db.userVipPass.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        startedAt: { lte: evalTime },
        expiresAt: { gt: evalTime },
      },
    });

    // Read wallet balances for breakdown metadata (pure read)
    const userQuota = await db.userQuota.findUnique({
      where: { userId },
      select: { voiceMinsRemaining: true },
    });
    const subMins = this.sanitizeMinutes(userQuota?.voiceMinsRemaining);

    const activePacks = await db.userCreditPack.findMany({
      where: {
        userId,
        dimension: 'voice',
        status: 'ACTIVE',
        expiresAt: { gt: evalTime },
        remainingUnits: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    });
    const validPacks = activePacks
      .map((p) => ({
        packId: p.id,
        packCode: p.packCode,
        remainingUnits: this.sanitizeMinutes(p.remainingUnits),
        expiresAt: p.expiresAt,
      }))
      .filter((p) => p.remainingUnits > 0);
    const addonMins = validPacks.reduce((sum, p) => sum + p.remainingUnits, 0);

    const activeTrial = await db.userFreeTrial.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: evalTime },
        voiceMinsRemaining: { gt: 0 },
      },
    });
    const trialMins = activeTrial
      ? this.sanitizeMinutes(activeTrial.voiceMinsRemaining)
      : 0;

    const breakdown: VoiceEntitlementBreakdown = {
      subscriptionMinutes: subMins,
      addonMinutes: addonMins,
      trialMinutes: trialMins,
      vipPassCode: activeVip?.passCode ?? null,
      activePacks: validPacks,
      activeTrial:
        activeTrial && trialMins > 0
          ? {
              trialId: activeTrial.id,
              voiceMinsRemaining: trialMins,
              expiresAt: activeTrial.expiresAt,
            }
          : null,
    };

    if (activeVip) {
      return {
        allowed: true,
        mode: 'TIME_UNLIMITED',
        source: 'VIP',
        availableMinutes: null,
        maxAllowedMs: MAX_SESSION_DURATION_MS,
        breakdown,
      };
    }

    // ─── PRIORITY 2, 3, 4: Minute-Based Wallets ──────────────────────────────
    const totalAvailable = subMins + addonMins + trialMins;

    if (totalAvailable >= 1) {
      let primarySource: 'SUBSCRIPTION' | 'ADD_ON' | 'TRIAL' = 'SUBSCRIPTION';
      if (subMins > 0) {
        primarySource = 'SUBSCRIPTION'; // Priority 2
      } else if (addonMins > 0) {
        primarySource = 'ADD_ON'; // Priority 3
      } else if (trialMins > 0) {
        primarySource = 'TRIAL'; // Priority 4
      }

      const maxAllowedMs = Math.min(
        MAX_SESSION_DURATION_MS,
        Math.max(60_000, totalAvailable * 60_000),
      );

      return {
        allowed: true,
        mode: 'QUOTA',
        source: primarySource,
        availableMinutes: totalAvailable,
        maxAllowedMs,
        breakdown,
      };
    }

    // ─── PRIORITY 5: Quota Exceeded (Total Available < 1) ───────────────────
    return {
      allowed: false,
      mode: 'QUOTA',
      source: null,
      availableMinutes: Math.max(0, totalAvailable),
      maxAllowedMs: 0,
      breakdown,
      reason: 'Hạn mức phút Voice AI đã hết (cần tối thiểu 1 phút để bắt đầu phiên).',
    };
  }

  /**
   * Sanitizes numerical balance inputs defensively.
   * Rejects NaN, Infinity, negative values, and non-numbers.
   */
  private static sanitizeMinutes(value: any): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return Math.floor(value);
  }
}
