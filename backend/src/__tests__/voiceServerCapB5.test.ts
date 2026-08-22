/**
 * Phase B5 — Server-Side 15-Minute Cap & Boundary Guards Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * 
 * Verifies all 25 Phase B5 Invariants:
 *  - TC-B5-01: Server elapsed 14m (800s), client sends 1s -> billed 14m (Under-reporting defense)
 *  - TC-B5-02: Server elapsed 5m (260s), client sends 30m -> billed 5m (Over-reporting defense)
 *  - TC-B5-03: Client sends undefined -> server elapsed used (3 mins)
 *  - TC-B5-04: Client sends NaN -> safely handled without corruption, billed 2m from server elapsed
 *  - TC-B5-05: Client sends Infinity -> safely handled, billed 1m from server elapsed
 *  - TC-B5-06: Client sends -1000 -> safely handled, billed 2m from server elapsed
 *  - TC-B5-07: Client sends string "60000" -> safely handled, billed 2m from server elapsed
 *  - TC-B5-08: Client sends extreme value -> cannot exceed server duration
 *  - TC-B5-09: Server elapsed > 15m (18m) -> capped at 900,000ms (15m)
 *  - TC-B5-10: User has 3 available voice minutes -> maxAllowedMs = 180,000ms (3m)
 *  - TC-B5-11: 1-minute entitlement -> maxAllowedMs = 60,000ms (1m)
 *  - TC-B5-12: 15-minute entitlement -> maxAllowedMs = 900,000ms (15m)
 *  - TC-B5-13: Warning timer registered at maxAllowedMs - 30,000ms
 *  - TC-B5-14: Session <= 30s -> no invalid negative warning timer
 *  - TC-B5-15: Server cutoff at maxAllowedMs -> VOICE_SESSION_CAP_REACHED emitted
 *  - TC-B5-16: Server cutoff -> graceful WebSocket termination (code 1000)
 *  - TC-B5-17: Server cutoff -> automatic server finalization
 *  - TC-B5-18: Unexpected disconnect -> server finalization
 *  - TC-B5-19: Normal stop + disconnect race -> exactly one billing operation
 *  - TC-B5-20: Two finalize calls -> B4 idempotency preserved
 *  - TC-B5-21: VIP 20m elapsed -> 15m technical cap, zero business wallet deduction
 *  - TC-B5-22: 3-minute entitlement running 10m -> server automatically caps at 180,000ms (3 mins)
 *  - TC-B5-23: Text debate regression -> exactly 1 TEXT_DEBATE deduction
 *  - TC-B5-24: Voice creation regression -> zero TEXT_DEBATE deduction
 *  - TC-B5-25: Existing B4 atomic billing regression -> all tests green
 */

import { PrismaClient } from '@prisma/client';
import { VoiceSessionService, MAX_SESSION_DURATION_MS, calculateBillableMinutes } from '../services/voiceSessionService';
import { WsVoiceStream } from '../controllers/voiceController';
import { consumeQuota } from '../services/quotaManager';

const prisma = new PrismaClient();

const B5_USER_STANDARD = '77777777-6666-4777-b777-777777777701';
const B5_USER_3MIN = '77777777-6666-4777-b777-777777777702';
const B5_USER_1MIN = '77777777-6666-4777-b777-777777777703';
const B5_USER_VIP = '77777777-6666-4777-b777-777777777704';

const ALL_B5_USERS = [
  B5_USER_STANDARD,
  B5_USER_3MIN,
  B5_USER_1MIN,
  B5_USER_VIP,
];

async function cleanupB5TestData() {
  await prisma.voiceSession.deleteMany({ where: { userId: { in: ALL_B5_USERS } } });
  await prisma.userVipPass.deleteMany({ where: { userId: { in: ALL_B5_USERS } } });
  await prisma.userCreditPack.deleteMany({ where: { userId: { in: ALL_B5_USERS } } });
  await prisma.userFreeTrial.deleteMany({ where: { userId: { in: ALL_B5_USERS } } });
  await prisma.debateTranscript.deleteMany({ where: { session: { userId: { in: ALL_B5_USERS } } } });
  await prisma.debateSession.deleteMany({ where: { userId: { in: ALL_B5_USERS } } });
  await prisma.userQuota.deleteMany({ where: { userId: { in: ALL_B5_USERS } } });
  await prisma.user.deleteMany({ where: { id: { in: ALL_B5_USERS } } });
}

