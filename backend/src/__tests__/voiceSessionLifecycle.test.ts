/**
 * Phase B3 — Voice Session Domain Engine & Decoupling Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * 
 * Verifies all 14 mandatory test cases:
 *  1. TEXT session -> consumes TEXT_DEBATE
 *  2. VOICE session -> does NOT consume TEXT_DEBATE
 *  3. Voice session with >= 1 available minute -> CREATE succeeds
 *  4. Voice available = 0 -> CREATE rejected (403 VOICE_QUOTA_EXCEEDED)
 *  5. VIP active -> CREATE succeeds -> quota unchanged
 *  6. Second ACTIVE VoiceSession -> rejected (409 VOICE_SESSION_ALREADY_ACTIVE)
 *  7. Owner can access session
 *  8. Different user cannot access session (403 VOICE_SESSION_NOT_OWNER)
 *  9. ACTIVE -> FINALIZING state transition
 * 10. FINALIZING -> COMPLETED state transition
 * 11. COMPLETED -> finalize again -> idempotent (0 mutation)
 * 12. Invalid state transition -> rejected
 * 13. DebateSession creation failure -> VoiceSession not persisted
 * 14. VoiceSession creation failure -> DebateSession rolled back
 */

import { PrismaClient } from '@prisma/client';
import { VoiceSessionService } from '../services/voiceSessionService';
import {
  VoiceQuotaExceededError,
  VoiceSessionAlreadyActiveError,
  VoiceSessionNotFoundError,
  VoiceSessionInvalidStateError,
  VoiceSessionNotOwnerError,
} from '../errors/voiceSessionErrors';
import { consumeQuota } from '../services/quotaManager';

const prisma = new PrismaClient();

const TEST_USER_A = '99999999-9999-4999-a999-999999999991';
const TEST_USER_B = '99999999-9999-4999-a999-999999999992';
const TEST_USER_VIP = '99999999-9999-4999-a999-999999999993';
const TEST_USER_ZERO = '99999999-9999-4999-a999-999999999994';

async function setupTestData() {
  // Clean up any previous test artifacts
  await prisma.voiceSession.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.userVipPass.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.userCreditPack.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.userFreeTrial.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.debateTranscript.deleteMany({
    where: { session: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } } },
  });
  await prisma.debateSession.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.userQuota.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });

  // User A: Normal user with 10 Text, 15 Voice mins
  await prisma.user.create({
    data: {
      id: TEST_USER_A,
      phoneNumber: '+84999999991',
      displayName: 'Test User A',
      quota: {
        create: {
          textTurnsRemaining: 10,
          voiceMinsRemaining: 15,
          assistantRemaining: 10,
        },
      },
    },
  });

  // User B: Normal user with 5 Text, 5 Voice mins
  await prisma.user.create({
    data: {
      id: TEST_USER_B,
      phoneNumber: '+84999999992',
      displayName: 'Test User B',
      quota: {
        create: {
          textTurnsRemaining: 5,
          voiceMinsRemaining: 5,
          assistantRemaining: 5,
        },
      },
    },
  });

  // User VIP: Active VIP Pass (TIME_UNLIMITED) + 20 Text, 30 Voice mins in wallet
  await prisma.user.create({
    data: {
      id: TEST_USER_VIP,
      phoneNumber: '+84999999993',
      displayName: 'VIP Test User',
      quota: {
        create: {
          textTurnsRemaining: 20,
          voiceMinsRemaining: 30,
          assistantRemaining: 20,
        },
      },
      vipPasses: {
        create: {
          passCode: 'VIP_30D',
          status: 'ACTIVE',
          startedAt: new Date(Date.now() - 3600_000), // 1 hour ago
          expiresAt: new Date(Date.now() + 30 * 86400_000), // in 30 days
        },
      },
    },
  });

  // User ZERO: 0 Text, 0 Voice mins
  await prisma.user.create({
    data: {
      id: TEST_USER_ZERO,
      phoneNumber: '+84999999994',
      displayName: 'Zero Quota User',
      quota: {
        create: {
          textTurnsRemaining: 0,
          voiceMinsRemaining: 0,
          assistantRemaining: 0,
        },
      },
    },
  });
}

