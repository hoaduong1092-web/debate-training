import path from 'path';
import dotenv from 'dotenv';

// Load .env.local first (Beeknoee credentials), then .env as fallback.
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { executeWithMetering } from '../services/aiGateway';
import { buildLogicCoachPrompt, type LogicCoachHistoryTurn } from '../prompts/logicCoach';
import {
  createOpenAIChatCompletion,
  getOpenAIModel,
  getLogicCoachModel,
} from '../services/openAICompatibleClient';
import { consumeQuota } from '../services/quotaManager';
import { adaptLogicCoachPayload } from '../services/logicCoachParser';
import {
  generateOpponentResponse,
  type OpponentResult,
} from '../services/opponentService';
import {
  OPPONENT_FALLBACK_MESSAGE,
} from '../services/opponentSafety';
import type { HistoryEntry } from '../prompts/opponent';
import { generateTTS } from '../services/voiceStudioClient';
import { VoiceSessionService } from '../services/voiceSessionService';
import { VoiceSessionDomainError } from '../errors/voiceSessionErrors';

const prisma = new PrismaClient();
/** Model used for AI Opponent (reads OPENAI_API_KEY / BEEKNOEE_API_KEY chain). */
const AI_MODEL = getOpenAIModel();
/** Model used for Logic Coach — reads MODEL_LOGIC_COACH → AI_MODEL fallback. */
const LOGIC_COACH_MODEL = getLogicCoachModel();

/**
 * Maximum turns per session.
 * Spec 16 §5.1: Allows extended multi-turn sparring (up to 30 user rounds + 30 AI rounds = 60 turns).
 */
const MAX_TURNS_PER_SESSION = 60;
const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';

// ─── Session Creation ────────────────────────────────────────────────────────

/**
 * POST /api/v1/debates
 *
 * Creates a new debate session and consumes exactly 1 TEXT_DEBATE credit.
 * Quota is consumed ONCE per session — never per turn.
 */
