/**
 * Profile & Subscription Domain Controller - v15.0.0
 *
 * Handles:
 *   GET  /api/v1/users/profile  — User profile + real-time quota + statistics
 *   PUT  /api/v1/users/profile  — Update editable profile fields
 *   GET  /api/v1/plans          — Subscription tier metadata (BASIC / STANDARD / PREMIUM)
 *
 * STRICT NO-LLM & COST SAFETY:
 *   Zero LLM API calls. Zero quota deduction.
 *   All operations are pure DB/static reads or lightweight DB writes.
 */

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';
import { getUserQuotaStatus } from '../services/quotaManager';
import {
  listPlanCodes,
  listCreditPackCodes,
  listVipPassCodes,
  getPlanDefinition,
  getCreditPackDefinition,
  getVipPassDefinition,
} from '../services/planQuotaRegistry';

const prisma = new PrismaClient();

// ─── Plan Feature Lists ───────────────────────────────────────────────────────

const PLAN_FEATURES: Record<string, { vi: string[]; en: string[] }> = {
  COMPETITION_7D: {
    vi: [
      '5 phiên tranh biện văn bản/7 ngày',
      '2 phiên tranh biện giọng nói/7 ngày',
      '2 bản thảo / báo cáo/7 ngày',
      'Thời hạn: 7 ngày',
      'AI Tier: Cơ bản',
    ],
    en: [
      '5 text debate sessions/7 days',
      '2 voice debate sessions/7 days',
      '2 speech drafts / reports/7 days',
      'Validity: 7 days',
      'AI Tier: Basic',
    ],
  },
  BASIC: {
    vi: [
      '30 lượt tranh biện văn bản/tháng',
      '15 phút tranh biện giọng nói/tháng',
      '10 bản thảo / báo cáo trợ lý/tháng',
      'AI Tier: Cơ bản',
      'Hỗ trợ: Tiêu chuẩn',
    ],
    en: [
      '30 text debate turns/month',
      '15 voice debate minutes/month',
      '10 assistant drafts/reports/month',
      'AI Tier: Basic',
      'Support: Standard',
    ],
  },
  STANDARD: {
    vi: [
      '100 lượt tranh biện văn bản/tháng',
      '60 phút tranh biện giọng nói/tháng',
      '50 bản thảo / báo cáo trợ lý/tháng',
      'AI Tier: Nâng cao',
      'Phản hồi nhanh hơn',
      'Hỗ trợ: Ưu tiên',
    ],
    en: [
      '100 text debate turns/month',
      '60 voice debate minutes/month',
      '50 assistant drafts/reports/month',
      'AI Tier: Advanced',
      'Faster response priority',
      'Support: Priority',
    ],
  },
  PREMIUM: {
    vi: [
      '500 lượt tranh biện văn bản/tháng',
      '300 phút tranh biện giọng nói/tháng',
      '200 bản thảo / báo cáo trợ lý/tháng',
      'AI Tier: Cao nhất',
      'Ưu tiên xử lý cao nhất',
      'Hỗ trợ: Premium 24×7',
    ],
    en: [
      '500 text debate turns/month',
      '300 voice debate minutes/month',
      '200 assistant drafts/reports/month',
      'AI Tier: Highest',
      'Highest processing priority',
      'Support: Premium 24×7',
    ],
  },
};

// ─── GET /api/v1/users/profile ────────────────────────────────────────────────

