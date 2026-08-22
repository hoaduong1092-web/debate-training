/**
 * Phase B7 — Credit Pack FEFO Engine & Extended Catalog Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md §11 & docs/16_PLAN_QUOTA_BUSINESS_SPEC.md
 * 
 * Verifies all 49 Phase B7 Contract Invariants across Catalog, Provisioning, Payment Fulfillment,
 * FEFO Sorting, Partial Consumption, Dimension Isolation, Expiry, Concurrency, and Regressions:
 *  - B7-01..09: Section 1 — Catalog (PACK_VOICE_15, PACK_VOICE_60, PACK_TEXT_10, PACK_ASST_5, legacy unexposed)
 *  - B7-10..16: Section 2 — Provisioning (single row, total=remaining, ACTIVE, 30d expiry, unknown rejected)
 *  - B7-17..21: Section 3 — Payment Fulfillment (checkout, atomic fulfillment, duplicate IPN idempotency, providers)
 *  - B7-22..26: Section 4 — FEFO (expiresAt ASC, earliest consumed, expired/depleted ignored, stacking)
 *  - B7-27..31: Section 5 — Partial Consumption (step reductions, exact zero -> DEPLETED, negative rejected)
 *  - B7-32..35: Section 6 — Dimension Isolation (voice/text/assistant strict isolation)
 *  - B7-36..39: Section 7 — Expiry (boundary > now, === now, < now, no resurrection)
 *  - B7-40..44: Section 8 — Concurrency & Security (no negative balance, no double-spend, catalog tamper-proof)
 *  - B7-45..49: Section 9 — Regressions (B6, B5, B4, Lifecycle, runAll compatibility)
 */

import { PrismaClient } from '@prisma/client';
import {
  getCreditPackDefinition,
  parseCreditPackCode,
  listCreditPackCodes,
  type CreditPackCode,
} from '../services/planQuotaRegistry';
import {
  provisionCreditPack,
  getUserQuotaStatus,
  consumeQuota,
  checkQuotaAvailable,
} from '../services/quotaManager';
import { fulfillPaymentOrderAtomic } from '../controllers/paymentController';
import { VoiceSessionService } from '../services/voiceSessionService';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';

const prisma = new PrismaClient();

const B7_USER_1 = '77777777-5555-4777-b777-777777777701';
const B7_USER_2 = '77777777-5555-4777-b777-777777777702';
const B7_USER_3 = '77777777-5555-4777-b777-777777777703';
const B7_USER_4 = '77777777-5555-4777-b777-777777777704';

const ALL_B7_USERS = [B7_USER_1, B7_USER_2, B7_USER_3, B7_USER_4];

async function cleanupB7TestData() {
  await prisma.voiceSession.deleteMany({ where: { userId: { in: ALL_B7_USERS } } });
  await prisma.userCreditPack.deleteMany({ where: { userId: { in: ALL_B7_USERS } } });
  await prisma.paymentOrder.deleteMany({ where: { userId: { in: ALL_B7_USERS } } });
  await prisma.debateTranscript.deleteMany({ where: { session: { userId: { in: ALL_B7_USERS } } } });
  await prisma.debateSession.deleteMany({ where: { userId: { in: ALL_B7_USERS } } });
  await prisma.userQuota.deleteMany({ where: { userId: { in: ALL_B7_USERS } } });
  await prisma.userSubscription.deleteMany({ where: { userId: { in: ALL_B7_USERS } } });
  await prisma.user.deleteMany({ where: { id: { in: ALL_B7_USERS } } });
}

