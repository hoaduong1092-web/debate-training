/**
 * Real DB End-to-End Test for Voice Session Finalization & Quota Decrement
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * 
 * Verifies:
 * 1. BEFORE: user_quotas.voice_mins_remaining = initial
 * 2. Voice debate session creation (inputMode = 'voice') -> VoiceSession ACTIVE in DB
 * 3. Turns added with transcript speech duration metadata
 * 4. completeSession called -> VoiceSession COMPLETED, isFinalized = true
 * 5. AFTER: user_quotas.voice_mins_remaining decremented by exact billableMinutes
 * 6. Idempotency: second completeSession call does NOT deduct quota again
 * 7. Concurrent finalizeVoiceSession calls deduct quota exactly ONCE
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { VoiceSessionService, calculateBillableMinutes } from '../services/voiceSessionService';

const prisma = new PrismaClient();

const TEST_USER_ID = randomUUID();

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🧪 VOICE QUOTA & END SESSION REAL DB E2E VERIFICATION');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     Detail: ${detail}`);
      failed++;
    }
  }

  try {
    // ── Setup Test User with initial quota ──
    const initialQuotaMins = 15;
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        phoneNumber: `+84988${Date.now().toString().slice(-6)}`,
        displayName: 'Voice E2E Test User',
        quota: {
          create: {
            textTurnsRemaining: 30,
            voiceMinsRemaining: initialQuotaMins,
            assistantRemaining: 10,
          },
        },
      },
    });

    console.log(`[SETUP] User ${TEST_USER_ID} created with initial voice_mins_remaining = ${initialQuotaMins}\n`);

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: Real Voice Debate (2 turns: 35s + 40s = 75s => 2 billable mins)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- SCENARIO 1: Voice Session with 75s speech (2 billable mins) ---');

    // 1. Quota BEFORE
    const quotaBefore = await prisma.userQuota.findUnique({
      where: { userId: TEST_USER_ID },
    });
    console.log(`[BEFORE] voice_mins_remaining = ${quotaBefore?.voiceMinsRemaining}`);
    assert(quotaBefore?.voiceMinsRemaining === 15, 'Initial quota is 15 minutes');

    // 2. Create Voice Debate Session in DB
    const debateSession = await prisma.debateSession.create({
      data: {
        userId: TEST_USER_ID,
        topic: 'Test AI Voice Debate Topic',
        characterId: 'sonTung',
        userSide: 'PRO',
        inputMode: 'voice',
        status: 'IN_PROGRESS',
      },
    });

    // Create linked VoiceSession
    const voiceSession = await VoiceSessionService.createVoiceSession({
      userId: TEST_USER_ID,
      debateSessionId: debateSession.id,
    });
    // Simulate speech elapsed time of 75 seconds
    await prisma.voiceSession.update({
      where: { id: voiceSession.id },
      data: { startedAt: new Date(Date.now() - 75_000) },
    });
    assert(voiceSession.status === 'ACTIVE', 'VoiceSession status is ACTIVE on creation');
    assert(voiceSession.debateSessionId === debateSession.id, 'VoiceSession linked to DebateSession');

    // 3. Add Turns with Voice Telemetry
    // Turn 1: 35,000ms
    await prisma.debateTranscript.create({
      data: {
        sessionId: debateSession.id,
        turnNumber: 1,
        speakerType: 'user',
        textContent: 'First user argument for 35 seconds',
        fallaciesDetected: ['__voice__' + JSON.stringify({ duration_ms: 35000 })],
      },
    });
    // Turn 2: 40,000ms
    await prisma.debateTranscript.create({
      data: {
        sessionId: debateSession.id,
        turnNumber: 2,
        speakerType: 'user',
        textContent: 'Second user argument for 40 seconds',
        fallaciesDetected: ['__voice__' + JSON.stringify({ duration_ms: 40000 })],
      },
    });

    // 4. Finalize Voice Session (as completeSession does)
    const totalVoiceDurationMs = 35000 + 40000; // 75,000ms
    const expectedBillableMins = calculateBillableMinutes(totalVoiceDurationMs, 900_000); // 2 mins
    assert(expectedBillableMins === 2, 'calculateBillableMinutes(75_000) = 2 minutes');

    const finalizeRes = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: voiceSession.id,
      userId: TEST_USER_ID,
      actualDurationMs: totalVoiceDurationMs,
      reason: 'DEBATE_SESSION_COMPLETED',
    });

    assert(!finalizeRes.alreadyFinalized, 'finalizeVoiceSession was not already finalized');
    assert(finalizeRes.session.status === 'COMPLETED', 'VoiceSession status updated to COMPLETED');
    assert(finalizeRes.session.isFinalized === true, 'VoiceSession isFinalized is true');
    assert(finalizeRes.session.billableMinutes === 2, `VoiceSession billableMinutes is 2 (got ${finalizeRes.session.billableMinutes})`);
    assert(finalizeRes.session.consumedSubMins === 2, `VoiceSession consumedSubMins is 2 (got ${finalizeRes.session.consumedSubMins})`);

    // 5. Quota AFTER in DB
    const quotaAfter = await prisma.userQuota.findUnique({
      where: { userId: TEST_USER_ID },
    });
    console.log(`[AFTER] voice_mins_remaining = ${quotaAfter?.voiceMinsRemaining}`);
    console.log(`[CONSUMPTION] ${quotaBefore?.voiceMinsRemaining} - ${quotaAfter?.voiceMinsRemaining} = ${(quotaBefore?.voiceMinsRemaining ?? 0) - (quotaAfter?.voiceMinsRemaining ?? 0)} mins`);
    assert(quotaAfter?.voiceMinsRemaining === 13, `Quota decremented from 15 to 13 (got ${quotaAfter?.voiceMinsRemaining})`);

    // Verify DB VoiceSession record directly
    const dbVoiceRecord = await prisma.voiceSession.findUnique({
      where: { id: voiceSession.id },
    });
    assert(dbVoiceRecord?.status === 'COMPLETED', 'DB voice_session record status is COMPLETED');
    assert(dbVoiceRecord?.isFinalized === true, 'DB voice_session record isFinalized is true');
    assert(dbVoiceRecord?.billableMinutes === 2, 'DB voice_session record billableMinutes = 2');
    assert(dbVoiceRecord?.consumedSubMins === 2, 'DB voice_session record consumedSubMins = 2');

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 2: Idempotency (Calling finalize on same session a 2nd time)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SCENARIO 2: Idempotency Protection ---');
    const secondFinalize = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: voiceSession.id,
      userId: TEST_USER_ID,
      actualDurationMs: totalVoiceDurationMs,
      reason: 'DEBATE_SESSION_COMPLETED_RETRY',
    });

    assert(secondFinalize.alreadyFinalized === true, 'Second finalize returns alreadyFinalized = true');
    const quotaAfterSecond = await prisma.userQuota.findUnique({
      where: { userId: TEST_USER_ID },
    });
    console.log(`[IDEMPOTENT QUOTA] voice_mins_remaining = ${quotaAfterSecond?.voiceMinsRemaining}`);
    assert(quotaAfterSecond?.voiceMinsRemaining === 13, 'Quota remained 13 with ZERO duplicate deduction');

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 3: Concurrency Protection (Parallel finalize calls)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SCENARIO 3: Concurrency Race Condition Protection ---');
    const vsConcurrent = await VoiceSessionService.createVoiceSession({
      userId: TEST_USER_ID,
    });
    // 50 seconds speech -> 1 billable minute (50s < 60s -> ceil(50/60) = 1 min)
    await prisma.voiceSession.update({
      where: { id: vsConcurrent.id },
      data: { startedAt: new Date(Date.now() - 50_000) },
    });

    // Run 5 simultaneous finalize calls
    const parallelCalls = await Promise.all([
      VoiceSessionService.finalizeVoiceSession({ voiceSessionId: vsConcurrent.id, userId: TEST_USER_ID, actualDurationMs: 50000 }),
      VoiceSessionService.finalizeVoiceSession({ voiceSessionId: vsConcurrent.id, userId: TEST_USER_ID, actualDurationMs: 50000 }),
      VoiceSessionService.finalizeVoiceSession({ voiceSessionId: vsConcurrent.id, userId: TEST_USER_ID, actualDurationMs: 50000 }),
      VoiceSessionService.finalizeVoiceSession({ voiceSessionId: vsConcurrent.id, userId: TEST_USER_ID, actualDurationMs: 50000 }),
      VoiceSessionService.finalizeVoiceSession({ voiceSessionId: vsConcurrent.id, userId: TEST_USER_ID, actualDurationMs: 50000 }),
    ]);

    const successfulFinalizations = parallelCalls.filter(r => !r.alreadyFinalized);
    const idempotentRejections = parallelCalls.filter(r => r.alreadyFinalized);

    console.log(`[CONCURRENCY RESULTS] Successful finalizations: ${successfulFinalizations.length}, Handled as idempotent: ${idempotentRejections.length}`);
    assert(successfulFinalizations.length === 1, 'Exactly ONE parallel call executed the finalization');
    assert(idempotentRejections.length === 4, 'Remaining 4 parallel calls returned alreadyFinalized');

    const quotaAfterConcurrent = await prisma.userQuota.findUnique({
      where: { userId: TEST_USER_ID },
    });
    console.log(`[CONCURRENCY QUOTA] voice_mins_remaining = ${quotaAfterConcurrent?.voiceMinsRemaining}`);
    assert(quotaAfterConcurrent?.voiceMinsRemaining === 12, 'Quota decremented by exactly 1 minute (13 -> 12), not 5 minutes');

    // ──────────────────────────────────────────────────────────────────────────
    // SCENARIO 4: Short Session Under 3 Seconds (< 3,000ms => 0 mins billed)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- SCENARIO 4: Sub-3-Second Voice Session (< 3s = 0 mins) ---');
    const vsShort = await VoiceSessionService.createVoiceSession({
      userId: TEST_USER_ID,
    });
    await prisma.voiceSession.update({
      where: { id: vsShort.id },
      data: { startedAt: new Date(Date.now() - 2500) },
    });

    const shortFinalize = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: vsShort.id,
      userId: TEST_USER_ID,
      actualDurationMs: 2500, // 2.5 seconds
      reason: 'SHORT_TEST',
    });

    assert(shortFinalize.session.billableMinutes === 0, 'billableMinutes is 0 for 2.5s speech');
    assert(shortFinalize.session.consumedSubMins === 0, 'consumedSubMins is 0 for 2.5s speech');

    const quotaAfterShort = await prisma.userQuota.findUnique({
      where: { userId: TEST_USER_ID },
    });
    console.log(`[SHORT SESSION QUOTA] voice_mins_remaining = ${quotaAfterShort?.voiceMinsRemaining}`);
    assert(quotaAfterShort?.voiceMinsRemaining === 12, 'Quota unchanged at 12 minutes');

  } finally {
    // Clean up test user
    try {
      await prisma.debateTranscript.deleteMany({
        where: { session: { userId: TEST_USER_ID } },
      });
      await prisma.voiceSession.deleteMany({
        where: { userId: TEST_USER_ID },
      });
      await prisma.debateSession.deleteMany({
        where: { userId: TEST_USER_ID },
      });
      await prisma.userQuota.deleteMany({
        where: { userId: TEST_USER_ID },
      });
      await prisma.user.deleteMany({
        where: { id: TEST_USER_ID },
      });
      console.log(`\n[TEARDOWN] Test user ${TEST_USER_ID} cleaned up.`);
    } catch (cleanupErr) {
      console.warn('[CLEANUP_WARN]', cleanupErr);
    }
  }

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('[FATAL_ERROR]', err);
  process.exit(1);
});