export async function getUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;

    // 1. Load user record
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found', message: `No user with id ${userId}` });
      return;
    }

    // 2. Real-time quota status
    const quotaStatus = await getUserQuotaStatus(userId);

    // 3. Session statistics
    const [totalSessions, completedSessions] = await Promise.all([
      prisma.debateSession.count({ where: { userId } }),
      prisma.debateSession.count({ where: { userId, status: 'COMPLETED' } }),
    ]);

    const textBal = quotaStatus.balances.text;
    const voiceBal = quotaStatus.balances.voice;
    const assistantBal = quotaStatus.balances.assistant;

    res.json({
      success: true,
      profile: {
        id: user.id,
        phone_number: user.phoneNumber,
        full_name: user.displayName,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        created_at: user.createdAt.toISOString(),
      },
      subscription: {
        plan: quotaStatus.plan ?? null,
        status: quotaStatus.subscriptionStatus ?? null,
        usable: quotaStatus.usable,
        period_start: quotaStatus.periodStart ? quotaStatus.periodStart.toISOString() : null,
        period_end: quotaStatus.periodEnd ? quotaStatus.periodEnd.toISOString() : null,
      },
      quota: {
        text: {
          subscription_remaining: textBal.subscriptionRemaining ?? 0,
          credit_pack_remaining: 0,
          total_available: textBal.totalAvailable,
          limit: textBal.subscriptionLimit ?? 0,
        },
        voice: {
          subscription_remaining: voiceBal.subscriptionRemaining ?? 0,
          credit_pack_remaining: 0,
          total_available: voiceBal.totalAvailable,
          limit: voiceBal.subscriptionLimit ?? 0,
        },
        audio: {
          subscription_remaining: voiceBal.subscriptionRemaining ?? 0,
          credit_pack_remaining: 0,
          total_available: voiceBal.totalAvailable,
          limit: voiceBal.subscriptionLimit ?? 0,
        },
        assistant: {
          subscription_remaining: assistantBal.subscriptionRemaining ?? 0,
          credit_pack_remaining: 0,
          total_available: assistantBal.totalAvailable,
          limit: assistantBal.subscriptionLimit ?? 0,
        },
        text_remaining: textBal.totalAvailable,
        text_limit: textBal.subscriptionLimit ?? 0,
        voice_remaining: voiceBal.totalAvailable,
        voice_limit: voiceBal.subscriptionLimit ?? 0,
        audio_remaining: voiceBal.totalAvailable,
        audio_limit: voiceBal.subscriptionLimit ?? 0,
        assistant_remaining: assistantBal.totalAvailable,
        assistant_limit: assistantBal.subscriptionLimit ?? 0,
      },
      credit_packs: [],
      stats: {
        total_sessions: totalSessions,
        completed_sessions: completedSessions,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PROFILE_GET_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

// ─── PUT /api/v1/users/profile ────────────────────────────────────────────────

export async function updateUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;

    const { full_name, display_name, language_preference } = req.body as {
      full_name?: string;
      display_name?: string;
      language_preference?: string;
    };

    const targetName = display_name ?? full_name;

    if (targetName !== undefined) {
      if (typeof targetName !== 'string' || targetName.trim().length === 0) {
        res.status(400).json({ error: 'display_name must be a non-empty string' });
        return;
      }
      if (targetName.trim().length > 100) {
        res.status(400).json({ error: 'display_name must be 100 characters or fewer' });
        return;
      }
    }

    if (language_preference !== undefined && language_preference !== 'vi' && language_preference !== 'en') {
      res.status(400).json({ error: 'language_preference must be "vi" or "en"' });
      return;
    }

    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(targetName ? { displayName: targetName.trim() } : {}),
      },
    });

    res.json({
      success: true,
      profile: {
        id: updated.id,
        phone_number: updated.phoneNumber,
        display_name: updated.displayName,
        full_name: updated.displayName,
        language_preference: language_preference ?? 'vi',
        updated_at: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PROFILE_UPDATE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

// ─── GET /api/v1/plans ────────────────────────────────────────────────────────

export async function getSubscriptionPlans(req: AuthRequest, res: Response): Promise<void> {
  try {
    const packCodes = listCreditPackCodes();
    const creditPacks = packCodes.map((code) => {
      const def = getCreditPackDefinition(code);
      return {
        code: def.code,
        display_name: def.displayName,
        list_price_vnd: def.listPriceVnd,
        duration_days: def.durationDays,
        dimension: def.dimension,
        units: def.units,
        description_vi: def.descriptionVi,
        description_en: def.descriptionEn,
      };
    });

    // DB is the Single Source of Truth (COM-INVARIANT-02)
    let dbPlans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        billingCycle: { in: ['monthly', 'yearly'] },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Auto-seed all canonical plans if any are missing or incomplete
    const planCodes = listPlanCodes();
    for (const code of planCodes) {
      const def = getPlanDefinition(code);
      if (def) {
        try {
          const isYearly = def.durationDays > 30;
          const sortOrder = def.code.includes('BASIC') ? (isYearly ? 2 : 1) : def.code.includes('STANDARD') ? (isYearly ? 4 : 3) : (isYearly ? 6 : 5);
          await prisma.subscriptionPlan.upsert({
            where: { id: def.code },
            update: {
              name: def.displayName,
              billingCycle: isYearly ? 'yearly' : 'monthly',
              priceVnd: def.listPriceVnd,
              durationDays: def.durationDays,
              textTurnsQuota: def.limits.text,
              voiceMinsQuota: def.limits.voice,
              assistantQuota: def.limits.assistant,
              isActive: true,
              isPopular: def.code.includes('STANDARD'),
              sortOrder,
            },
            create: {
              id: def.code,
              name: def.displayName,
              billingCycle: isYearly ? 'yearly' : 'monthly',
              priceVnd: def.listPriceVnd,
              durationDays: def.durationDays,
              textTurnsQuota: def.limits.text,
              voiceMinsQuota: def.limits.voice,
              assistantQuota: def.limits.assistant,
              isActive: true,
              isPopular: def.code.includes('STANDARD'),
              sortOrder,
            },
          });
        } catch (seedErr) {
          console.warn('[PLANS_AUTO_SEED_WARN]', seedErr);
        }
      }
    }

    dbPlans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        billingCycle: { in: ['monthly', 'yearly'] },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const plans = dbPlans.map((p) => {
      const rawFeatures = p.features as string[] | null;
      return {
        id: p.id,
        code: p.id,
        name: p.name,
        display_name: p.name,
        billing_cycle: p.billingCycle,
        billingCycle: p.billingCycle,
        price_vnd: Number(p.priceVnd),
        priceVnd: Number(p.priceVnd),
        list_price_vnd: Number(p.priceVnd),
        duration_days: p.durationDays,
        durationDays: p.durationDays,
        text_turns_quota: p.textTurnsQuota,
        textTurnsQuota: p.textTurnsQuota,
        voice_mins_quota: p.voiceMinsQuota,
        voiceMinsQuota: p.voiceMinsQuota,
        assistant_quota: p.assistantQuota,
        assistantQuota: p.assistantQuota,
        limits: {
          text: p.textTurnsQuota,
          voice: p.voiceMinsQuota,
          audio: p.voiceMinsQuota,
          assistant: p.assistantQuota,
        },
        is_popular: p.isPopular,
        isPopular: p.isPopular,
        features: Array.isArray(rawFeatures) ? rawFeatures : [],
        features_vi: Array.isArray(rawFeatures) ? rawFeatures : [],
        features_en: Array.isArray(rawFeatures) ? rawFeatures : [],
        sort_order: p.sortOrder,
      };
    });

    const vipCodes = listVipPassCodes();
    const vipPasses = vipCodes.map((code) => {
      const def = getVipPassDefinition(code);
      return {
        code: def.code,
        display_name: def.displayName,
        list_price_vnd: def.listPriceVnd,
        duration_days: def.durationDays,
        description_vi: def.descriptionVi,
        description_en: def.descriptionEn,
      };
    });

    res.json({
      success: true,
      plans,
      credit_packs: creditPacks,
      vip_passes: vipPasses,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLANS_GET_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}