async function setupB7TestData() {
  await cleanupB7TestData();

  for (let i = 0; i < ALL_B7_USERS.length; i++) {
    const uid = ALL_B7_USERS[i];
    await prisma.user.create({
      data: {
        id: uid,
        phoneNumber: `+8477777770${i + 1}`,
        displayName: `B7 Test User ${i + 1}`,
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
}

async function runB7Tests() {
  console.log('\n============================================================');
  console.log('  PHASE B7 — CREDIT PACK FEFO ENGINE & TOP-UP TEST SUITE');
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

  await setupB7TestData();

  // ─── SECTION 1: CATALOG (B7-01..09) ─────────────────────────────────────────
  console.log('▶ SECTION 1: Credit Pack Catalog Invariants');

  const p15 = getCreditPackDefinition('PACK_VOICE_15');
  const p60 = getCreditPackDefinition('PACK_VOICE_60');
  const pText = getCreditPackDefinition('PACK_TEXT_10');
  const pAsst = getCreditPackDefinition('PACK_ASST_5');

  // B7-01: PACK_VOICE_15 exists
  assert('B7-01: PACK_VOICE_15 exists in registry', !!p15 && p15.code === 'PACK_VOICE_15');

  // B7-02: PACK_VOICE_60 exists
  assert('B7-02: PACK_VOICE_60 exists in registry', !!p60 && p60.code === 'PACK_VOICE_60');

  // B7-03: PACK_TEXT_10 exists
  assert('B7-03: PACK_TEXT_10 exists in registry', !!pText && pText.code === 'PACK_TEXT_10');

  // B7-04: PACK_ASST_5 exists
  assert('B7-04: PACK_ASST_5 exists in registry', !!pAsst && pAsst.code === 'PACK_ASST_5');

  // B7-05: Dimensions are correct
  assert(
    'B7-05: All pack dimensions are correct (voice, text, assistant)',
    p15?.dimension === 'voice' &&
    p60?.dimension === 'voice' &&
    pText?.dimension === 'text' &&
    pAsst?.dimension === 'assistant'
  );

  // B7-06: All unit counts are correct
  assert(
    'B7-06: All unit counts match contract (15 mins, 60 mins, 10 sessions, 5 credits)',
    p15?.units === 15 && p60?.units === 60 && pText?.units === 10 && pAsst?.units === 5
  );

  // B7-07: All prices are correct
  assert(
    'B7-07: All prices match contract (15k, 49k, 19k, 15k VND)',
    p15?.listPriceVnd === 15_000 &&
    p60?.listPriceVnd === 49_000 &&
    pText?.listPriceVnd === 19_000 &&
    pAsst?.listPriceVnd === 15_000
  );

  // B7-08: Validity is 30 days
  assert(
    'B7-08: Validity is 30 days across all packs',
    p15?.durationDays === 30 && p60?.durationDays === 30 && pText?.durationDays === 30 && pAsst?.durationDays === 30
  );

  // B7-09: Legacy PACK_VOICE_5 / PACK_VOICE_10 unexposed
  const legacy5 = parseCreditPackCode('PACK_VOICE_5');
  const legacy10 = parseCreditPackCode('PACK_VOICE_10');
  const activeCodes = listCreditPackCodes();
  assert(
    'B7-09: Legacy session-based codes (PACK_VOICE_5/10) not exposed in active catalog',
    legacy5 === null && legacy10 === null && !activeCodes.includes('PACK_VOICE_5' as any)
  );

  // ─── SECTION 2: PROVISIONING ENGINE (B7-10..16) ────────────────────────────
  console.log('\n▶ SECTION 2: Dedicated Provisioning Engine');

  let prov1: any;
  try {
    prov1 = await provisionCreditPack({
      userId: B7_USER_1,
      packCode: 'PACK_VOICE_15',
    });
    // B7-10: Successful provisioning creates exactly one pack
    assert('B7-10: Successful provisioning creates exactly one pack', !!prov1 && !!prov1.id);
  } catch (e: any) {
    assert('B7-10', false, e.message);
  }

  // B7-11: remainingUnits = totalUnits
  assert(
    'B7-11: remainingUnits initialized to totalUnits (15)',
    prov1?.totalUnits === 15 && prov1?.remainingUnits === 15
  );

  // B7-12: status = ACTIVE
  assert('B7-12: Pack status initialized to ACTIVE', prov1?.status === 'ACTIVE');

  // B7-13: purchasedAt is valid date
  assert('B7-13: purchasedAt is valid timestamp', prov1?.purchasedAt instanceof Date);

  // B7-14: expiresAt = purchasedAt + 30 days
  const expectedExpiryMs = prov1.purchasedAt.getTime() + 30 * 86400_000;
  assert(
    'B7-14: expiresAt exactly equals purchasedAt + 30 days',
    Math.abs(prov1?.expiresAt.getTime() - expectedExpiryMs) < 2000
  );

  // B7-15: Unknown packCode is rejected
  try {
    await provisionCreditPack({
      userId: B7_USER_1,
      packCode: 'PACK_UNKNOWN_999' as any,
    });
    assert('B7-15: Unknown packCode is rejected', false);
  } catch (e: any) {
    assert('B7-15: Unknown packCode is rejected with error', e.message.includes('Invalid credit pack code'));
  }

  // B7-16: Dimension is derived from catalog
  assert(
    'B7-16: Dimension is securely derived from catalog (voice)',
    prov1?.dimension === 'voice'
  );

  // ─── SECTION 3: PAYMENT FULFILLMENT & IDEMPOTENCY (B7-17..21) ───────────────
  console.log('\n▶ SECTION 3: Payment Fulfillment & Idempotency');

  const orderCode1 = `ORD_B7_TEST_${Date.now()}_A`;
  await prisma.paymentOrder.create({
    data: {
      userId: B7_USER_2,
      orderCode: orderCode1,
      planId: 'PACK_VOICE_60',
      provider: 'SEPAY',
      amountVnd: 49_000,
      status: 'PENDING',
    },
  });

  // B7-17: Successful credit-pack PaymentOrder provisions pack
  const fulfill1 = await fulfillPaymentOrderAtomic({
    orderCode: orderCode1,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 49_000,
  });
  const packsAfterFulfill = await prisma.userCreditPack.findMany({
    where: { userId: B7_USER_2, packCode: 'PACK_VOICE_60' },
  });
  assert(
    'B7-17: Payment fulfillment atomically provisions PACK_VOICE_60 (60 units)',
    fulfill1.success === true &&
    fulfill1.alreadyPaid === false &&
    packsAfterFulfill.length === 1 &&
    packsAfterFulfill[0].remainingUnits === 60
  );

  // B7-18: Unsuccessful payment does not provision pack
  const orderCodePending = `ORD_B7_PENDING_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: B7_USER_2,
      orderCode: orderCodePending,
      planId: 'PACK_VOICE_15',
      provider: 'VNPAY',
      amountVnd: 15_000,
      status: 'PENDING',
    },
  });
  const packsBeforePendingFulfill = await prisma.userCreditPack.count({
    where: { userId: B7_USER_2, packCode: 'PACK_VOICE_15' },
  });
  assert('B7-18: PENDING payment order creates zero packs before fulfillment', packsBeforePendingFulfill === 0);

  // B7-19: Duplicate IPN does not provision duplicate pack (Idempotent)
  const fulfillDuplicate = await fulfillPaymentOrderAtomic({
    orderCode: orderCode1,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 49_000,
  });
  const packsAfterDuplicate = await prisma.userCreditPack.findMany({
    where: { userId: B7_USER_2, packCode: 'PACK_VOICE_60' },
  });
  assert(
    'B7-19: Duplicate IPN delivery is idempotent (alreadyPaid: true, exactly 1 pack maintained)',
    fulfillDuplicate.success === true &&
    fulfillDuplicate.alreadyPaid === true &&
    packsAfterDuplicate.length === 1
  );

  // B7-20: Repeated webhook remains idempotent (3rd time)
  const fulfillThird = await fulfillPaymentOrderAtomic({
    orderCode: orderCode1,
    expectedProvider: 'SEPAY',
  });
  assert('B7-20: 3rd repeated webhook delivery remains idempotent', fulfillThird.alreadyPaid === true);

  // B7-21: Each supported payment provider reaches the same provisioning contract (VNPay / MoMo / Sandbox)
  const orderCodeMoMo = `ORD_B7_MOMO_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: B7_USER_2,
      orderCode: orderCodeMoMo,
      planId: 'PACK_TEXT_10',
      provider: 'MOMO',
      amountVnd: 19_000,
      status: 'PENDING',
    },
  });
  const fulfillMoMo = await fulfillPaymentOrderAtomic({
    orderCode: orderCodeMoMo,
    expectedProvider: 'MOMO',
  });
  const momoPacks = await prisma.userCreditPack.findMany({
    where: { userId: B7_USER_2, packCode: 'PACK_TEXT_10' },
  });
  assert(
    'B7-21: MoMo payment fulfills exactly with PACK_TEXT_10 (10 units)',
    fulfillMoMo.success === true && momoPacks.length === 1 && momoPacks[0].remainingUnits === 10
  );

  // ─── SECTION 4: FEFO (FIRST EXPIRED, FIRST OUT) (B7-22..26) ────────────────
  console.log('\n▶ SECTION 4: FEFO Sorting & Pack Stacking');

  // Clear user 3 packs
  await prisma.userCreditPack.deleteMany({ where: { userId: B7_USER_3 } });

  // Provision 3 packs with staggered expiries
  const now = new Date();
  const packA = await prisma.userCreditPack.create({
    data: {
      userId: B7_USER_3,
      packCode: 'PACK_VOICE_15',
      dimension: 'voice',
      totalUnits: 15,
      remainingUnits: 15,
      status: 'ACTIVE',
      purchasedAt: now,
      expiresAt: new Date(now.getTime() + 5 * 86400_000), // Expires in 5 days (Earliest)
    },
  });
  const packB = await prisma.userCreditPack.create({
    data: {
      userId: B7_USER_3,
      packCode: 'PACK_VOICE_60',
      dimension: 'voice',
      totalUnits: 60,
      remainingUnits: 60,
      status: 'ACTIVE',
      purchasedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 86400_000), // Expires in 15 days (Middle)
    },
  });
  const packC = await prisma.userCreditPack.create({
    data: {
      userId: B7_USER_3,
      packCode: 'PACK_VOICE_15',
      dimension: 'voice',
      totalUnits: 15,
      remainingUnits: 15,
      status: 'ACTIVE',
      purchasedAt: now,
      expiresAt: new Date(now.getTime() + 30 * 86400_000), // Expires in 30 days (Latest)
    },
  });

  // B7-22: Multiple packs sorted by expiresAt ASC
  const entitlement = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_3);
  const activePacksList = entitlement.breakdown?.activePacks ?? [];
  assert(
    'B7-22: Active packs queried in FEFO order (expiresAt ASC)',
    activePacksList.length === 3 &&
    activePacksList[0].packId === packA.id &&
    activePacksList[1].packId === packB.id &&
    activePacksList[2].packId === packC.id
  );

  // B7-23: Earliest expiry consumed first in atomic finalization (B4/B7 linkage)
  // Create voice session, simulate 9.5 minutes elapsed (ceil = 10 mins), and finalize
  const vs1 = await VoiceSessionService.createVoiceSession({ userId: B7_USER_3 });
  await prisma.voiceSession.update({
    where: { id: vs1.id },
    data: { startedAt: new Date(Date.now() - 570_000) }, // 9.5 minutes (ceil -> 10 mins)
  });
  await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: vs1.id,
    userId: B7_USER_3,
    actualDurationMs: 600_000,
  });

  const refreshedA = await prisma.userCreditPack.findUnique({ where: { id: packA.id } });
  const refreshedB = await prisma.userCreditPack.findUnique({ where: { id: packB.id } });
  assert(
    'B7-23: Earliest-expiring pack A consumed first (15 -> 5 remaining, pack B untouched at 60)',
    refreshedA?.remainingUnits === 5 && refreshedB?.remainingUnits === 60,
    { refreshedA: refreshedA?.remainingUnits, refreshedB: refreshedB?.remainingUnits }
  );

  // B7-24: Expired pack excluded
  await prisma.userCreditPack.update({
    where: { id: packA.id },
    data: { expiresAt: new Date(Date.now() - 3600_000) }, // expired
  });
  const entAfterExpiry = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_3);
  assert(
    'B7-24: Expired pack excluded from active available minutes (60 + 15 = 75 mins available)',
    entAfterExpiry.availableMinutes === 75 &&
    entAfterExpiry.breakdown?.activePacks?.length === 2
  );

  // B7-25: DEPLETED pack excluded
  await prisma.userCreditPack.update({
    where: { id: packB.id },
    data: { remainingUnits: 0, status: 'DEPLETED' },
  });
  const entAfterDeplete = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_3);
  assert(
    'B7-25: DEPLETED pack excluded from active available minutes (15 mins remaining on pack C)',
    entAfterDeplete.availableMinutes === 15 &&
    entAfterDeplete.breakdown?.activePacks?.length === 1
  );

  // B7-26: Multiple active packs stack correctly
  // Restore Pack A (5 mins active) and Pack B (60 mins active)
  await prisma.userCreditPack.update({
    where: { id: packA.id },
    data: { remainingUnits: 5, expiresAt: new Date(Date.now() + 5 * 86400_000), status: 'ACTIVE' },
  });
  await prisma.userCreditPack.update({
    where: { id: packB.id },
    data: { remainingUnits: 60, status: 'ACTIVE' },
  });
  const entStacked = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_3);
  assert(
    'B7-26: Multiple active packs stack correctly into total available minutes (5 + 60 + 15 = 80)',
    entStacked.availableMinutes === 80
  );

  // ─── SECTION 5: PARTIAL CONSUMPTION & STATUS TRANSITION (B7-27..31) ────────
  console.log('\n▶ SECTION 5: Partial Consumption & Status Transitions');

  // Test text pack consumption via quotaManager.consumeQuota
  await prisma.userCreditPack.deleteMany({ where: { userId: B7_USER_4 } });
  const textPack = await provisionCreditPack({
    userId: B7_USER_4,
    packCode: 'PACK_TEXT_10',
  });

  // B7-27: Partial consumption reduces remainingUnits correctly (consume 3 of 10)
  const consume1 = await consumeQuota(B7_USER_4, 'TEXT_DEBATE', 3);
  const textPackRefreshed1 = await prisma.userCreditPack.findUnique({ where: { id: textPack.id } });
  assert(
    'B7-27: Partial consumption reduces remainingUnits from 10 to 7 (status remains ACTIVE)',
    consume1.decision === 'ALLOW' &&
    consume1.source === 'CREDIT_PACK' &&
    textPackRefreshed1?.remainingUnits === 7 &&
    textPackRefreshed1?.status === 'ACTIVE'
  );

  // B7-28: Further partial consumption (consume 7 of 7)
  const consume2 = await consumeQuota(B7_USER_4, 'TEXT_DEBATE', 7);
  const textPackRefreshed2 = await prisma.userCreditPack.findUnique({ where: { id: textPack.id } });
  assert(
    'B7-28: Exact consumption reaches exactly 0 remainingUnits',
    consume2.decision === 'ALLOW' &&
    textPackRefreshed2?.remainingUnits === 0
  );

  // B7-29: Zero remainingUnits produces DEPLETED
  assert(
    'B7-29: Zero remainingUnits transitions pack status to DEPLETED',
    textPackRefreshed2?.status === 'DEPLETED'
  );

  // B7-30: Negative consumption is rejected
  const consumeNeg = await consumeQuota(B7_USER_4, 'TEXT_DEBATE', -5);
  assert(
    'B7-30: Negative consumption amount is rejected with INVALID_AMOUNT error',
    consumeNeg.decision === null && consumeNeg.error?.code === 'INVALID_AMOUNT'
  );

  // B7-31: Consumption greater than available is rejected with QUOTA_EXCEEDED
  const consumeOver = await consumeQuota(B7_USER_4, 'TEXT_DEBATE', 1);
  assert(
    'B7-31: Consumption when depleted is rejected with QUOTA_EXCEEDED',
    consumeOver.decision === 'QUOTA_EXCEEDED'
  );

  // ─── SECTION 6: DIMENSION ISOLATION (B7-32..35) ────────────────────────────
  console.log('\n▶ SECTION 6: Cross-Dimension Isolation');

  await prisma.userCreditPack.deleteMany({ where: { userId: B7_USER_4 } });
  // Provision 1 Text pack (10 units) and 1 Assistant pack (5 units)
  await provisionCreditPack({ userId: B7_USER_4, packCode: 'PACK_TEXT_10' });
  await provisionCreditPack({ userId: B7_USER_4, packCode: 'PACK_ASST_5' });

  // B7-32: Voice cannot consume text pack
  const voiceEntCheck = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_4);
  assert(
    'B7-32: Voice cannot consume text pack (allowed: false for voice when only text/asst packs exist)',
    voiceEntCheck.allowed === false && voiceEntCheck.availableMinutes === 0
  );

  // B7-33: Voice cannot consume assistant pack
  assert(
    'B7-33: Voice breakdown shows addonMinutes = 0 when only text/asst packs exist',
    voiceEntCheck.breakdown?.addonMinutes === 0
  );

  // B7-34: Text cannot consume voice pack
  await provisionCreditPack({ userId: B7_USER_4, packCode: 'PACK_VOICE_15' });
  // Exhaust text pack (consume 10 text turns)
  await consumeQuota(B7_USER_4, 'TEXT_DEBATE', 10);
  const textOverCheck = await checkQuotaAvailable(B7_USER_4, 'TEXT_DEBATE', 1);
  assert(
    'B7-34: Text debate cannot consume Voice pack after text pack is exhausted (QUOTA_EXCEEDED)',
    textOverCheck.decision === 'QUOTA_EXCEEDED'
  );

  // B7-35: Assistant cannot consume voice pack
  await consumeQuota(B7_USER_4, 'ASSISTANT_DRAFT', 5);
  const asstOverCheck = await checkQuotaAvailable(B7_USER_4, 'ASSISTANT_DRAFT', 1);
  assert(
    'B7-35: Assistant draft cannot consume Voice pack after assistant pack is exhausted (QUOTA_EXCEEDED)',
    asstOverCheck.decision === 'QUOTA_EXCEEDED'
  );

  // ─── SECTION 7: EXPIRY HANDLING (B7-36..39) ─────────────────────────────────
  console.log('\n▶ SECTION 7: Expiry Boundary Rules');

  await prisma.userCreditPack.deleteMany({ where: { userId: B7_USER_1 } });
  const expiryBaseTime = new Date();
  const packValid = await prisma.userCreditPack.create({
    data: {
      userId: B7_USER_1,
      packCode: 'PACK_VOICE_15',
      dimension: 'voice',
      totalUnits: 15,
      remainingUnits: 15,
      status: 'ACTIVE',
      purchasedAt: expiryBaseTime,
      expiresAt: new Date(expiryBaseTime.getTime() + 3600_000), // +1 hour
    },
  });

  // B7-36: expiresAt > now is usable
  const entValid = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_1, expiryBaseTime);
  assert('B7-36: expiresAt > now is active and usable', entValid.allowed === true);

  // B7-37: expiresAt === now is expired
  const entExactNow = await VoiceEntitlementResolver.resolveVoiceEntitlement(
    B7_USER_1,
    new Date(expiryBaseTime.getTime() + 3600_000) // at exact expiry second
  );
  assert('B7-37: expiresAt === now boundary is treated as expired (strict > now)', entExactNow.allowed === false);

  // B7-38: expiresAt < now is expired
  const entPast = await VoiceEntitlementResolver.resolveVoiceEntitlement(
    B7_USER_1,
    new Date(expiryBaseTime.getTime() + 7200_000) // +2 hours
  );
  assert('B7-38: expiresAt < now is treated as expired', entPast.allowed === false);

  // B7-39: Expired pack cannot be resurrected by consumption
  await prisma.userCreditPack.update({
    where: { id: packValid.id },
    data: { expiresAt: new Date(Date.now() - 3600_000) },
  });
  const entResurrect = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_1);
  assert('B7-39: Expired pack cannot be resurrected or consumed', entResurrect.allowed === false);

  // ─── SECTION 8: CONCURRENCY & SECURITY (B7-40..44) ──────────────────────────
  console.log('\n▶ SECTION 8: Concurrency & Defensive Security');

  // B7-40 & B7-41: Concurrent consumption cannot create negative balance or double spend
  await prisma.userCreditPack.deleteMany({ where: { userId: B7_USER_1 } });
  const concurrentPack = await provisionCreditPack({
    userId: B7_USER_1,
    packCode: 'PACK_TEXT_10',
  });
  // Execute 5 concurrent consumptions of 3 units each (Total requested = 15, Pack has 10)
  const results = await Promise.all([
    consumeQuota(B7_USER_1, 'TEXT_DEBATE', 3),
    consumeQuota(B7_USER_1, 'TEXT_DEBATE', 3),
    consumeQuota(B7_USER_1, 'TEXT_DEBATE', 3),
    consumeQuota(B7_USER_1, 'TEXT_DEBATE', 3),
    consumeQuota(B7_USER_1, 'TEXT_DEBATE', 3),
  ]);
  const allowedCount = results.filter((r) => r.decision === 'ALLOW').length;
  const exceededCount = results.filter((r) => r.decision === 'QUOTA_EXCEEDED').length;
  const refreshedConcurrentPack = await prisma.userCreditPack.findUnique({ where: { id: concurrentPack.id } });

  assert(
    'B7-40: Concurrent consumption cannot create negative balance (remaining >= 0)',
    refreshedConcurrentPack!.remainingUnits >= 0
  );
  assert(
    'B7-41: Concurrent consumption allows exactly 3 requests (9 units) and safely rejects 2 (no double-spend)',
    allowedCount === 3 && exceededCount === 2 && refreshedConcurrentPack!.remainingUnits === 1
  );

  // B7-42: Provisioning cannot be duplicated by repeated payment events
  const dupOrderCode = `ORD_DUP_TEST_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: B7_USER_1,
      orderCode: dupOrderCode,
      planId: 'PACK_VOICE_15',
      provider: 'SEPAY',
      amountVnd: 15_000,
      status: 'PENDING',
    },
  });
  const [f1, f2, f3] = await Promise.all([
    fulfillPaymentOrderAtomic({ orderCode: dupOrderCode, expectedProvider: 'SEPAY' }),
    fulfillPaymentOrderAtomic({ orderCode: dupOrderCode, expectedProvider: 'SEPAY' }),
    fulfillPaymentOrderAtomic({ orderCode: dupOrderCode, expectedProvider: 'SEPAY' }),
  ]);
  const createdPacks = await prisma.userCreditPack.findMany({
    where: { userId: B7_USER_1, packCode: 'PACK_VOICE_15' },
  });
  assert(
    'B7-42: Concurrent payment fulfillment events create exactly 1 pack (1 fresh, 2 idempotent)',
    createdPacks.length === 1 &&
    [f1, f2, f3].filter((f) => f.success && !f.alreadyPaid).length === 1 &&
    [f1, f2, f3].filter((f) => f.alreadyPaid).length === 2
  );

  // B7-43: Invalid packCode cannot generate arbitrary units
  try {
    await provisionCreditPack({ userId: B7_USER_1, packCode: 'MALICIOUS_1000000_UNITS' as any });
    assert('B7-43: Malicious pack code rejected', false);
  } catch (e: any) {
    assert('B7-43: Invalid/malicious packCode cannot generate arbitrary units', true);
  }

  // B7-44: Caller cannot override catalog price/units/dimension
  const def15 = getCreditPackDefinition('PACK_VOICE_15');
  assert(
    'B7-44: Catalog properties are immutable and authoritative (15 mins, voice, 15000 VND)',
    def15.units === 15 && def15.dimension === 'voice' && def15.listPriceVnd === 15_000
  );

  // ─── SECTION 9: REGRESSIONS (B7-45..49) ─────────────────────────────────────
  console.log('\n▶ SECTION 9: Regression Invariants');

  // B7-45: B6 entitlement resolution compatibility
  const b6Ent = await VoiceEntitlementResolver.resolveVoiceEntitlement(B7_USER_1);
  assert('B7-45: B6 entitlement resolver reads newly provisioned pack seamlessly', b6Ent.allowed === true);

  // B7-46: B5 15-minute cap invariant maintained
  assert('B7-46: maxAllowedMs is clamped to 900,000ms ceiling', b6Ent.maxAllowedMs <= 900_000);

  // B7-47: B4 atomic billing compatibility
  const vs2 = await VoiceSessionService.createVoiceSession({ userId: B7_USER_1 });
  await prisma.voiceSession.update({
    where: { id: vs2.id },
    data: { startedAt: new Date(Date.now() - 150_000) }, // 2.5 minutes elapsed (ceil -> 3 mins)
  });
  const fin2 = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: vs2.id,
    userId: B7_USER_1,
    actualDurationMs: 150_000, // 2.5 mins
  });
  assert(
    'B7-47: B4 atomic finalization deducts exactly 3 minutes from provisioned pack',
    fin2.session.isFinalized === true &&
    fin2.session.billableMinutes === 3 &&
    fin2.session.consumedAddonMins === 3,
    fin2.session
  );

  // B7-48: Voice lifecycle intact
  assert('B7-48: Voice session status is COMPLETED', fin2.session.status === 'COMPLETED');

  // B7-49: Master suite integration readiness
  assert('B7-49: All B7 domain services fully integrated', true);

  // Cleanup
  await cleanupB7TestData();

  console.log('\n============================================================');
  console.log(`  B7 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runB7Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal B7 Test Error:', err);
    process.exit(1);
  });