export async function createDebateSession(req: Request, res: Response) {
  try {
    const { userId, topic, character_id, user_side } = req.body;
    const rawMode = req.body.inputMode || req.body.input_mode || 'text';
    const inputMode = String(rawMode).toLowerCase() === 'voice' ? 'voice' : 'text';

    if (!userId || !topic) {
      return res.status(400).json({
        error: 'Missing required fields: userId, topic',
      });
    }

    // Ensure User and Quota exist in DB
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { quota: true },
    });

    if (!existingUser) {
      try {
        await prisma.user.create({
          data: {
            id: userId,
            phoneNumber: userId === DEMO_USER_ID ? '+84901234567' : `+849${Date.now().toString().slice(-8)}`,
            displayName: userId === DEMO_USER_ID ? 'Học Viên Mẫu' : 'Tranh Biện Viên',
            quota: {
              create: {
                textTurnsRemaining: 50,
                voiceMinsRemaining: 30,
                assistantRemaining: 20,
              },
            },
          },
        });
      } catch (e) {
        console.warn('[USER_PROVISION_WARN]', e);
      }
    } else if (!existingUser.quota) {
      try {
        await prisma.userQuota.create({
          data: {
            userId,
            textTurnsRemaining: 50,
            voiceMinsRemaining: 30,
            assistantRemaining: 20,
          },
        });
      } catch (e) {
        console.warn('[QUOTA_PROVISION_WARN]', e);
      }
    }

    const canonicalTopic = topic.trim();

    // ── VOICE MODE FLOW (Decoupled from Text Quota) ──────────────────────────
    if (inputMode === 'voice') {
      // 1. Resolve Voice Entitlement without mutating quota
      const entitlement = await VoiceSessionService.resolveVoiceEntitlement(userId);
      if (!entitlement.allowed) {
        return res.status(403).json({
          error: 'VOICE_QUOTA_EXCEEDED',
          code: 'VOICE_QUOTA_EXCEEDED',
          message: entitlement.reason || 'Hạn mức phút Voice AI đã hết (cần tối thiểu 1 phút để bắt đầu phiên).',
          dimension: 'voice',
          available_minutes: entitlement.availableMinutes,
        });
      }

      // 2. Guard against concurrent active voice sessions
      const activeSession = await prisma.voiceSession.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'FINALIZING'] },
        },
      });

      if (activeSession) {
        return res.status(409).json({
          error: 'VOICE_SESSION_ALREADY_ACTIVE',
          code: 'VOICE_SESSION_ALREADY_ACTIVE',
          message: 'Bạn đang có một phiên Voice đang hoạt động. Vui lòng hoàn thành phiên hiện tại trước khi bắt đầu phiên mới.',
          details: { activeSessionId: activeSession.id },
        });
      }

      // 3. Compute server-enforced max duration cap
      const MAX_SESSION_DURATION_MS = 900_000; // 15 minutes
      const maxAllowedMs =
        entitlement.mode === 'TIME_UNLIMITED'
          ? MAX_SESSION_DURATION_MS
          : Math.min(
              MAX_SESSION_DURATION_MS,
              Math.max(60_000, (entitlement.availableMinutes ?? 15) * 60_000),
            );

      // 4. Transactionally create DebateSession + VoiceSession
      const { debateSession, voiceSession } = await prisma.$transaction(async (tx) => {
        const dSession = await tx.debateSession.create({
          data: {
            userId,
            topic: canonicalTopic,
            characterId: character_id ?? 'default',
            userSide: user_side ?? 'AFFIRMATIVE',
            inputMode: 'voice',
            status: 'IN_PROGRESS',
          },
        });

        const vSession = await tx.voiceSession.create({
          data: {
            userId,
            debateSessionId: dSession.id,
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

        return { debateSession: dSession, voiceSession: vSession };
      });

      return res.status(201).json({
        success: true,
        session: {
          id: debateSession.id,
          topic: debateSession.topic,
          character_id: debateSession.characterId,
          user_side: debateSession.userSide,
          input_mode: 'voice',
          max_turns: MAX_TURNS_PER_SESSION,
          status: debateSession.status,
        },
        voice_session: {
          id: voiceSession.id,
          debate_session_id: debateSession.id,
          status: voiceSession.status,
          max_allowed_ms: voiceSession.maxAllowedMs,
          started_at: voiceSession.startedAt.toISOString(),
        },
      });
    }

    // ── TEXT MODE FLOW (Consumes exactly 1 TEXT_DEBATE credit) ───────────────
    let quotaResult = await consumeQuota(userId, 'TEXT_DEBATE', 1);
    if (quotaResult.decision !== 'ALLOW' && userId === DEMO_USER_ID) {
      try {
        await prisma.userQuota.upsert({
          where: { userId },
          update: { textTurnsRemaining: 50, voiceMinsRemaining: 30, assistantRemaining: 20 },
          create: { userId, textTurnsRemaining: 50, voiceMinsRemaining: 30, assistantRemaining: 20 },
        });
        quotaResult = await consumeQuota(userId, 'TEXT_DEBATE', 1);
      } catch (e) {
        console.warn('[DEMO_QUOTA_RESET_WARN]', e);
      }
    }

    if (quotaResult.decision !== 'ALLOW') {
      const code =
        quotaResult.error?.code ??
        (quotaResult.decision === 'QUOTA_EXCEEDED'
          ? 'QUOTA_EXCEEDED'
          : 'QUOTA_UNDEFINED');
      return res.status(403).json({
        error: code,
        code,
        message:
          quotaResult.error?.message ??
          (code === 'QUOTA_EXCEEDED'
            ? 'Text debate quota exceeded for the current billing period.'
            : 'Quota or subscription does not allow this action.'),
        dimension: quotaResult.dimension,
      });
    }

    const session = await prisma.debateSession.create({
      data: {
        userId,
        topic: canonicalTopic,
        characterId: character_id ?? 'default',
        userSide: user_side ?? 'AFFIRMATIVE',
        inputMode: 'text',
        status: 'IN_PROGRESS',
      },
    });

    return res.status(201).json({
      success: true,
      session: {
        id: session.id,
        topic: session.topic,
        character_id: session.characterId,
        user_side: session.userSide,
        input_mode: 'text',
        max_turns: MAX_TURNS_PER_SESSION,
        status: session.status,
      },
    });
  } catch (error: any) {
    console.error('Create Debate Session Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// ─── Message Handler ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/arena/sessions/:sessionId/message
 *
 * Handles a debate turn with parallel AI execution.
 */
export async function handleDebateMessage(req: Request, res: Response) {
  try {
    const rawSessionId = req.params.sessionId;
    const { userId, content, stance, topic, coachHistory, voiceMetrics, argumentContext } = req.body;

    if (typeof rawSessionId !== 'string' || !rawSessionId) {
      return res.status(400).json({ error: 'Invalid or missing sessionId' });
    }

    const sessionId: string = rawSessionId;

    if (!userId || !content || !stance) {
      return res.status(400).json({ error: 'Missing required fields: userId, content, stance' });
    }

    // 1. Verify session exists.
    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        error: 'SESSION_NOT_FOUND',
        message: 'Debate session not found.',
      });
    }

    // 2. Verify session is still in progress.
    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        error: 'SESSION_COMPLETED',
        message: 'This debate session has reached the maximum turn limit.',
      });
    }

    // 3. Count existing transcript entries to determine turn number.
    const existingTurnCount = await prisma.debateTranscript.count({
      where: { sessionId },
    });

    if (existingTurnCount >= MAX_TURNS_PER_SESSION) {
      await prisma.debateSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' },
      });
      return res.status(400).json({
        error: 'SESSION_COMPLETED',
        message: 'This debate session has reached the maximum turn limit.',
      });
    }

    const userTurnNumber = existingTurnCount + 1;
    const opponentTurnNumber = existingTurnCount + 2;

    // 3a. Topic sync — update DebateSession.topic if req.body.topic differs.
    const incomingTopic = typeof topic === 'string' ? topic.trim() : '';
    if (incomingTopic && incomingTopic !== session.topic) {
      await prisma.debateSession.update({
        where: { id: sessionId },
        data: { topic: incomingTopic },
      });
      (session as any).topic = incomingTopic;
      console.info('[TOPIC_SYNC] Updated session topic:', {
        sessionId,
        from: session.topic,
        to: incomingTopic,
      });
    }

    // 4. Persist user turn to DebateTranscript.
    const userTranscript = await prisma.debateTranscript.create({
      data: {
        sessionId,
        speakerType: 'user',
        turnNumber: userTurnNumber,
        textContent: content,
      },
    });

    // 5. Load conversation history from persisted transcripts.
    const MAX_HISTORY_ENTRIES = 4;
    const transcripts = await prisma.debateTranscript.findMany({
      where: {
        sessionId,
        turnNumber: { lt: userTurnNumber },
      },
      orderBy: { turnNumber: 'desc' },
      take: MAX_HISTORY_ENTRIES,
      select: { speakerType: true, textContent: true },
    });

    transcripts.reverse();

    const history: HistoryEntry[] = transcripts.map((t) => ({
      speaker: t.speakerType === 'user' ? 'Người dùng' : 'Đối thủ AI',
      text: t.textContent,
    }));

    // 6. PARALLEL EXECUTION.
    const userSide = (session.userSide ?? stance) as 'AFFIRMATIVE' | 'NEGATIVE';

    const [opponentSettled, coachSettled] = await Promise.allSettled([
      // AI Opponent
      generateOpponentResponse({
        userId,
        sessionId,
        topic: session.topic,
        userSide,
        content,
        history,
        turnNumber: userTurnNumber,
        characterId: session.characterId,
        targetArgument: argumentContext,
      }),
      // Logic Coach
      (async () => {
        const { systemPrompt, userPrompt } = buildLogicCoachPrompt({
          topic: session.topic,
          stance: userSide,
          content,
          history: Array.isArray(coachHistory)
            ? (coachHistory as LogicCoachHistoryTurn[])
            : (history as LogicCoachHistoryTurn[]),
          targetArgument: argumentContext,
        });

        return executeWithMetering({
          userId,
          sessionId,
          serviceType: 'LLM_COACH',
          modelName: LOGIC_COACH_MODEL,
          taskName: 'Logic_Coach_Analysis',
          apiCallFunction: async () => {
            const completion = await createOpenAIChatCompletion({
              model: LOGIC_COACH_MODEL,
              systemPrompt,
              userPrompt,
              temperature: 0.7,
              max_tokens: 1500,
              response_format: { type: 'json_object' },
            });

            const parsedJson = adaptLogicCoachPayload(completion.content);

            return {
              content: parsedJson,
              usage: {
                prompt_tokens: completion.usage.prompt_tokens,
                completion_tokens: completion.usage.completion_tokens,
              },
              _gateway: completion._gateway,
            };
          },
        });
      })(),
    ]);

    // 7. Apply Failure Matrix.
    const opponentSuccess = opponentSettled.status === 'fulfilled';
    const coachSuccess = coachSettled.status === 'fulfilled';

    if (!opponentSuccess && !coachSuccess) {
      console.error('[BOTH_FAIL] Opponent:', (opponentSettled as PromiseRejectedResult).reason);
      console.error('[BOTH_FAIL] Coach:', (coachSettled as PromiseRejectedResult).reason);
      await prisma.debateTranscript.delete({ where: { id: userTranscript.id } });
      return res.status(502).json({
        success: false,
        error: 'AI_SERVICE_UNAVAILABLE',
        message: 'Hệ thống AI đang gặp sự cố tạm thời. Vui lòng thử lại sau.',
        retry: true,
      });
    }

    let opponentResult: OpponentResult | null = null;
    let opponentText = OPPONENT_FALLBACK_MESSAGE;
    let opponentTelemetry = { tokens: { prompt_tokens: 0, completion_tokens: 0 }, execution_ms: 0 };

    if (opponentSuccess) {
      opponentResult = (opponentSettled as PromiseFulfilledResult<OpponentResult>).value;
      opponentText = opponentResult.text;
      opponentTelemetry = {
        tokens: opponentResult.usage,
        execution_ms: opponentResult.execution_ms,
      };
    } else {
      console.error('[OPPONENT_FAIL]', (opponentSettled as PromiseRejectedResult).reason);
    }

    let coachFeedback: any = null;
    let coachTelemetry = { tokens: { prompt_tokens: 0, completion_tokens: 0 }, execution_ms: 0 };

    if (coachSuccess) {
      const coachResult = (coachSettled as PromiseFulfilledResult<any>).value;
      coachFeedback = coachResult.content;
      coachTelemetry = {
        tokens: coachResult.usage,
        execution_ms: coachResult.execution_ms,
      };
    } else {
      console.error('[COACH_FAIL]', (coachSettled as PromiseRejectedResult).reason);
    }

    // 7b. Generate local TTS audio via VoiceStudio microservice (if online)
    let opponentAudioPath: string | null = null;
    if (opponentText && opponentText !== OPPONENT_FALLBACK_MESSAGE) {
      try {
        const ttsResult = await generateTTS(opponentText, session.characterId || 'sonTung', 'vi');
        if (ttsResult.success && ttsResult.audioPath) {
          opponentAudioPath = ttsResult.audioPath;
          console.info('[VOICESTUDIO_TTS] Generated local opponent audio:', opponentAudioPath);
        }
      } catch (err: any) {
        console.warn('[VOICESTUDIO_TTS] Local TTS skipped, graceful text fallback:', err.message);
      }
    }

    // 8. Persist opponent turn to DebateTranscript.
    await prisma.debateTranscript.create({
      data: {
        sessionId,
        speakerType: 'ai',
        turnNumber: opponentTurnNumber,
        textContent: opponentText,
        audioPath: opponentAudioPath,
      },
    });

    // 9. Attach coach evaluation metadata to user transcript.
    const voiceTelemetry =
      voiceMetrics &&
      typeof voiceMetrics === 'object' &&
      typeof voiceMetrics.wpm === 'number'
        ? {
            wpm: voiceMetrics.wpm as number,
            filler_count: voiceMetrics.fillerCount as number,
            duration_ms: voiceMetrics.durationMs as number,
            tier: (voiceMetrics.tier as string) ?? null,
            stt_source: (voiceMetrics.stt_source as string) ?? null,
          }
        : null;

    if (coachFeedback || voiceTelemetry) {
      const existingFallacies: string[] =
        coachFeedback?.fallacies_detected ?? coachFeedback?.fallacies ?? [];

      const fallaciesWithVoice = voiceTelemetry
        ? [...existingFallacies, `__voice__${JSON.stringify(voiceTelemetry)}`]
        : existingFallacies;

      const coachSnapshot = coachFeedback
        ? {
            score: coachFeedback.score ?? null,
            cre_analysis: coachFeedback.cre_analysis ?? null,
            strengths: coachFeedback.strengths ?? [],
            weaknesses: coachFeedback.weaknesses ?? [],
            actionable_suggestions: coachFeedback.actionable_suggestions ?? [],
          }
        : null;

      const fallaciesWithCoach = coachSnapshot
        ? [...fallaciesWithVoice, `__coach__${JSON.stringify(coachSnapshot)}`]
        : fallaciesWithVoice;

      await prisma.debateTranscript.update({
        where: { id: userTranscript.id },
        data: {
          ...(fallaciesWithCoach.length > 0
            ? { fallaciesDetected: fallaciesWithCoach as unknown as import('@prisma/client').Prisma.InputJsonValue }
            : {}),
          evidenceStar: coachFeedback?.evidence_star ?? 1,
        },
      });

      if (voiceTelemetry) {
        console.info('[VOICE_TELEMETRY] Persisted for turn', userTurnNumber, voiceTelemetry);
      }
      if (coachSnapshot) {
        console.info('[COACH_SNAPSHOT] Persisted for turn', userTurnNumber, 'score:', coachSnapshot.score);
      }
    }

    // 10. Check if session should be completed after this turn and update running scoreTotal.
    const totalTurnsAfter = existingTurnCount + 2;
    let sessionCompleted = false;
    if (totalTurnsAfter >= MAX_TURNS_PER_SESSION) {
      sessionCompleted = true;
    }

    // Compute and persist running scoreTotal across all user turns in this session
    try {
      const allUserTurns = await prisma.debateTranscript.findMany({
        where: { sessionId, speakerType: 'user' },
        select: { fallaciesDetected: true, evidenceStar: true },
      });
      const scores: number[] = [];
      for (const ut of allUserTurns) {
        let found = false;
        if (Array.isArray(ut.fallaciesDetected)) {
          for (const item of ut.fallaciesDetected) {
            if (typeof item === 'string' && item.startsWith('__coach__')) {
              try {
                const parsed = JSON.parse(item.slice(9));
                if (typeof parsed.score === 'number' && parsed.score > 0) {
                  scores.push(parsed.score);
                  found = true;
                  break;
                }
              } catch {}
            }
          }
        }
        if (!found && ut.evidenceStar) {
          scores.push(Math.min(10, Math.max(1, ut.evidenceStar * 2)));
        }
      }
      const runningScore = scores.length > 0
        ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : (coachFeedback?.score || 7.8);

      await prisma.debateSession.update({
        where: { id: sessionId },
        data: {
          scoreTotal: runningScore,
          ...(sessionCompleted ? { status: 'COMPLETED' } : {}),
        },
      });
    } catch (scoreUpdateErr) {
      console.warn('[SCORE_UPDATE_ERROR]', scoreUpdateErr);
    }

    const turnsRemaining = Math.max(0, MAX_TURNS_PER_SESSION - totalTurnsAfter);

    return res.status(200).json({
      success: true,
      data: {
        opponent_response: {
          text: opponentText,
          character_id: session.characterId,
          audio_path: opponentAudioPath,
          audio_url: opponentAudioPath,
        },
        coach_feedback: coachFeedback,
        voice_telemetry: voiceTelemetry ?? null,
      },
      telemetry: {
        opponent: opponentTelemetry,
        coach: coachTelemetry,
      },
      turn_number: userTurnNumber,
      turns_remaining: turnsRemaining,
      ...(sessionCompleted ? { session_completed: true } : {}),
    });
  } catch (error: any) {
    console.error('Debate Message Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// ─── History: List User Sessions ─────────────────────────────────────────────

export async function listUserSessions(req: Request, res: Response): Promise<void> {
  try {
    const queryUserId = String(req.query['userId'] ?? '').trim();
    const authUserId = (req as { userId?: string }).userId;
    const userId = queryUserId || authUserId || DEMO_USER_ID;

    const rawLimit = parseInt(String(req.query['limit'] ?? '20'), 10);
    const rawOffset = parseInt(String(req.query['offset'] ?? '0'), 10);
    const limit = Math.min(isNaN(rawLimit) ? 20 : rawLimit, 50);
    const offset = isNaN(rawOffset) ? 0 : rawOffset;

    const sessions = await prisma.debateSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        transcripts: {
          select: {
            id: true,
            speakerType: true,
            turnNumber: true,
            evidenceStar: true,
            fallaciesDetected: true,
          },
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    const total = await prisma.debateSession.count({ where: { userId } });

    const data = sessions.map((s) => {
      const userTurns = s.transcripts.filter((t) => t.speakerType === 'user');
      const lastStar = [...userTurns]
        .reverse()
        .find((t) => t.evidenceStar != null)?.evidenceStar ?? null;

      let scoreNum = Number(s.scoreTotal);
      if (!scoreNum || scoreNum <= 0) {
        const scores: number[] = [];
        for (const ut of userTurns) {
          let found = false;
          if (Array.isArray(ut.fallaciesDetected)) {
            for (const item of ut.fallaciesDetected) {
              if (typeof item === 'string' && item.startsWith('__coach__')) {
                try {
                  const parsed = JSON.parse(item.slice(9));
                  if (typeof parsed.score === 'number' && parsed.score > 0) {
                    scores.push(parsed.score);
                    found = true;
                    break;
                  }
                } catch {}
              }
            }
          }
          if (!found && ut.evidenceStar) {
            scores.push(Math.min(10, Math.max(1, ut.evidenceStar * 2)));
          }
        }
        scoreNum = scores.length > 0
          ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
          : (userTurns.length > 0 ? 7.8 : 8.0);
      }

      return {
        id: s.id,
        topic: s.topic,
        topic_title: s.topic,
        status: s.status,
        character_id: s.characterId,
        user_side: s.userSide,
        input_mode: s.inputMode || 'text',
        score_total: scoreNum,
        score_content: Math.min(10, +(scoreNum * 0.98).toFixed(1)),
        score_style: Math.min(10, +(scoreNum * 1.02).toFixed(1)),
        score_strategy: Math.min(10, +(scoreNum * 0.95).toFixed(1)),
        turn_count: Math.max(1, userTurns.length),
        last_evidence_star: lastStar,
        created_at: s.createdAt.toISOString(),
      };
    });

    res.json({
      success: true,
      total,
      limit,
      offset,
      sessions: data,
    });
  } catch (error: any) {
    console.error('[LIST_SESSIONS_ERROR]', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// ─── History: Get Session Detail (Static Replay Data) ──────────────────────────

export async function getSessionDetail(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = String(req.params['sessionId'] ?? '').trim();
    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId param' });
      return;
    }

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const transcripts = await prisma.debateTranscript.findMany({
      where: { sessionId },
      orderBy: { turnNumber: 'asc' },
    });

    const turns = transcripts.map((t) => {
      let fallacies: string[] = [];
      let coachFeedback: any = null;
      let voiceTelemetry: any = null;

      if (Array.isArray(t.fallaciesDetected)) {
        for (const item of t.fallaciesDetected) {
          if (typeof item === 'string') {
            if (item.startsWith('__coach__')) {
              try {
                coachFeedback = JSON.parse(item.slice(9));
              } catch {}
            } else if (item.startsWith('__voice__')) {
              try {
                voiceTelemetry = JSON.parse(item.slice(9));
              } catch {}
            } else {
              fallacies.push(item);
            }
          }
        }
      }

      // If no stored coach snapshot, provide structured C-R-E fallback from stored turn
      if (!coachFeedback && t.speakerType === 'user') {
        coachFeedback = {
          score: 8.0,
          cre_analysis: {
            claim: 'Luận điểm rõ ràng, trực diện với kiến nghị.',
            reasoning: 'Mạch liên kết nguyên nhân - kết quả logic.',
            evidence: 'Cần bổ sung dẫn chứng định lượng.',
          },
          fallacies_detected: fallacies,
          strengths: ['Bảo vệ tốt lập trường', 'Lập luận mạch lạc'],
          weaknesses: ['Chưa mở rộng phản biện đa chiều'],
          actionable_suggestions: ['Bổ sung số liệu thực tế để tăng sức thuyết phục'],
        };
      }

      return {
        id: t.id,
        speaker_type: t.speakerType,
        speakerType: t.speakerType,
        turn_number: t.turnNumber,
        turnNumber: t.turnNumber,
        text_content: t.textContent,
        textContent: t.textContent,
        audio_path: t.audioPath || null,
        audioPath: t.audioPath || null,
        fallacies_detected: fallacies,
        fallacies,
        evidence_star: t.evidenceStar,
        evidenceStar: t.evidenceStar,
        coach_feedback: coachFeedback,
        coachFeedback,
        voice_metrics: voiceTelemetry,
        voiceMetrics: voiceTelemetry,
        created_at: t.createdAt.toISOString(),
      };
    });

    let scoreNum = Number(session.scoreTotal);
    if (!scoreNum || scoreNum <= 0) {
      const userTurns = turns.filter((t) => (t.speaker_type || t.speakerType) === 'user');
      const scores = userTurns
        .map((t) => t.coach_feedback?.score || (t.evidence_star ? Math.min(10, t.evidence_star * 2) : null))
        .filter((sc): sc is number => typeof sc === 'number' && sc > 0);
      scoreNum = scores.length > 0
        ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : (userTurns.length > 0 ? 7.8 : 8.0);
    }

    const sessionPayload = {
      id: session.id,
      topic: session.topic,
      topic_title: session.topic,
      status: session.status,
      character_id: session.characterId,
      user_side: session.userSide,
      input_mode: session.inputMode || 'text',
      score_total: scoreNum,
      score_content: Math.min(10, +(scoreNum * 0.98).toFixed(1)),
      score_style: Math.min(10, +(scoreNum * 1.02).toFixed(1)),
      score_strategy: Math.min(10, +(scoreNum * 0.95).toFixed(1)),
      max_turns: MAX_TURNS_PER_SESSION,
      created_at: session.createdAt.toISOString(),
    };

    res.json({
      success: true,
      session: sessionPayload,
      turns,
      transcripts: turns,
    });
  } catch (error: any) {
    console.error('[GET_SESSION_DETAIL_ERROR]', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// ─── Delete Session ───────────────────────────────────────────────────────────

export async function deleteSession(req: Request, res: Response) {
  try {
    const sessionId = String(req.params.sessionId ?? '');
    const userId = (req as { userId?: string }).userId ?? (req.body as { userId?: string })?.userId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (userId && session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: session belongs to another user' });
    }

    await prisma.debateTranscript.deleteMany({ where: { sessionId } });
    await prisma.debateSession.delete({ where: { id: sessionId } });

    return res.json({ success: true, deleted: sessionId });
  } catch (error: any) {
    console.error('[DELETE_SESSION_ERROR]', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// ─── Complete Session ─────────────────────────────────────────────────────────

export async function completeSession(req: Request, res: Response) {
  try {
    const sessionId = String(req.params.sessionId ?? '');
    const userId =
      (req as { userId?: string }).userId ??
      (req.body as { userId?: string })?.userId;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const session = await prisma.debateSession.findUnique({
      where: { id: sessionId },
      include: {
        transcripts: {
          orderBy: { turnNumber: 'asc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (userId && session.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: session belongs to another user' });
    }

    if (session.status !== 'COMPLETED') {
      await prisma.debateSession.update({
        where: { id: sessionId },
        data: { status: 'COMPLETED' },
      });
    }

    const userTurns = session.transcripts.filter((t) => t.speakerType === 'user');
    const turnCount = userTurns.length;

    return res.json({
      success: true,
      session: {
        id: session.id,
        topic: session.topic,
        status: 'COMPLETED',
        turn_count: turnCount,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[COMPLETE_SESSION_ERROR]', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

// ─── Bulk Delete Sessions ─────────────────────────────────────────────────────

export async function handleBulkDeleteSessions(req: Request, res: Response) {
  try {
    const userId =
      (req as { userId?: string }).userId ??
      (req.body as { userId?: string })?.userId;

    const { sessionIds, deleteAll } = req.body as {
      sessionIds?: string[];
      deleteAll?: boolean;
    };

    if (!deleteAll && !Array.isArray(sessionIds)) {
      return res.status(400).json({
        error: 'Provide sessionIds array or set deleteAll: true',
      });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    let targetSessionIds: string[];

    if (deleteAll) {
      const userSessions = await prisma.debateSession.findMany({
        where: { userId },
        select: { id: true },
      });
      targetSessionIds = userSessions.map((s) => s.id);
    } else {
      const owned = await prisma.debateSession.findMany({
        where: { id: { in: sessionIds }, userId },
        select: { id: true },
      });
      targetSessionIds = owned.map((s) => s.id);
    }

    if (targetSessionIds.length === 0) {
      return res.json({ success: true, deletedCount: 0 });
    }

    await prisma.debateTranscript.deleteMany({
      where: { sessionId: { in: targetSessionIds } },
    });

    const { count } = await prisma.debateSession.deleteMany({
      where: { id: { in: targetSessionIds } },
    });

    console.info('[BULK_DELETE] userId:', userId, '| count:', count);
    return res.json({ success: true, deletedCount: count });
  } catch (error: any) {
    console.error('[BULK_DELETE_ERROR]', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
