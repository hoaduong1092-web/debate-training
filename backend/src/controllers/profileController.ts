/**
 * Profile Analytics & Skill Tree Controller (v15.0.0)
 *
 * Source of Truth: 06_SKILL_TREE_SPEC.md, 07_SCORING_SPEC.md, 08_VOICE_ENGINE_SPEC.md & Blueprint V15.0
 *
 * Handles:
 *   GET /api/v1/profile/analytics   — Thinking Radar (4 axes), Fallacy Diagnostics, WPM & Voice History, Confidence
 *   GET /api/v1/profile/skill-tree  — 7-Level Pedagogical Mastery Ladder, 90.00% Unlock Gate, L3 Socratic Mode
 *
 * STRICT NON-IDENTITY & COST SAFETY:
 *   Zero LLM API calls. Zero quota deductions.
 *   Strict JWT authentication (IDOR-safe: req.userId only).
 *   Pure derived view (no DB mutations or persistent ThinkingProfile table).
 */

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';
import { evaluateThinkingRadar } from '../services/profile/radarCalculator';
import { aggregateFallacies } from '../services/profile/fallacyAggregator';
import { analyzeVoiceTelemetry } from '../services/profile/voiceTelemetry';
import { computeSkillTree } from '../services/profile/skillTreeCalculator';

const prisma = new PrismaClient();

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

function getPeriodCutoffDate(period: AnalyticsPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

/**
 * GET /api/v1/profile/analytics
 * Query params: ?period=7d|30d|90d|all
 */
export async function getProfileAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    // 1. Strict IDOR protection: use authenticated req.userId exclusively
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing authentication token' });
      return;
    }

    // 2. Parse time window filter
    const rawPeriod = (req.query.period as string) || 'all';
    const period: AnalyticsPeriod = ['7d', '30d', '90d', 'all'].includes(rawPeriod)
      ? (rawPeriod as AnalyticsPeriod)
      : 'all';

    const cutoffDate = getPeriodCutoffDate(period);

    // 3. Load user debate sessions and transcripts
    const sessions = await prisma.debateSession.findMany({
      where: {
        userId,
        ...(cutoffDate ? { createdAt: { gte: cutoffDate } } : {}),
      },
      include: {
        transcripts: {
          orderBy: { turnNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Flatten all user transcripts
    const allUserTranscripts = sessions.flatMap(s => (s.transcripts || []).filter(t => t.speakerType === 'user'));

    // 5. Fallacy Diagnostics Engine
    const fallacyResult = aggregateFallacies(allUserTranscripts);

    // 6. Voice Telemetry Engine
    const voiceResult = analyzeVoiceTelemetry(sessions);

    // 7. Thinking Radar Engine
    const radarResult = evaluateThinkingRadar(
      sessions,
      fallacyResult.uniqueFallacyTypesCount,
      voiceResult
    );

    // 8. Evaluate period-relative Confidence (Section 2-D)
    const validSessions = sessions.filter(
      s => (s.transcripts || []).some(t => t.speakerType === 'user') || Number(s.scoreTotal) > 0
    );
    const sampleCount = validSessions.length;

    let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let confidenceMessage = 'Dữ liệu đang hình thành. Hãy hoàn thành thêm phiên đấu để ổn định hồ sơ.';

    if (sampleCount >= 5) {
      confidenceLevel = 'HIGH';
      confidenceMessage = 'Dữ liệu đầy đủ và ổn định.';
    } else if (sampleCount >= 2) {
      confidenceLevel = 'MEDIUM';
      confidenceMessage = 'Độ tin cậy mức trung bình.';
    }

    res.json({
      success: true,
      period,
      confidence: {
        level: confidenceLevel,
        sampleCount,
        minForMedium: 2,
        minForHigh: 5,
        message: confidenceMessage,
      },
      radar: radarResult.radar,
      dataAvailability: radarResult.dataAvailability,
      topFallacies: fallacyResult.topFallacies,
      totalFallaciesDetected: fallacyResult.totalFallaciesDetected,
      voiceMetrics: {
        hasVoiceTelemetry: voiceResult.hasVoiceTelemetry,
        averageWpm: voiceResult.averageWpm,
        optimalBandPercentage: voiceResult.optimalBandPercentage,
        totalVoiceSessions: voiceResult.totalVoiceSessions,
        averageFillerRate: voiceResult.averageFillerRate,
        averagePauseRatio: voiceResult.averagePauseRatio,
      },
      wpmHistory: voiceResult.wpmHistory,
      totalSessionsAnalyzed: sessions.length,
      validSessionsCount: sampleCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PROFILE_ANALYTICS_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * GET /api/v1/profile/skill-tree
 */
export async function getSkillTreeProgress(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing authentication token' });
      return;
    }

    // Load full history for skill mastery tree
    const sessions = await prisma.debateSession.findMany({
      where: { userId },
      include: {
        transcripts: {
          orderBy: { turnNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allUserTranscripts = sessions.flatMap(s => (s.transcripts || []).filter(t => t.speakerType === 'user'));
    const fallacyResult = aggregateFallacies(allUserTranscripts);
    const voiceResult = analyzeVoiceTelemetry(sessions);
    const radarResult = evaluateThinkingRadar(sessions, fallacyResult.uniqueFallacyTypesCount, voiceResult);

    const skillTreeResult = computeSkillTree(sessions, radarResult.radar);

    res.json({
      success: true,
      currentLevel: skillTreeResult.currentLevel,
      unlockedCount: skillTreeResult.unlockedCount,
      totalMasteryScore: skillTreeResult.totalMasteryScore,
      levels: skillTreeResult.levels,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[SKILL_TREE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}