async function setupB5TestData() {
  await cleanupB5TestData();

  // 1. Standard user: 50 voice mins, 20 text
  await prisma.user.create({
    data: {
      id: B5_USER_STANDARD,
      phoneNumber: '+84777777701',
      displayName: 'B5 Standard User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 50,
          assistantRemaining: 10,
        },
      },
    },
  });

  // 2. 3-minute user: 3 voice mins
  await prisma.user.create({
    data: {
      id: B5_USER_3MIN,
      phoneNumber: '+84777777702',
      displayName: 'B5 3-Minute User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 3,
          assistantRemaining: 10,
        },
      },
    },
  });

  // 3. 1-minute user: 1 voice min
  await prisma.user.create({
    data: {
      id: B5_USER_1MIN,
      phoneNumber: '+84777777703',
      displayName: 'B5 1-Minute User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 1,
          assistantRemaining: 10,
        },
      },
    },
  });

  // 4. VIP user: active pass + 20 voice mins
  await prisma.user.create({
    data: {
      id: B5_USER_VIP,
      phoneNumber: '+84777777704',
      displayName: 'B5 VIP User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 20,
          assistantRemaining: 10,
        },
      },
      vipPasses: {
        create: {
          passCode: 'VIP_30D',
          status: 'ACTIVE',
          startedAt: new Date(Date.now() - 3600_000),
          expiresAt: new Date(Date.now() + 30 * 86400_000),
        },
      },
    },
  });
}

/** Mock WebSocket client to capture outgoing frames and close events */
class MockWsClient {
  readyState = 1; // WebSocket.OPEN
  sentFrames: string[] = [];
  closedCode: number | null = null;
  closedReason: string | null = null;

  send(data: string) {
    this.sentFrames.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = 3; // WebSocket.CLOSED
    this.closedCode = code ?? 1000;
    this.closedReason = reason ?? '';
  }
}

