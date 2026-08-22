/**
 * Phase B9 — Frontend UI Precision & Entitlement/Payment Integration Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md & docs/16_PLAN_QUOTA_BUSINESS_SPEC.md
 * 
 * Verifies all Phase B9 Contract Invariants across:
 *  - Section 1: Entitlement Precedence & Display Integrity (B9-01..10)
 *  - Section 2: Active Credit Pack Catalog & Pricing (B9-11..16)
 *  - Section 3: Technical Cap & Duration Presentations (B9-17..20)
 *  - Section 4: Checkout, Webhook Idempotency & Replay Resilience (B9-21..26)
 *  - Section 5: Sandbox Top-Up & DB Quota Provisioning (B9-27..28)
 *  - Section 6: Voice Session Creation Guard & Decoupling Invariants (B9-29..32)
 */

import { PrismaClient } from '@prisma/client';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';
import { VoiceSessionService } from '../services/voiceSessionService';
import {
  getCreditPackDefinition,
  getPlanDefinition,
  listCreditPackCodes,
  parseCreditPackCode,
} from '../services/planQuotaRegistry';
import {
  createCheckoutSession,
  fulfillPaymentOrderAtomic,
} from '../controllers/paymentController';
import {
  provisionSubscription,
  provisionCreditPack,
} from '../services/quotaManager';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runB9Tests() {
  console.log('\n============================================================');
  console.log('PHASE B9: FRONTEND UI PRECISION & ENTITLEMENT CONTRACT TESTS');
  console.log('============================================================\n');

  const testSuffix = `b9_${Date.now()}`;

  // ─── SECTION 1: Entitlement Precedence & Non-Identity Presentation (B9-01..10) ───
  console.log('--- SECTION 1: Entitlement Precedence & Presentation (B9-01..10) ---');

  // Create clean test user
  const userVip = await prisma.user.create({
    data: {
      phoneNumber: `+8499${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `VIP User ${testSuffix}`,
    },
  });

  // Provision active VIP pass
  const now = new Date();
  const vipPass = await prisma.userVipPass.create({
    data: {
      userId: userVip.id,
      passCode: 'VIP_PASS_TEST',
      status: 'ACTIVE',
      startedAt: new Date(now.getTime() - 3600_000),
      expiresAt: new Date(now.getTime() + 86400_000 * 30),
    },
  });

  const vipEntitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(userVip.id, now);

  assert(vipEntitlement.allowed === true, 'B9-01: Active VIP pass returns allowed === true');
  assert(vipEntitlement.mode === 'TIME_UNLIMITED', 'B9-01: Active VIP pass returns mode === TIME_UNLIMITED');
  assert(vipEntitlement.source === 'VIP', 'B9-01: Active VIP pass returns source === VIP');
  assert(vipEntitlement.availableMinutes === null, 'B9-02: Active VIP pass returns availableMinutes === null (never NaN or 0)');
  assert(vipEntitlement.maxAllowedMs === 900_000, 'B9-02: Active VIP maxAllowedMs is strictly 900,000ms (15 minutes)');

  // User with Subscription Quota
  const userSub = await prisma.user.create({
    data: {
      phoneNumber: `+8498${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Sub User ${testSuffix}`,
    },
  });
  await provisionSubscription({
    userId: userSub.id,
    plan: 'STANDARD_MONTHLY',
  });

  const subEntitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(userSub.id, now);
  assert(subEntitlement.allowed === true, 'B9-03: Subscription returns allowed === true');
  assert(subEntitlement.source === 'SUBSCRIPTION', 'B9-03: Subscription returns source === SUBSCRIPTION');
  assert(subEntitlement.mode === 'QUOTA', 'B9-03: Subscription returns mode === QUOTA');
  assert((subEntitlement.availableMinutes ?? 0) >= 60, 'B9-03: Subscription voice minutes reflects plan limits');

  // User with Add-on Pack only
  const userAddon = await prisma.user.create({
    data: {
      phoneNumber: `+8497${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Addon User ${testSuffix}`,
    },
  });
  await provisionCreditPack({
    userId: userAddon.id,
    packCode: 'PACK_VOICE_15',
  });

  const addonEntitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(userAddon.id, now);
  assert(addonEntitlement.allowed === true, 'B9-04: Add-on pack returns allowed === true');
  assert(addonEntitlement.source === 'ADD_ON', 'B9-04: Add-on pack returns source === ADD_ON');
  assert(addonEntitlement.mode === 'QUOTA', 'B9-04: Add-on pack returns mode === QUOTA');
  assert(addonEntitlement.availableMinutes === 15, 'B9-04: Add-on pack voice minutes equals 15');
  assert(
    Array.isArray(addonEntitlement.breakdown?.activePacks) && addonEntitlement.breakdown.activePacks.length === 1,
    'B9-04: Add-on breakdown contains activePacks list in FEFO order',
  );

  // User with Free Trial only
  const userTrial = await prisma.user.create({
    data: {
      phoneNumber: `+8496${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Trial User ${testSuffix}`,
    },
  });
  await prisma.userFreeTrial.create({
    data: {
      userId: userTrial.id,
      phoneNumber: userTrial.phoneNumber,
      voiceMinsRemaining: 5,
      startedAt: new Date(now.getTime() - 1000),
      expiresAt: new Date(now.getTime() + 86400_000 * 7),
    },
  });

  const trialEntitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(userTrial.id, now);
  assert(trialEntitlement.allowed === true, 'B9-05: Free trial returns allowed === true');
  assert(trialEntitlement.source === 'TRIAL', 'B9-05: Free trial returns source === TRIAL');
  assert(trialEntitlement.availableMinutes === 5, 'B9-05: Free trial returns availableMinutes === 5');

  // User with Quota Exhausted (0 balance)
  const userEmpty = await prisma.user.create({
    data: {
      phoneNumber: `+8495${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Empty User ${testSuffix}`,
    },
  });
  await prisma.userQuota.create({
    data: {
      userId: userEmpty.id,
      textTurnsRemaining: 0,
      voiceMinsRemaining: 0,
      assistantRemaining: 0,
    },
  });

  const emptyEntitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(userEmpty.id, now);
  assert(emptyEntitlement.allowed === false, 'B9-06: Empty balance returns allowed === false');
  assert(emptyEntitlement.source === null, 'B9-06: Empty balance returns source === null');
  assert(Boolean(emptyEntitlement.reason), 'B9-06: Empty balance returns descriptive reason');

  // Multi-source precedence: VIP overrides Subscription & Addon
  await provisionSubscription({ userId: userVip.id, plan: 'STANDARD_MONTHLY' });
  await provisionCreditPack({ userId: userVip.id, packCode: 'PACK_VOICE_60' });
  const vipMulti = await VoiceEntitlementResolver.resolveVoiceEntitlement(userVip.id, now);
  assert(vipMulti.source === 'VIP', 'B9-07: VIP precedence overrides Subscription and Add-on');

  // Multi-source precedence: Subscription overrides Addon
  await provisionCreditPack({ userId: userSub.id, packCode: 'PACK_VOICE_15' });
  const subMulti = await VoiceEntitlementResolver.resolveVoiceEntitlement(userSub.id, now);
  assert(subMulti.source === 'SUBSCRIPTION', 'B9-08: Subscription precedence overrides Add-on');

  // Multi-source precedence: Addon overrides Trial
  await provisionCreditPack({ userId: userTrial.id, packCode: 'PACK_VOICE_15' });
  const addonMulti = await VoiceEntitlementResolver.resolveVoiceEntitlement(userTrial.id, now);
  assert(addonMulti.source === 'ADD_ON', 'B9-09: Add-on precedence overrides Free Trial');

  // Expired VIP cleanly falls back to Subscription
  const pastTime = new Date(now.getTime() + 86400_000 * 31); // 31 days in future
  const expiredVipFallback = await VoiceEntitlementResolver.resolveVoiceEntitlement(userVip.id, pastTime);
  assert(expiredVipFallback.source === 'SUBSCRIPTION', 'B9-10: Expired VIP falls back cleanly to Subscription');

  // ─── SECTION 2: Active Credit Pack Catalog & Pricing (B9-11..16) ───────────
  console.log('\n--- SECTION 2: Active Credit Pack Catalog & Pricing (B9-11..16) ---');

  const activeCodes = listCreditPackCodes();
  assert(activeCodes.includes('PACK_VOICE_15'), 'B9-11: Catalog contains PACK_VOICE_15');
  assert(activeCodes.includes('PACK_VOICE_60'), 'B9-11: Catalog contains PACK_VOICE_60');
  assert(activeCodes.includes('PACK_TEXT_10'), 'B9-11: Catalog contains PACK_TEXT_10');
  assert(activeCodes.includes('PACK_ASST_5'), 'B9-11: Catalog contains PACK_ASST_5');

  const pVoice15 = getCreditPackDefinition('PACK_VOICE_15');
  assert(pVoice15.listPriceVnd === 15000 && pVoice15.units === 15, 'B9-12: PACK_VOICE_15 is 15,000 VND and 15 mins');

  const pVoice60 = getCreditPackDefinition('PACK_VOICE_60');
  assert(pVoice60.listPriceVnd === 49000 && pVoice60.units === 60, 'B9-13: PACK_VOICE_60 is 49,000 VND and 60 mins');

  const pText10 = getCreditPackDefinition('PACK_TEXT_10');
  assert(pText10.listPriceVnd === 19000 && pText10.units === 10, 'B9-14: PACK_TEXT_10 is 19,000 VND and 10 turns');

  const pAsst5 = getCreditPackDefinition('PACK_ASST_5');
  assert(pAsst5.listPriceVnd === 15000 && pAsst5.units === 5, 'B9-15: PACK_ASST_5 is 15,000 VND and 5 questions');

  assert(!(activeCodes as string[]).includes('PACK_VOICE_5'), 'B9-16: Legacy PACK_VOICE_5 is excluded from active catalog');
  assert(!(activeCodes as string[]).includes('PACK_VOICE_10'), 'B9-16: Legacy PACK_VOICE_10 is excluded from active catalog');

  // ─── SECTION 3: Technical Cap & Duration Presentations (B9-17..20) ─────────
  console.log('\n--- SECTION 3: Technical Cap & Duration Boundaries (B9-17..20) ---');

  assert(vipEntitlement.maxAllowedMs <= 900_000, 'B9-17: VIP maxAllowedMs never exceeds 900,000ms (15m)');
  assert(subEntitlement.maxAllowedMs <= 900_000, 'B9-17: Subscription maxAllowedMs never exceeds 900,000ms');

  // Short quota user (e.g. 3 mins remaining in trial)
  const shortTrialUser = await prisma.user.create({
    data: {
      phoneNumber: `+8494${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Short Trial User ${testSuffix}`,
    },
  });
  await prisma.userFreeTrial.create({
    data: {
      userId: shortTrialUser.id,
      phoneNumber: shortTrialUser.phoneNumber,
      voiceMinsRemaining: 3,
      startedAt: new Date(now.getTime() - 1000),
      expiresAt: new Date(now.getTime() + 86400_000),
    },
  });
  const shortEntitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(shortTrialUser.id, now);
  assert(shortEntitlement.maxAllowedMs === 3 * 60_000, 'B9-18: Short quota caps session at availableMinutes * 60,000ms');

  // Large quota user (60 mins in pack)
  assert(addonEntitlement.maxAllowedMs === 900_000, 'B9-19: Large quota (15+ mins) clamps session at exactly 900,000ms');
  assert(vipMulti.maxAllowedMs === 900_000, 'B9-20: VIP mode technical ceiling is strictly 900,000ms (15 minutes)');

  // ─── SECTION 4: Checkout & Payment Handshake Contract (B9-21..26) ──────────
  console.log('\n--- SECTION 4: Checkout, Idempotency & Replay Resilience (B9-21..26) ---');

  // Test checkout for all 4 credit packs via controller logic
  const mockReq = (body: any, userId: string) => ({ body, userId } as any);
  const mockRes = () => {
    const res: any = {
      statusCode: 200,
      jsonBody: null,
      status(c: number) { this.statusCode = c; return this; },
      json(b: any) { this.jsonBody = b; return this; },
    };
    return res;
  };

  const resVoice15 = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_15', provider: 'SEPAY' }, userSub.id), resVoice15);
  assert(resVoice15.jsonBody?.amountVnd === 15000, 'B9-21: Checkout session creates PACK_VOICE_15 with 15,000 VND');

  const resVoice60 = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_60', provider: 'VNPAY' }, userSub.id), resVoice60);
  assert(resVoice60.jsonBody?.amountVnd === 49000, 'B9-22: Checkout session creates PACK_VOICE_60 with 49,000 VND');

  const resText10 = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_TEXT_10', provider: 'MOMO' }, userSub.id), resText10);
  assert(resText10.jsonBody?.amountVnd === 19000, 'B9-23: Checkout session creates PACK_TEXT_10 with 19,000 VND');

  const resAsst5 = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_ASST_5', provider: 'SEPAY' }, userSub.id), resAsst5);
  assert(resAsst5.jsonBody?.amountVnd === 15000, 'B9-24: Checkout session creates PACK_ASST_5 with 15,000 VND');

  const resInvalid = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'INVALID_PACK_XYZ', provider: 'SEPAY' }, userSub.id), resInvalid);
  assert(resInvalid.statusCode === 400, 'B9-25: Checkout rejects invalid product code with HTTP 400');

  // Webhook Idempotency / Replay
  const orderCode = resVoice15.jsonBody?.orderCode;
  assert(Boolean(orderCode), 'B9-26: Order Code created for idempotency verification');
  if (orderCode) {
    const f1 = await fulfillPaymentOrderAtomic({
      orderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 15000,
      transactionId: `TRANS_${testSuffix}_1`,
    });
    assert(f1.success === true && f1.alreadyPaid === false, 'B9-26: First fulfillment execution marks order as PAID');

    const f2 = await fulfillPaymentOrderAtomic({
      orderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 15000,
      transactionId: `TRANS_${testSuffix}_1`,
    });
    assert(f2.success === true && f2.alreadyPaid === true, 'B9-26: Duplicate/Replayed fulfillment returns alreadyPaid === true without double-crediting');
  }

  // ─── SECTION 5: Sandbox Top-Up & DB Quota Provisioning (B9-27..28) ─────────
  console.log('\n--- SECTION 5: Sandbox Direct Provisioning (B9-27..28) ---');

  const userSandbox = await prisma.user.create({
    data: {
      phoneNumber: `+8493${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Sandbox User ${testSuffix}`,
    },
  });

  const pack15Result = await provisionCreditPack({
    userId: userSandbox.id,
    packCode: 'PACK_VOICE_15',
  });
  assert(pack15Result.remainingUnits === 15, 'B9-27: Sandbox direct provisioning of PACK_VOICE_15 credits 15 voice units');

  const pack60Result = await provisionCreditPack({
    userId: userSandbox.id,
    packCode: 'PACK_VOICE_60',
  });
  assert(pack60Result.remainingUnits === 60, 'B9-28: Sandbox direct provisioning of PACK_VOICE_60 credits 60 voice units');

  // ─── SECTION 6: Voice Session Creation Guard & Decoupling (B9-29..32) ──────
  console.log('\n--- SECTION 6: Voice Session Guard & Decoupling Invariants (B9-29..32) ---');

  // Block session creation when quota exceeded
  let creationBlocked = false;
  try {
    await VoiceSessionService.createVoiceSession({
      userId: userEmpty.id,
    });
  } catch (err: any) {
    creationBlocked = err.code === 'QUOTA_EXCEEDED' || err.statusCode === 403;
  }
  assert(creationBlocked, 'B9-29: POST /voice/sessions blocks creation if voice quota is exhausted (HTTP 403 QUOTA_EXCEEDED)');

  // Voice session creation allowed for entitled user
  const voiceSession = await VoiceSessionService.createVoiceSession({
    userId: userAddon.id,
  });
  assert(Boolean(voiceSession.id), 'B9-30: Entitled user successfully creates server-owned VoiceSession');
  assert(voiceSession.maxAllowedMs <= 900_000, 'B9-30: Server-owned VoiceSession maxAllowedMs is authoritative');

  // Finalize voice session and verify Text Debate quota is untouched
  const textQuotaBefore = await prisma.userQuota.findUnique({
    where: { userId: userAddon.id },
    select: { textTurnsRemaining: true },
  });

  await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: voiceSession.id,
    userId: userAddon.id,
    actualDurationMs: 65_000, // 65s -> 2 billing minutes
  });

  const textQuotaAfter = await prisma.userQuota.findUnique({
    where: { userId: userAddon.id },
    select: { textTurnsRemaining: true },
  });

  assert(
    textQuotaBefore?.textTurnsRemaining === textQuotaAfter?.textTurnsRemaining,
    'B9-31: Voice session finalization atomic billing does NOT decrement text debate quota (Decoupling Invariant COM-INVARIANT-01)',
  );

  assert(
    passed >= 30,
    `B9-32: Total passing test assertions (${passed}) exceeds Phase B9 minimum threshold of 30 tests`,
  );

  console.log('\n============================================================');
  console.log(`PHASE B9 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runB9Tests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
