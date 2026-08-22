/**
 * Voice Session Domain Engine & Atomic Billing Service.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * Phase: B5 — Server-Side 15-Minute Cap & Boundary Guards
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
  VoiceSessionStatus,
  VoiceEntitlementResult,
  CreateVoiceSessionInput,
  FinalizeVoiceSessionInput,
  AbortVoiceSessionInput,
  VoiceSessionDTO,
} from '../types/voiceSessionTypes';
import {
  VoiceQuotaExceededError,
  VoiceSessionAlreadyActiveError,
  VoiceSessionNotFoundError,
  VoiceSessionInvalidStateError,
  VoiceSessionNotOwnerError,
} from '../errors/voiceSessionErrors';
import { VoiceEntitlementResolver } from './voiceEntitlementResolver';

const prisma = new PrismaClient();

type DbClient = PrismaClient | Prisma.TransactionClient;

/** Hard technical ceiling for any voice session (15 minutes = 900,000ms) */
export const MAX_SESSION_DURATION_MS = 900_000;

/**
 * Computes billable minutes from speech duration in ms and max allowed ms.
 * Formula (docs/VOICE_QUOTA_CONTRACT_v1.0.md §3 & §5):
 *  if D_ms < 3000 -> 0
 *  else -> min(sessionCapMinutes, ceil(D_ms / 60000))
 */
export function calculateBillableMinutes(durationMs: number, maxAllowedMs: number = MAX_SESSION_DURATION_MS): number {
  if (!Number.isFinite(durationMs) || durationMs < 3000) {
    return 0;
  }
  const effectiveCapMs = Math.min(MAX_SESSION_DURATION_MS, Math.max(0, maxAllowedMs));
  const sessionCapMinutes = Math.floor(effectiveCapMs / 60_000);
  const rawMinutes = Math.ceil(durationMs / 60_000);
  return Math.min(sessionCapMinutes, rawMinutes);
}

export class VoiceSessionService {
  /**
   * Resolves Voice Entitlement for a user without mutating balances.
   * Delegates to VoiceEntitlementResolver (Phase B6).
   * Priority: VIP -> Subscription Quota -> Add-on Packs -> Free Trial -> 403 QUOTA_EXCEEDED
   */
  static async resolveVoiceEntitlement(
    userId: string,
    db: DbClient = prisma,
    now: Date = new Date(),
  ): Promise<VoiceEntitlementResult> {
    return VoiceEntitlementResolver.resolveVoiceEntitlement(userId, now, db);
  }