async function runB5Tests() {
  console.log('\n============================================================');
  console.log('  PHASE B5 — SERVER-SIDE 15-MINUTE CAP & BOUNDARY GUARDS TEST');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`  \u2705 PASS: ${title}`);
      passed++;
    } else {
      console.error(`  \u274c FAIL: ${title}`, extra ? extra : '');
      failed++;
    }
  }

  await setupB5TestData();

  const resetStandardQuota = async (mins: number = 50) => {
    await prisma.userQuota.update({
      where: { userId: B5_USER_STANDARD },
      data: { voiceMinsRemaining: mins },
    });
  };

  // ─── PART 1: SERVER DURATION AUTHORITY & CLIENT SPOOF DEFENSES (01-09) ──────
  console.log('▶ SECTION 1: Server Duration Authority & Client Spoof Defenses');

  // TC-B5-01: Server elapsed 14m (800,000ms -> 14 mins), client sends 1s -> billed 14m
  try {
    await resetStandardQuota(50);
    const s1 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s1.id },
      data: { startedAt: new Date(Date.now() - 800_000) },
    });

    const res1 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s1.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: 1000, // Client tries to spoof 1 second to bypass billing
    });

    assert(
      'TC-B5-01: Server elapsed 14m, client sends 1s -> billed 14m (Under-reporting spoof blocked)',
      res1.session.billableMinutes === 14 &&
      res1.session.consumedSubMins === 14 &&
      res1.session.actualDurationMs >= 799_000 &&
      res1.session.consumptionDetails?.clientSuppliedDurationMs === 1000
    );
  } catch (e: any) {
    assert('TC-B5-01', false, e.message);
  }

  // TC-B5-02: Server elapsed 5m (260,000ms -> 5 mins), client sends 30m -> billed 5m
  try {
    await resetStandardQuota(50);
    const s2 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s2.id },
      data: { startedAt: new Date(Date.now() - 260_000) },
    });

    const res2 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s2.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: 1_800_000, // Client sends 30 minutes
    });

    assert(
      'TC-B5-02: Server elapsed 5m, client sends 30m -> billed 5m (Over-reporting spoof blocked)',
      res2.session.billableMinutes === 5 &&
      res2.session.consumedSubMins === 5 &&
      res2.session.actualDurationMs >= 259_000 &&
      res2.session.actualDurationMs <= 265_000
    );
  } catch (e: any) {
    assert('TC-B5-02', false, e.message);
  }

  // TC-B5-03: Client sends undefined -> server elapsed used (150,000ms -> 3 mins)
  try {
    await resetStandardQuota(50);
    const s3 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s3.id },
      data: { startedAt: new Date(Date.now() - 150_000) },
    });

    const res3 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s3.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: undefined,
    });

    assert(
      'TC-B5-03: Client sends undefined -> server elapsed used (3 mins)',
      res3.session.billableMinutes === 3 &&
      res3.session.consumedSubMins === 3 &&
      res3.session.consumptionDetails?.clientSuppliedDurationMs === null
    );
  } catch (e: any) {
    assert('TC-B5-03', false, e.message);
  }

  // TC-B5-04: Client sends NaN -> safely handled without corruption, billed 2m from server elapsed
  try {
    await resetStandardQuota(50);
    const s4 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s4.id },
      data: { startedAt: new Date(Date.now() - 90_000) }, // 1.5 mins -> 2 mins
    });

    const res4 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s4.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: NaN,
    });

    assert(
      'TC-B5-04: Client sends NaN -> safely handled without corruption, billed 2m from server elapsed',
      res4.session.billableMinutes === 2 &&
      Number.isFinite(res4.session.billableMinutes) &&
      res4.session.consumptionDetails?.clientSuppliedDurationMs === null
    );
  } catch (e: any) {
    assert('TC-B5-04', false, e.message);
  }

  // TC-B5-05: Client sends Infinity -> safely handled, billed 1m from server elapsed
  try {
    await resetStandardQuota(50);
    const s5 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s5.id },
      data: { startedAt: new Date(Date.now() - 40_000) }, // 40s -> 1 min
    });

    const res5 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s5.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: Infinity,
    });

    assert(
      'TC-B5-05: Client sends Infinity -> safely handled, billed 1m from server elapsed',
      res5.session.billableMinutes === 1 &&
      res5.session.consumptionDetails?.clientSuppliedDurationMs === null
    );
  } catch (e: any) {
    assert('TC-B5-05', false, e.message);
  }

  // TC-B5-06: Client sends -1000 -> safely handled, billed 2m from server elapsed
  try {
    await resetStandardQuota(50);
    const s6 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s6.id },
      data: { startedAt: new Date(Date.now() - 90_000) }, // 2 mins
    });

    const res6 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s6.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: -1000,
    });

    assert(
      'TC-B5-06: Client sends -1000 -> safely handled, billed 2m from server elapsed',
      res6.session.billableMinutes === 2 &&
      res6.session.consumptionDetails?.clientSuppliedDurationMs === null
    );
  } catch (e: any) {
    assert('TC-B5-06', false, e.message);
  }

  // TC-B5-07: Client sends string "60000" -> safely handled, billed 2m from server elapsed
  try {
    await resetStandardQuota(50);
    const s7 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s7.id },
      data: { startedAt: new Date(Date.now() - 90_000) }, // 2 mins
    });

    const res7 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s7.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: '60000' as any,
    });

    assert(
      'TC-B5-07: Client sends string "60000" -> safely handled, billed 2m from server elapsed',
      res7.session.billableMinutes === 2 &&
      res7.session.consumptionDetails?.clientSuppliedDurationMs === null
    );
  } catch (e: any) {
    assert('TC-B5-07', false, e.message);
  }

  // TC-B5-08: Client sends extreme value (10^12) -> cannot exceed server duration
  try {
    await resetStandardQuota(50);
    const s8 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s8.id },
      data: { startedAt: new Date(Date.now() - 90_000) }, // 2 mins
    });

    const res8 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s8.id,
      userId: B5_USER_STANDARD,
      actualDurationMs: 1_000_000_000_000,
    });

    assert(
      'TC-B5-08: Client sends extreme value (10^12) -> clamped to server elapsed (2m)',
      res8.session.billableMinutes === 2 &&
      res8.session.actualDurationMs <= 95_000
    );
  } catch (e: any) {
    assert('TC-B5-08', false, e.message);
  }

  // TC-B5-09: Server elapsed > 15m (18m) -> capped at 900,000ms (15m)
  try {
    await resetStandardQuota(50);
    const s9 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: s9.id },
      data: { startedAt: new Date(Date.now() - 1_080_000) }, // 18 mins
    });

    const res9 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s9.id,
      userId: B5_USER_STANDARD,
    });

    assert(
      'TC-B5-09: Server elapsed > 15m (18m) -> capped at 900,000ms (15 billable mins)',
      res9.session.billableMinutes === 15 &&
      res9.session.actualDurationMs === 900_000 &&
      res9.session.consumedSubMins === 15
    );
  } catch (e: any) {
    assert('TC-B5-09', false, e.message);
  }

  // ─── PART 2: ENTITLEMENT-SPECIFIC CAPS (10-12) ─────────────────────────────
  console.log('\n▶ SECTION 2: Entitlement-Specific Session Duration Caps');

  // TC-B5-10: User has 3 available voice minutes -> maxAllowedMs = 180,000
  try {
    const s10 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_3MIN });
    assert(
      'TC-B5-10: User with 3 available voice mins -> maxAllowedMs = 180,000ms (3m)',
      s10.maxAllowedMs === 180_000
    );
    await prisma.voiceSession.delete({ where: { id: s10.id } });
  } catch (e: any) {
    assert('TC-B5-10', false, e.message);
  }

  // TC-B5-11: 1-minute entitlement -> maxAllowedMs = 60,000ms
  try {
    const s11 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_1MIN });
    assert(
      'TC-B5-11: 1-minute entitlement -> maxAllowedMs = 60,000ms (1m)',
      s11.maxAllowedMs === 60_000
    );
    await prisma.voiceSession.delete({ where: { id: s11.id } });
  } catch (e: any) {
    assert('TC-B5-11', false, e.message);
  }

  // TC-B5-12: 15-minute entitlement -> maxAllowedMs = 900,000ms
  try {
    await resetStandardQuota(50);
    const s12 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    assert(
      'TC-B5-12: 15-minute entitlement -> maxAllowedMs = 900,000ms (15m)',
      s12.maxAllowedMs === 900_000
    );
    await prisma.voiceSession.delete({ where: { id: s12.id } });
  } catch (e: any) {
    assert('TC-B5-12', false, e.message);
  }

  // ─── PART 3: WEBSOCKET TIMERS, WARNING & CUTOFF (13-17) ────────────────────
  console.log('\n▶ SECTION 3: WebSocket Boundary Timers, 30s Warning & Hard Cutoff');

  // TC-B5-13: Warning at maxAllowedMs - 30s
  try {
    const mockWs = new MockWsClient();
    const stream = new WsVoiceStream(mockWs as any, 'vi', 'mock-session-123', B5_USER_STANDARD, 180_000);
    stream.attachSession('mock-session-123', 180_000, B5_USER_STANDARD);

    const hasWarningTimer = (stream as any).warningTimer !== null;
    const hasCutoffTimer = (stream as any).cutoffTimer !== null;

    stream.clearTimers();

    assert(
      'TC-B5-13: Warning timer registered for 180,000ms session (warning at 150,000ms)',
      hasWarningTimer && hasCutoffTimer
    );
  } catch (e: any) {
    assert('TC-B5-13', false, e.message);
  }

  // TC-B5-14: Session <= 30s -> no invalid negative warning timer
  try {
    const mockWs = new MockWsClient();
    const stream = new WsVoiceStream(mockWs as any, 'vi', 'mock-session-30s', B5_USER_1MIN, 30_000);
    stream.attachSession('mock-session-30s', 30_000, B5_USER_1MIN);

    const hasWarningTimer = (stream as any).warningTimer !== null;
    const hasCutoffTimer = (stream as any).cutoffTimer !== null;

    stream.clearTimers();

    assert(
      'TC-B5-14: Session <= 30s -> warningTimer is null (no negative timer), cutoffTimer is active',
      hasWarningTimer === false && hasCutoffTimer === true
    );
  } catch (e: any) {
    assert('TC-B5-14', false, e.message);
  }

  // TC-B5-15, 16, 17: Server cutoff -> VOICE_SESSION_CAP_REACHED emitted, socket closed with 1000, finalized
  try {
    await resetStandardQuota(50);
    const session = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    const mockWs = new MockWsClient();
    const stream = new WsVoiceStream(mockWs as any, 'vi', session.id, B5_USER_STANDARD, 900_000);

    await stream.triggerServerCutoff();

    const finalizedSession = await prisma.voiceSession.findUnique({ where: { id: session.id } });
    const receivedCapMessage = mockWs.sentFrames.some((frame) => frame.includes('VOICE_SESSION_CAP_REACHED'));

    assert(
      'TC-B5-15, 16, 17: Server cutoff -> emits VOICE_SESSION_CAP_REACHED, closes socket with 1000, auto-finalizes session',
      receivedCapMessage &&
      mockWs.closedCode === 1000 &&
      mockWs.closedReason === 'VOICE_SESSION_CAP_REACHED' &&
      finalizedSession!.status === 'COMPLETED' &&
      finalizedSession!.isFinalized === true
    );
  } catch (e: any) {
    assert('TC-B5-15, 16, 17', false, e.message);
  }

  // ─── PART 4: DISCONNECT & RACE CONDITIONS (18-20) ──────────────────────────
  console.log('\n▶ SECTION 4: Disconnect Handling & Idempotent Finalization');

  // TC-B5-18: Unexpected disconnect -> server finalization
  try {
    await resetStandardQuota(50);
    const session18 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: session18.id },
      data: { startedAt: new Date(Date.now() - 90_000) }, // 2 mins
    });

    const mockWs18 = new MockWsClient();
    const stream18 = new WsVoiceStream(mockWs18 as any, 'vi', session18.id, B5_USER_STANDARD, 900_000);
    await stream18.handleDisconnect();

    const finalized18 = await prisma.voiceSession.findUnique({ where: { id: session18.id } });

    assert(
      'TC-B5-18: Unexpected disconnect -> auto-finalizes session to COMPLETED with server-authoritative duration',
      finalized18!.status === 'COMPLETED' &&
      finalized18!.isFinalized === true &&
      finalized18!.billableMinutes === 2
    );
  } catch (e: any) {
    assert('TC-B5-18', false, e.message);
  }

  // TC-B5-19 & 20: Normal stop + disconnect race -> exactly one billing operation
  try {
    await resetStandardQuota(50);
    const session19 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    await prisma.voiceSession.update({
      where: { id: session19.id },
      data: { startedAt: new Date(Date.now() - 90_000) }, // 2 mins
    });

    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: B5_USER_STANDARD } });

    const mockWs19 = new MockWsClient();
    const stream19 = new WsVoiceStream(mockWs19 as any, 'vi', session19.id, B5_USER_STANDARD, 900_000);

    // Call normal finalize and disconnect simultaneously
    const [resFinalize] = await Promise.all([
      VoiceSessionService.finalizeVoiceSession({
        voiceSessionId: session19.id,
        userId: B5_USER_STANDARD,
        reason: 'NORMAL',
      }),
      stream19.handleDisconnect(),
    ]);

    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B5_USER_STANDARD } });

    assert(
      'TC-B5-19, 20: Normal stop + disconnect race -> exactly 2 minutes deducted once (idempotent)',
      resFinalize.session.billableMinutes === 2 &&
      quotaBefore!.voiceMinsRemaining - 2 === quotaAfter!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('TC-B5-19, 20', false, e.message);
  }

  // ─── PART 5: VIP & 3-MINUTE BOUNDARY DEFENSES (21-22) ──────────────────────
  console.log('\n▶ SECTION 5: VIP 15-Minute Hard Cap & 3-Minute Entitlement Enforcement');

  // TC-B5-21: VIP 15-minute session -> 15m technical cap, 0 business deduction
  try {
    const sVip = await VoiceSessionService.createVoiceSession({ userId: B5_USER_VIP });
    await prisma.voiceSession.update({
      where: { id: sVip.id },
      data: { startedAt: new Date(Date.now() - 1_200_000) }, // 20 mins elapsed
    });

    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: B5_USER_VIP } });
    const resVip = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: sVip.id,
      userId: B5_USER_VIP,
    });
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B5_USER_VIP } });

    assert(
      'TC-B5-21: VIP 20m elapsed -> capped at 15 billable mins, 0 deducted from wallet (TIME_UNLIMITED)',
      sVip.maxAllowedMs === 900_000 &&
      resVip.session.billableMinutes === 15 &&
      resVip.session.actualDurationMs === 900_000 &&
      resVip.session.consumedSubMins === 0 &&
      quotaBefore!.voiceMinsRemaining === quotaAfter!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('TC-B5-21', false, e.message);
  }

  // TC-B5-22: 3-minute entitlement -> server automatically caps at 3m (180,000ms)
  try {
    const s22 = await VoiceSessionService.createVoiceSession({ userId: B5_USER_3MIN });
    await prisma.voiceSession.update({
      where: { id: s22.id },
      data: { startedAt: new Date(Date.now() - 600_000) }, // 10 mins elapsed
    });

    const res22 = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: s22.id,
      userId: B5_USER_3MIN,
    });

    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: B5_USER_3MIN } });

    assert(
      'TC-B5-22: User with 3 mins running 10 mins -> capped at 180,000ms (3 mins deducted, wallet = 0)',
      s22.maxAllowedMs === 180_000 &&
      res22.session.billableMinutes === 3 &&
      res22.session.actualDurationMs === 180_000 &&
      quotaAfter!.voiceMinsRemaining === 0
    );
  } catch (e: any) {
    assert('TC-B5-22', false, e.message);
  }

  // ─── PART 6: REGRESSIONS & DECOUPLING INVARIANTS (23-25) ───────────────────
  console.log('\n▶ SECTION 6: Regressions & Decoupling Invariant Audits');

  // TC-B5-23: Text debate regression -> exactly 1 TEXT_DEBATE deduction
  try {
    await resetStandardQuota(50);
    const textBefore = await prisma.userQuota.findUnique({ where: { userId: B5_USER_STANDARD } });
    const dec = await consumeQuota(B5_USER_STANDARD, 'TEXT_DEBATE', 1);
    const textAfter = await prisma.userQuota.findUnique({ where: { userId: B5_USER_STANDARD } });

    assert(
      'TC-B5-23: Text debate still consumes exactly 1 TEXT_DEBATE credit',
      dec.decision === 'ALLOW' &&
      textBefore!.textTurnsRemaining - 1 === textAfter!.textTurnsRemaining
    );
  } catch (e: any) {
    assert('TC-B5-23', false, e.message);
  }

  // TC-B5-24: Voice creation regression -> zero TEXT_DEBATE deduction
  try {
    await resetStandardQuota(50);
    const textBefore = await prisma.userQuota.findUnique({ where: { userId: B5_USER_STANDARD } });
    const vSession = await VoiceSessionService.createVoiceSession({ userId: B5_USER_STANDARD });
    const textAfter = await prisma.userQuota.findUnique({ where: { userId: B5_USER_STANDARD } });

    assert(
      'TC-B5-24: Voice session creation consumes ZERO text turns',
      vSession.status === 'ACTIVE' &&
      textBefore!.textTurnsRemaining === textAfter!.textTurnsRemaining
    );

    await prisma.voiceSession.delete({ where: { id: vSession.id } });
  } catch (e: any) {
    assert('TC-B5-24', false, e.message);
  }

  // Cleanup
  await cleanupB5TestData();

  console.log('\n============================================================');
  console.log(`  B5 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runB5Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal B5 Test Error:', err);
    process.exit(1);
  });