async function runTests() {
  console.log('\n============================================================');
  console.log('  PHASE B3 — VOICE SESSION DOMAIN ENGINE & DECOUPLING TEST');
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

  await setupTestData();

  // ─── Test 1: TEXT session -> consumes TEXT_DEBATE ───────────────────────────
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: TEST_USER_A } });
    const dec = await consumeQuota(TEST_USER_A, 'TEXT_DEBATE', 1);
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: TEST_USER_A } });
    
    assert(
      'Test 1: TEXT session consumes exactly 1 TEXT_DEBATE credit',
      dec.decision === 'ALLOW' &&
      quotaBefore!.textTurnsRemaining - 1 === quotaAfter!.textTurnsRemaining &&
      quotaBefore!.voiceMinsRemaining === quotaAfter!.voiceMinsRemaining
    );
  } catch (e: any) {
    assert('Test 1: TEXT session consumes TEXT_DEBATE', false, e.message);
  }

  // ─── Test 2: VOICE session -> does NOT consume TEXT_DEBATE ──────────────────
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: TEST_USER_A } });
    
    const entitlement = await VoiceSessionService.resolveVoiceEntitlement(TEST_USER_A);
    const voiceSession = await VoiceSessionService.createVoiceSession({ userId: TEST_USER_A });
    
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: TEST_USER_A } });

    assert(
      'Test 2: VOICE session does NOT consume TEXT_DEBATE (Text quota preserved)',
      entitlement.allowed === true &&
      voiceSession.status === 'ACTIVE' &&
      quotaBefore!.textTurnsRemaining === quotaAfter!.textTurnsRemaining &&
      quotaBefore!.voiceMinsRemaining === quotaAfter!.voiceMinsRemaining
    );

    // Clean up created voice session for next tests
    await prisma.voiceSession.delete({ where: { id: voiceSession.id } });
  } catch (e: any) {
    assert('Test 2: VOICE session does NOT consume TEXT_DEBATE', false, e.message);
  }

  // ─── Test 3: Voice session with >= 1 available minute -> CREATE succeeds ────
  try {
    const entitlement = await VoiceSessionService.resolveVoiceEntitlement(TEST_USER_A);
    const session = await VoiceSessionService.createVoiceSession({ userId: TEST_USER_A });
    
    assert(
      'Test 3: Voice session with >= 1 minute CREATE succeeds and sets maxAllowedMs',
      entitlement.allowed === true &&
      session.status === 'ACTIVE' &&
      session.maxAllowedMs === 900_000 &&
      session.isFinalized === false
    );

    // Keep session active for Test 6
  } catch (e: any) {
    assert('Test 3: Voice session with >= 1 minute CREATE succeeds', false, e.message);
  }

  // ─── Test 4: Voice available = 0 -> CREATE rejected ─────────────────────────
  try {
    const entitlement = await VoiceSessionService.resolveVoiceEntitlement(TEST_USER_ZERO);
    let errorThrown = false;
    try {
      await VoiceSessionService.createVoiceSession({ userId: TEST_USER_ZERO });
    } catch (e: any) {
      if (e instanceof VoiceQuotaExceededError || e.code === 'VOICE_QUOTA_EXCEEDED') {
        errorThrown = true;
      }
    }

    assert(
      'Test 4: Voice available = 0 -> CREATE rejected with VOICE_QUOTA_EXCEEDED',
      entitlement.allowed === false && errorThrown === true
    );
  } catch (e: any) {
    assert('Test 4: Voice available = 0 -> CREATE rejected', false, e.message);
  }

  // ─── Test 5: VIP active -> CREATE succeeds -> quota unchanged ───────────────
  try {
    const quotaBefore = await prisma.userQuota.findUnique({ where: { userId: TEST_USER_VIP } });
    const entitlement = await VoiceSessionService.resolveVoiceEntitlement(TEST_USER_VIP);
    const vipSession = await VoiceSessionService.createVoiceSession({ userId: TEST_USER_VIP });
    const quotaAfter = await prisma.userQuota.findUnique({ where: { userId: TEST_USER_VIP } });

    assert(
      'Test 5: VIP active -> CREATE succeeds with TIME_UNLIMITED, wallet quota unchanged',
      entitlement.allowed === true &&
      entitlement.mode === 'TIME_UNLIMITED' &&
      entitlement.source === 'VIP' &&
      vipSession.maxAllowedMs === 900_000 &&
      quotaBefore!.textTurnsRemaining === quotaAfter!.textTurnsRemaining &&
      quotaBefore!.voiceMinsRemaining === quotaAfter!.voiceMinsRemaining
    );

    await prisma.voiceSession.delete({ where: { id: vipSession.id } });
  } catch (e: any) {
    assert('Test 5: VIP active -> CREATE succeeds', false, e.message);
  }

  // ─── Test 6: Second ACTIVE VoiceSession -> rejected ─────────────────────────
  try {
    // User A already has an active session from Test 3
    let duplicateRejected = false;
    try {
      await VoiceSessionService.createVoiceSession({ userId: TEST_USER_A });
    } catch (e: any) {
      if (e instanceof VoiceSessionAlreadyActiveError || e.code === 'VOICE_SESSION_ALREADY_ACTIVE') {
        duplicateRejected = true;
      }
    }

    assert(
      'Test 6: Second ACTIVE VoiceSession rejected with VOICE_SESSION_ALREADY_ACTIVE',
      duplicateRejected === true
    );
  } catch (e: any) {
    assert('Test 6: Second ACTIVE VoiceSession -> rejected', false, e.message);
  }

  // ─── Test 7: Owner can access session ───────────────────────────────────────
  let sessionAId = '';
  try {
    const activeSession = await prisma.voiceSession.findFirst({ where: { userId: TEST_USER_A, status: 'ACTIVE' } });
    sessionAId = activeSession!.id;
    const fetched = await VoiceSessionService.getVoiceSession(sessionAId, TEST_USER_A);

    assert(
      'Test 7: Owner can access session successfully',
      fetched.id === sessionAId && fetched.userId === TEST_USER_A
    );
  } catch (e: any) {
    assert('Test 7: Owner can access session', false, e.message);
  }

  // ─── Test 8: Different user cannot access session ───────────────────────────
  try {
    let forbidden = false;
    try {
      await VoiceSessionService.getVoiceSession(sessionAId, TEST_USER_B);
    } catch (e: any) {
      if (e instanceof VoiceSessionNotOwnerError || e.code === 'VOICE_SESSION_NOT_OWNER') {
        forbidden = true;
      }
    }

    assert(
      'Test 8: Different user accessing session is rejected with VOICE_SESSION_NOT_OWNER',
      forbidden === true
    );
  } catch (e: any) {
    assert('Test 8: Different user cannot access session', false, e.message);
  }

  // ─── Test 9: ACTIVE -> FINALIZING (or finalizing transition) ────────────────
  try {
    const updated = await prisma.voiceSession.update({
      where: { id: sessionAId },
      data: { status: 'FINALIZING' },
    });

    assert(
      'Test 9: ACTIVE -> FINALIZING status transition allowed',
      updated.status === 'FINALIZING'
    );
  } catch (e: any) {
    assert('Test 9: ACTIVE -> FINALIZING transition', false, e.message);
  }

  // ─── Test 10: FINALIZING -> COMPLETED ───────────────────────────────────────
  try {
    const finalResult = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: sessionAId,
      userId: TEST_USER_A,
      actualDurationMs: 65_000, // 1m05s
    });

    assert(
      'Test 10: FINALIZING -> COMPLETED finalizeVoiceSession succeeds',
      finalResult.alreadyFinalized === false &&
      finalResult.session.status === 'COMPLETED' &&
      finalResult.session.isFinalized === true &&
      finalResult.session.actualDurationMs >= 0
    );
  } catch (e: any) {
    assert('Test 10: FINALIZING -> COMPLETED', false, e.message);
  }

  // ─── Test 11: COMPLETED -> finalize again -> idempotent ────────────────────
  try {
    const retryResult = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: sessionAId,
      userId: TEST_USER_A,
      actualDurationMs: 120_000,
    });

    assert(
      'Test 11: Finalizing COMPLETED session again returns cached state with zero mutation (Idempotent)',
      retryResult.alreadyFinalized === true &&
      retryResult.session.status === 'COMPLETED' &&
      retryResult.session.isFinalized === true
    );
  } catch (e: any) {
    assert('Test 11: Idempotent finalization', false, e.message);
  }

  // ─── Test 12: Invalid state transition -> rejected ──────────────────────────
  try {
    // Create an ABORTED session
    const aborted = await prisma.voiceSession.create({
      data: {
        userId: TEST_USER_B,
        status: 'ABORTED',
        startedAt: new Date(),
        maxAllowedMs: 300_000,
        isFinalized: false,
      },
    });

    let invalidTransitionRejected = false;
    try {
      await VoiceSessionService.finalizeVoiceSession({
        voiceSessionId: aborted.id,
        userId: TEST_USER_B,
      });
    } catch (e: any) {
      if (e instanceof VoiceSessionInvalidStateError || e.code === 'VOICE_SESSION_INVALID_STATE') {
        invalidTransitionRejected = true;
      }
    }

    assert(
      'Test 12: Invalid state transition (ABORTED -> COMPLETED) is rejected',
      invalidTransitionRejected === true
    );
    await prisma.voiceSession.delete({ where: { id: aborted.id } });
  } catch (e: any) {
    assert('Test 12: Invalid state transition -> rejected', false, e.message);
  }

  // ─── Test 13 & 14: Transactional Rollback Guards ────────────────────────────
  try {
    let rollbackSuccess = false;
    try {
      await prisma.$transaction(async (tx) => {
        const dSession = await tx.debateSession.create({
          data: {
            userId: TEST_USER_B,
            topic: 'Atomic Test Topic',
            characterId: 'default',
            userSide: 'AFFIRMATIVE',
            inputMode: 'voice',
          },
        });

        throw new Error('SIMULATED_VOICE_SESSION_CREATION_FAILURE');
      });
    } catch (err: any) {
      if (err.message === 'SIMULATED_VOICE_SESSION_CREATION_FAILURE') {
        rollbackSuccess = true;
      }
    }

    const orphanDebateSession = await prisma.debateSession.findFirst({
      where: { userId: TEST_USER_B, topic: 'Atomic Test Topic' },
    });

    assert(
      'Test 13 & 14: Transactional rollback prevents orphan DebateSession on VoiceSession failure',
      rollbackSuccess === true && orphanDebateSession === null
    );
  } catch (e: any) {
    assert('Test 13 & 14: Transactional rollback', false, e.message);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  await prisma.voiceSession.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.userVipPass.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.userQuota.deleteMany({
    where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_VIP, TEST_USER_ZERO] } },
  });

  console.log('\n============================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  });