  /**
   * Creates an authorized VoiceSession.
   * Enforces: MAX_ACTIVE_VOICE_SESSIONS_PER_USER = 1.
   * Sets maxAllowedMs = min(900_000, availableMinutes * 60_000).
   * Does NOT consume quota at creation time (Phase B4/B5 consumes upon finalization).
   */
  static async createVoiceSession(
    input: CreateVoiceSessionInput,
    db: DbClient = prisma,
  ): Promise<VoiceSessionDTO> {
    const { userId, debateSessionId } = input;

    // 1. Guard against concurrent active sessions
    const activeSession = await db.voiceSession.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'FINALIZING'] },
      },
    });

    if (activeSession) {
      throw new VoiceSessionAlreadyActiveError(
        'Bạn đang có một phiên Voice đang hoạt động. Vui lòng hoàn thành phiên hiện tại trước khi bắt đầu phiên mới.',
        { activeSessionId: activeSession.id },
      );
    }

    // 2. Entitlement verification
    const entitlement = await this.resolveVoiceEntitlement(userId, db);
    if (!entitlement.allowed) {
      throw new VoiceQuotaExceededError(
        entitlement.reason ?? 'Bạn không có đủ phút Voice AI để bắt đầu phiên mới.',
        { availableMinutes: entitlement.availableMinutes },
      );
    }

    // 3. Compute Server-Side Maximum Allowed Duration
    const maxAllowedMs =
      entitlement.mode === 'TIME_UNLIMITED'
        ? MAX_SESSION_DURATION_MS
        : Math.min(
            MAX_SESSION_DURATION_MS,
            Math.max(60_000, (entitlement.availableMinutes ?? 15) * 60_000),
          );

    // 4. Persist VoiceSession
    const session = await db.voiceSession.create({
      data: {
        userId,
        debateSessionId: debateSessionId ?? null,
        status: 'ACTIVE',
        startedAt: new Date(),
        maxAllowedMs,
        actualDurationMs: 0,
        billableMinutes: 0,
        consumedSubMins: 0,
        consumedAddonMins: 0,
        isFinalized: false,
      },
    });

    return this.toDTO(session);
  }

  /**
   * Retrieves a VoiceSession with strict user ownership enforcement.
   */
  static async getVoiceSession(
    voiceSessionId: string,
    requestingUserId?: string,
    db: DbClient = prisma,
  ): Promise<VoiceSessionDTO> {
    const session = await db.voiceSession.findUnique({
      where: { id: voiceSessionId },
    });

    if (!session) {
      throw new VoiceSessionNotFoundError();
    }

    if (requestingUserId && session.userId !== requestingUserId) {
      throw new VoiceSessionNotOwnerError();
    }

    return this.toDTO(session);
  }

  /**
   * Finalizes a VoiceSession with Server-Authoritative Duration & Atomic Billing.
   * State Machine: ACTIVE | FINALIZING -> COMPLETED
   * 
   * INVARIANT B5-01: Server timestamps (serverEndedAt - session.startedAt) are AUTHORITATIVE.
   * Client actualDurationMs is treated as UNTRUSTED payload (sanitized and logged for diagnostics).
   * 
   * Deducts Voice minutes according to Contract:
   *  1. VIP: 0 deduction (TIME_UNLIMITED up to 15m technical cap).
   *  2. Sub-3s duration: 0 deduction (Noise filter).
   *  3. Normal session:
   *     - Step A: Subscription Quota (atomic decrement with balance guard)
   *     - Step B: Add-on Credit Packs (FEFO ordered by expiresAt ASC)
   *     - Step C: Free Trial Allowance (if active)
   *     - Transaction rolls back if total quota is insufficient.
   * 
   * Idempotency: Re-calling on already-finalized session returns cached result with 0 extra mutation.
   */
  static async finalizeVoiceSession(
    input: FinalizeVoiceSessionInput,
    db: DbClient = prisma,
  ): Promise<{ alreadyFinalized: boolean; session: VoiceSessionDTO }> {
    const { voiceSessionId, userId, actualDurationMs, reason } = input;

    const executeFinalization = async (tx: DbClient) => {
      // 1. Fetch existing session with ownership verification
      const existing = await tx.voiceSession.findUnique({
        where: { id: voiceSessionId },
      });

      if (!existing) {
        throw new VoiceSessionNotFoundError();
      }

      if (existing.userId !== userId) {
        throw new VoiceSessionNotOwnerError();
      }

      // 2. Idempotency Guard: return cached state if already finalized
      if (existing.isFinalized || existing.status === 'COMPLETED') {
        return {
          alreadyFinalized: true,
          session: this.toDTO(existing),
        };
      }

      // 3. State validation
      if (!['ACTIVE', 'FINALIZING'].includes(existing.status)) {
        throw new VoiceSessionInvalidStateError(
          `Không thể hoàn thành phiên Voice từ trạng thái: ${existing.status}`,
          { currentStatus: existing.status },
        );
      }

      // 4. Sanitize Client-Supplied Duration (Untrusted Input Defense)
      let sanitizedClientDuration: number | null = null;
      if (typeof actualDurationMs === 'number' && Number.isFinite(actualDurationMs) && actualDurationMs >= 0) {
        sanitizedClientDuration = Math.round(actualDurationMs);
      }

      // 5. SERVER DURATION AUTHORITY (Invariant B5-01)
      const serverEndedAt = new Date();
      const serverElapsedMs = Math.max(0, serverEndedAt.getTime() - existing.startedAt.getTime());
      
      // Effective duration is strictly clamped by server elapsed time and session maxAllowedMs
      const effectiveDuration = Math.min(
        existing.maxAllowedMs,
        serverElapsedMs,
      );
      const billableMinutes = calculateBillableMinutes(effectiveDuration, existing.maxAllowedMs);

      // 6. Check VIP Status
      const activeVip = await tx.userVipPass.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          startedAt: { lte: serverEndedAt },
          expiresAt: { gt: serverEndedAt },
        },
      });

      if (activeVip) {
        const consumptionDetails = {
          mode: 'TIME_UNLIMITED',
          source: 'VIP',
          passCode: activeVip.passCode,
          billableMinutes,
          serverElapsedMs,
          effectiveDurationMs: effectiveDuration,
          clientSuppliedDurationMs: sanitizedClientDuration,
          consumedSubMins: 0,
          consumedAddonMins: 0,
          consumedTrialMins: 0,
          deductedUnits: 0,
          reason: reason || 'NORMAL',
          finalizedAt: serverEndedAt.toISOString(),
        };

        const updated = await tx.voiceSession.update({
          where: { id: voiceSessionId },
          data: {
            status: 'COMPLETED',
            endedAt: serverEndedAt,
            actualDurationMs: effectiveDuration,
            billableMinutes,
            consumedSubMins: 0,
            consumedAddonMins: 0,
            consumptionDetails,
            isFinalized: true,
            finalizedAt: new Date(),
          },
        });

        return {
          alreadyFinalized: false,
          session: this.toDTO(updated),
        };
      }

      // 7. Zero-Minute / Sub-3s Session
      if (billableMinutes === 0) {
        const consumptionDetails = {
          mode: 'QUOTA',
          source: 'ZERO_DURATION',
          billableMinutes: 0,
          serverElapsedMs,
          effectiveDurationMs: effectiveDuration,
          clientSuppliedDurationMs: sanitizedClientDuration,
          consumedSubMins: 0,
          consumedAddonMins: 0,
          consumedTrialMins: 0,
          deductedUnits: 0,
          reason: effectiveDuration < 3000 ? 'LESS_THAN_3_SECONDS' : (reason || 'ZERO_DURATION'),
          finalizedAt: serverEndedAt.toISOString(),
        };

        const updated = await tx.voiceSession.update({
          where: { id: voiceSessionId },
          data: {
            status: 'COMPLETED',
            endedAt: serverEndedAt,
            actualDurationMs: effectiveDuration,
            billableMinutes: 0,
            consumedSubMins: 0,
            consumedAddonMins: 0,
            consumptionDetails,
            isFinalized: true,
            finalizedAt: new Date(),
          },
        });

        return {
          alreadyFinalized: false,
          session: this.toDTO(updated),
        };
      }

      // 8. Non-VIP Minute-Based Billing Allocation
      let neededRemaining = billableMinutes;

      // 8a. Primary Source: Subscription Voice Quota
      const userQuota = await tx.userQuota.findUnique({
        where: { userId },
        select: { voiceMinsRemaining: true },
      });
      const currentSubMins = Math.max(0, userQuota?.voiceMinsRemaining ?? 0);
      const allocatedSub = Math.min(neededRemaining, currentSubMins);

      if (allocatedSub > 0) {
        const subUpdateResult = await tx.$executeRaw`
          UPDATE user_quotas
          SET voice_mins_remaining = voice_mins_remaining - ${allocatedSub},
              last_reset_at = NOW()
          WHERE user_id = ${userId}::uuid
            AND voice_mins_remaining >= ${allocatedSub};
        `;
        if (subUpdateResult === 0) {
          throw new VoiceQuotaExceededError(
            'Không thể khấu trừ hạn mức Voice AI gói đăng ký (số dư không đủ hoặc thay đổi đồng thời).',
          );
        }
        neededRemaining -= allocatedSub;
      }

      // 8b. Secondary Source: Add-on Credit Packs (FEFO: expiresAt ASC)
      const packAllocations: Array<{
        packId: string;
        packCode: string;
        deductedUnits: number;
        remainingAfter: number;
      }> = [];
      let allocatedAddon = 0;

      if (neededRemaining > 0) {
        const activePacks = await tx.userCreditPack.findMany({
          where: {
            userId,
            dimension: 'voice',
            status: 'ACTIVE',
            expiresAt: { gt: serverEndedAt },
            remainingUnits: { gt: 0 },
          },
          orderBy: { expiresAt: 'asc' },
        });

        for (const pack of activePacks) {
          if (neededRemaining <= 0) break;
          const packDeduct = Math.min(neededRemaining, pack.remainingUnits);
          if (packDeduct > 0) {
            const packUpdateResult = await tx.$executeRaw`
              UPDATE user_credit_packs
              SET remaining_units = remaining_units - ${packDeduct},
                  status = CASE WHEN remaining_units - ${packDeduct} = 0 THEN 'DEPLETED' ELSE status END
              WHERE id = ${pack.id}::uuid
                AND remaining_units >= ${packDeduct};
            `;
            if (packUpdateResult === 0) {
              throw new VoiceQuotaExceededError(
                `Không thể khấu trừ gói add-on ${pack.packCode} (số dư không đủ hoặc thay đổi đồng thời).`,
              );
            }
            packAllocations.push({
              packId: pack.id,
              packCode: pack.packCode,
              deductedUnits: packDeduct,
              remainingAfter: pack.remainingUnits - packDeduct,
            });
            allocatedAddon += packDeduct;
            neededRemaining -= packDeduct;
          }
        }
      }

      // 8c. Tertiary Source: Free Trial Voice Minutes
      let allocatedTrial = 0;
      if (neededRemaining > 0) {
        const activeTrial = await tx.userFreeTrial.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
            expiresAt: { gt: serverEndedAt },
            voiceMinsRemaining: { gt: 0 },
          },
        });

        if (activeTrial) {
          const trialDeduct = Math.min(neededRemaining, activeTrial.voiceMinsRemaining);
          if (trialDeduct > 0) {
            const trialUpdateResult = await tx.$executeRaw`
              UPDATE user_free_trials
              SET voice_mins_remaining = voice_mins_remaining - ${trialDeduct},
                  status = CASE WHEN voice_mins_remaining - ${trialDeduct} = 0 AND text_remaining = 0 AND assistant_remaining = 0 THEN 'COMPLETED' ELSE status END
              WHERE id = ${activeTrial.id}::uuid
                AND voice_mins_remaining >= ${trialDeduct};
            `;
            if (trialUpdateResult === 0) {
              throw new VoiceQuotaExceededError('Không thể khấu trừ hạn mức Free Trial Voice AI.');
            }
            allocatedTrial = trialDeduct;
            neededRemaining -= trialDeduct;
          }
        }
      }

      // 8d. Check if total available was sufficient
      if (neededRemaining > 0) {
        throw new VoiceQuotaExceededError(
          `Hạn mức Voice AI không đủ để thanh toán phiên (cần ${billableMinutes} phút, còn thiếu ${neededRemaining} phút).`,
          { billableMinutes, allocatedSub, allocatedAddon, allocatedTrial, neededRemaining },
        );
      }

      // 8e. Persist Finalized Session State & Audit Ledger
      const consumptionDetails = {
        mode: 'QUOTA',
        billableMinutes,
        consumedSubMins: allocatedSub,
        consumedAddonMins: allocatedAddon,
        consumedTrialMins: allocatedTrial,
        serverElapsedMs,
        effectiveDurationMs: effectiveDuration,
        clientSuppliedDurationMs: sanitizedClientDuration,
        reason: reason || 'NORMAL',
        packs: packAllocations,
        finalizedAt: serverEndedAt.toISOString(),
      };

      const updated = await tx.voiceSession.update({
        where: { id: voiceSessionId },
        data: {
          status: 'COMPLETED',
          endedAt: serverEndedAt,
          actualDurationMs: effectiveDuration,
          billableMinutes,
          consumedSubMins: allocatedSub,
          consumedAddonMins: allocatedAddon,
          consumptionDetails,
          isFinalized: true,
          finalizedAt: new Date(),
        },
      });

      return {
        alreadyFinalized: false,
        session: this.toDTO(updated),
      };
    };

    // Guarantee transaction execution
    if ('$transaction' in db && typeof (db as any).$transaction === 'function') {
      return await (db as PrismaClient).$transaction(async (tx) => executeFinalization(tx));
    }
    return await executeFinalization(db);
  }

  /**
   * Aborts a VoiceSession (e.g. user canceled or unrecoverable error).
   * State Machine: ACTIVE | CREATED -> ABORTED
   * Does NOT deduct quota.
   */
  static async abortVoiceSession(
    input: AbortVoiceSessionInput,
    db: DbClient = prisma,
  ): Promise<{ alreadyFinalized: boolean; session: VoiceSessionDTO }> {
    const { voiceSessionId, userId } = input;

    const existing = await db.voiceSession.findUnique({
      where: { id: voiceSessionId },
    });

    if (!existing) {
      throw new VoiceSessionNotFoundError();
    }

    if (existing.userId !== userId) {
      throw new VoiceSessionNotOwnerError();
    }

    if (existing.isFinalized || existing.status === 'COMPLETED') {
      return {
        alreadyFinalized: true,
        session: this.toDTO(existing),
      };
    }

    if (['ABORTED', 'FAILED', 'TIMEOUT'].includes(existing.status)) {
      return {
        alreadyFinalized: false,
        session: this.toDTO(existing),
      };
    }

    const updated = await db.voiceSession.update({
      where: { id: voiceSessionId },
      data: {
        status: 'ABORTED',
        endedAt: new Date(),
      },
    });

    return {
      alreadyFinalized: false,
      session: this.toDTO(updated),
    };
  }

  private static toDTO(session: any): VoiceSessionDTO {
    return {
      id: session.id,
      userId: session.userId,
      debateSessionId: session.debateSessionId,
      status: session.status as VoiceSessionStatus,
      startedAt: session.startedAt instanceof Date ? session.startedAt.toISOString() : session.startedAt,
      endedAt: session.endedAt instanceof Date ? session.endedAt.toISOString() : session.endedAt,
      maxAllowedMs: session.maxAllowedMs,
      actualDurationMs: session.actualDurationMs,
      billableMinutes: session.billableMinutes,
      consumedSubMins: session.consumedSubMins,
      consumedAddonMins: session.consumedAddonMins,
      consumptionDetails: session.consumptionDetails ?? null,
      isFinalized: session.isFinalized,
      finalizedAt: session.finalizedAt instanceof Date ? session.finalizedAt.toISOString() : session.finalizedAt,
      createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
    };
  }
}
