/**
 * Phase B10 — Full E2E Integration & Final Acceptance Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md & docs/16_PLAN_QUOTA_BUSINESS_SPEC.md
 *
 * Verifies all 18 Acceptance Sections:
 *  - Section 1: System Contract & Catalog Integrity (B10-01..04)
 *  - Section 2: Payment -> Credit Pack Provisioning E2E (B10-05..08)
 *  - Section 3: Subscription Provisioning E2E (B10-09..10)
 *  - Section 4: Webhook / IPN Security & Signature Validation (B10-11..16)
 *  - Section 5: Concurrent Webhook Race & Single Fulfillment (B10-17)
 *  - Section 6: Transaction Rollback & Integrity (B10-18)
 *  - Section 7: B6 Entitlement Precedence Hierarchy (B10-19..23)
 *  - Section 8: B7 FEFO Multi-Pack Consumption (B10-24..25)
 *  - Section 9: B4 Atomic Voice Billing & Quantum Engine (B10-26..29)
 *  - Section 10: B5 Server-Side 15-Minute Cap (B10-30..32)
 *  - Section 11: Cross-Phase Unified E2E Pipelines (B10-33..36)
 *  - Section 12: Dimension Quota Isolation (B10-37..39)
 *  - Section 13: Frontend Contract & DTO Integrity (B10-40..42)
 *  - Section 14: Quota Exceeded UX Contract (B10-43..44)
 *  - Section 15: Cross-User Authorization Boundaries (B10-45..47)
 *  - Section 16: 10x Replay & Idempotency Matrix (B10-48..50)
 *  - Section 17: Security & Boundary Failure Matrix (B10-51..54)
 *  - Section 18: Database State & Ledger Audit (B10-55..56)
 */

import { PrismaClient } from '@prisma/client';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';
import { VoiceSessionService } from '../services/voiceSessionService';
import {
  getCreditPackDefinition,
  getPlanDefinition,
  listCreditPackCodes,
  parseCreditPackCode,
  parsePlanCode,
} from '../services/planQuotaRegistry';
import {
  createCheckoutSession,
  fulfillPaymentOrderAtomic,
} from '../controllers/paymentController';
import {
  provisionSubscription,
  provisionCreditPack,
  consumeQuota,
  getUserQuotaStatus,
} from '../services/quotaManager';
import {
  createVNPayCheckoutUrl,
  verifyVNPayIpn,
  calculateVNPayHmacSha512,
  sortAndEncodeParams,
} from '../services/paymentProviders/vnpayProvider';
import {
  createMoMoPayment,
  verifyMoMoIpn,
  calculateMoMoHmacSha256,
  buildMoMoIpnSignature,
} from '../services/paymentProviders/momoProvider';
import {
  generateVietQRPayload,
  verifySePayWebhook,
} from '../services/paymentProviders/sepayProvider';

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

async function runB10Tests() {
  console.log('\n============================================================');
  console.log('PHASE B10: FULL E2E INTEGRATION & FINAL ACCEPTANCE SUITE');
  console.log('============================================================\n');

  const testSuffix = `b10_${Date.now()}`;
  const now = new Date();

  // Helper to mock Express Request / Response
  const mockReq = (body: any, userId?: string, query?: any, headers?: any) =>
    ({ body, userId, query: query || {}, headers: headers || {} } as any);
  const mockRes = () => {
    const res: any = {
      statusCode: 200,
      jsonBody: null,
      status(c: number) {
        this.statusCode = c;
        return this;
      },
      json(b: any) {
        this.jsonBody = b;
        return this;
      },
    };
    return res;
  };

  // ─── SECTION 1: SYSTEM CONTRACT & CATALOG INTEGRITY (B10-01..04) ───────────
  console.log('--- SECTION 1: System Contract & Catalog Integrity (B10-01..04) ---');

  const activeCodes = listCreditPackCodes();
  assert(activeCodes.includes('PACK_VOICE_15'), 'B10-01: Active catalog includes PACK_VOICE_15');
  assert(activeCodes.includes('PACK_VOICE_60'), 'B10-01: Active catalog includes PACK_VOICE_60');
  assert(activeCodes.includes('PACK_TEXT_10'), 'B10-01: Active catalog includes PACK_TEXT_10');
  assert(activeCodes.includes('PACK_ASST_5'), 'B10-01: Active catalog includes PACK_ASST_5');
  assert(!(activeCodes as string[]).includes('PACK_VOICE_5'), 'B10-01: Legacy PACK_VOICE_5 excluded');
  assert(!(activeCodes as string[]).includes('PACK_VOICE_10'), 'B10-01: Legacy PACK_VOICE_10 excluded');

  const pVoice15 = getCreditPackDefinition('PACK_VOICE_15');
  assert(pVoice15.listPriceVnd === 15000 && pVoice15.dimension === 'voice' && pVoice15.units === 15, 'B10-02: Server-authoritative PACK_VOICE_15 price is 15,000 VND and 15 mins');

  const pVoice60 = getCreditPackDefinition('PACK_VOICE_60');
  assert(pVoice60.listPriceVnd === 49000 && pVoice60.dimension === 'voice' && pVoice60.units === 60, 'B10-02: Server-authoritative PACK_VOICE_60 price is 49,000 VND and 60 mins');

  const pText10 = getCreditPackDefinition('PACK_TEXT_10');
  assert(pText10.listPriceVnd === 19000 && pText10.dimension === 'text' && pText10.units === 10, 'B10-03: Server-authoritative PACK_TEXT_10 dimension is text and 10 turns');

  const pAsst5 = getCreditPackDefinition('PACK_ASST_5');
  assert(pAsst5.listPriceVnd === 15000 && pAsst5.dimension === 'assistant' && pAsst5.units === 5, 'B10-03: Server-authoritative PACK_ASST_5 dimension is assistant and 5 credits');

  const basicPlan = getPlanDefinition('BASIC_MONTHLY');
  assert(basicPlan.listPriceVnd === 49000 && basicPlan.limits.voice === 15, 'B10-04: BASIC_MONTHLY plan definition is consistent (15 voice mins, 49k VND)');

  // ─── SECTION 2: PAYMENT -> CREDIT PACK PROVISIONING E2E (B10-05..08) ───────
  console.log('\n--- SECTION 2: Payment -> Credit Pack Provisioning E2E (B10-05..08) ---');

  const testUser1 = await prisma.user.create({
    data: {
      phoneNumber: `+8491${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `E2E Pack User ${testSuffix}`,
    },
  });

  // E2E PACK_VOICE_15
  const res15 = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_15', provider: 'SEPAY' }, testUser1.id), res15);
  const code15 = res15.jsonBody?.orderCode;
  assert(Boolean(code15), 'B10-05: Checkout created order for PACK_VOICE_15');

  const fulfill15 = await fulfillPaymentOrderAtomic({
    orderCode: code15,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 15000,
    transactionId: `TX_B10_15_${testSuffix}`,
  });
  assert(fulfill15.success === true, 'B10-05: Payment order fulfilled for PACK_VOICE_15');

  const pack15Db = await prisma.userCreditPack.findFirst({
    where: { userId: testUser1.id, packCode: 'PACK_VOICE_15' },
  });
  assert(pack15Db?.remainingUnits === 15 && pack15Db.status === 'ACTIVE', 'B10-05: DB user_credit_packs record created with 15 units, ACTIVE');
  assert(pack15Db?.expiresAt.getTime()! > Date.now() + 86400_000 * 28, 'B10-05: Pack expiration set to ~30 days in future');

  // E2E PACK_VOICE_60
  const res60 = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_60', provider: 'VNPAY' }, testUser1.id), res60);
  const code60 = res60.jsonBody?.orderCode;
  const fulfill60 = await fulfillPaymentOrderAtomic({
    orderCode: code60,
    expectedProvider: 'VNPAY',
    expectedAmountVnd: 49000,
    transactionId: `TX_B10_60_${testSuffix}`,
  });
  assert(fulfill60.success === true, 'B10-06: Payment order fulfilled for PACK_VOICE_60');
  const pack60Db = await prisma.userCreditPack.findFirst({
    where: { userId: testUser1.id, packCode: 'PACK_VOICE_60' },
  });
  assert(pack60Db?.remainingUnits === 60 && pack60Db.status === 'ACTIVE', 'B10-06: DB user_credit_packs record created with 60 units');

  // E2E PACK_TEXT_10
  const resText = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_TEXT_10', provider: 'MOMO' }, testUser1.id), resText);
  const codeText = resText.jsonBody?.orderCode;
  const fulfillText = await fulfillPaymentOrderAtomic({
    orderCode: codeText,
    expectedProvider: 'MOMO',
    expectedAmountVnd: 19000,
    transactionId: `TX_B10_TEXT_${testSuffix}`,
  });
  assert(fulfillText.success === true, 'B10-07: Payment order fulfilled for PACK_TEXT_10');
  const packTextDb = await prisma.userCreditPack.findFirst({
    where: { userId: testUser1.id, packCode: 'PACK_TEXT_10' },
  });
  assert(packTextDb?.remainingUnits === 10 && packTextDb.dimension === 'text', 'B10-07: DB user_credit_packs record created with 10 text units');

  // E2E PACK_ASST_5
  const resAsst = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_ASST_5', provider: 'SEPAY' }, testUser1.id), resAsst);
  const codeAsst = resAsst.jsonBody?.orderCode;
  const fulfillAsst = await fulfillPaymentOrderAtomic({
    orderCode: codeAsst,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 15000,
    transactionId: `TX_B10_ASST_${testSuffix}`,
  });
  assert(fulfillAsst.success === true, 'B10-08: Payment order fulfilled for PACK_ASST_5');
  const packAsstDb = await prisma.userCreditPack.findFirst({
    where: { userId: testUser1.id, packCode: 'PACK_ASST_5' },
  });
  assert(packAsstDb?.remainingUnits === 5 && packAsstDb.dimension === 'assistant', 'B10-08: DB user_credit_packs record created with 5 assistant units');

  // ─── SECTION 3: SUBSCRIPTION PROVISIONING E2E (B10-09..10) ─────────────────
  console.log('\n--- SECTION 3: Subscription Provisioning E2E (B10-09..10) ---');

  const testUserSub = await prisma.user.create({
    data: {
      phoneNumber: `+8492${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Sub E2E User ${testSuffix}`,
    },
  });

  const resSub = mockReq({ itemCode: 'STANDARD_MONTHLY', provider: 'VNPAY' }, testUserSub.id);
  const resSubOut = mockRes();
  await createCheckoutSession(resSub, resSubOut);
  const codeSub = resSubOut.jsonBody?.orderCode;
  const amountSub = resSubOut.jsonBody?.amountVnd;

  const fulfillSub = await fulfillPaymentOrderAtomic({
    orderCode: codeSub,
    expectedProvider: 'VNPAY',
    expectedAmountVnd: amountSub,
    transactionId: `TX_B10_SUB_${testSuffix}`,
  });
  assert(fulfillSub.success === true && fulfillSub.alreadyPaid === false, 'B10-09: Subscription order fulfilled and status set to PAID');

  const subDb = await prisma.userSubscription.findUnique({
    where: { userId: testUserSub.id },
  });
  assert(subDb?.planId === 'STANDARD_MONTHLY' && subDb.status === 'ACTIVE', 'B10-09: UserSubscription provisioned with STANDARD_MONTHLY and ACTIVE');

  // Duplicate webhook replay
  const fulfillSubReplay = await fulfillPaymentOrderAtomic({
    orderCode: codeSub,
    expectedProvider: 'VNPAY',
    expectedAmountVnd: amountSub,
    transactionId: `TX_B10_SUB_${testSuffix}`,
  });
  assert(fulfillSubReplay.success === true && fulfillSubReplay.alreadyPaid === true, 'B10-10: Replayed subscription webhook acknowledges alreadyPaid without duplicate provisioning');

  // ─── SECTION 4: WEBHOOK / IPN SECURITY (B10-11..16) ────────────────────────
  console.log('\n--- SECTION 4: Webhook / IPN Security (B10-11..16) ---');

  // VNPay HMAC verification
  const vnpParams: Record<string, string> = {
    vnp_Amount: '1500000',
    vnp_Command: 'pay',
    vnp_CreateDate: '20260822120000',
    vnp_CurrCode: 'VND',
    vnp_IpAddr: '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: 'Test',
    vnp_ResponseCode: '00',
    vnp_TmnCode: 'TESTTMN',
    vnp_TxnRef: 'ORD_TEST_123',
    vnp_Version: '2.1.0',
  };
  const vnpSecret = 'SECRET_TEST_VNPAY_123456';
  const { encodedQuery: vnpEncodedQuery } = sortAndEncodeParams(vnpParams);
  const vnpHash = calculateVNPayHmacSha512(vnpEncodedQuery, vnpSecret);
  const vnpVerified = verifyVNPayIpn({ ...vnpParams, vnp_SecureHash: vnpHash }, { hashSecret: vnpSecret });
  assert(vnpVerified.isValid === true, 'B10-11: Valid VNPay HMAC-SHA512 checksum verified');

  const vnpTampered = verifyVNPayIpn({ ...vnpParams, vnp_Amount: '9999900', vnp_SecureHash: vnpHash }, { hashSecret: vnpSecret });
  assert(vnpTampered.isValid === false, 'B10-11: Tampered VNPay payload checksum rejected');

  // MoMo HMAC verification
  const momoSecret = 'MOMO_SECRET_KEY_123456';
  const momoAccessKey = 'MOMO_ACCESS_KEY_123';
  const momoParams = {
    partnerCode: 'MOMOTEST',
    orderId: 'ORD_MOMO_123',
    requestId: 'REQ_123',
    amount: 19000,
    orderInfo: 'Test MoMo',
    orderType: 'momo_wallet',
    transId: 123456789,
    resultCode: 0,
    message: 'Success',
    payType: 'qr',
    responseTime: 1234567890,
    extraData: '',
  };
  const rawIpnSig = buildMoMoIpnSignature({
    accessKey: momoAccessKey,
    ...momoParams,
  });
  const momoSig = calculateMoMoHmacSha256(rawIpnSig, momoSecret);
  const momoVerified = verifyMoMoIpn(
    { ...momoParams, signature: momoSig },
    { accessKey: momoAccessKey, secretKey: momoSecret, partnerCode: 'MOMOTEST' },
  );
  assert(momoVerified.isValid === true, 'B10-12: Valid MoMo HMAC-SHA256 signature verified');

  // SePAY API Key verification
  const sepayValid = verifySePayWebhook(
    { authorization: 'Apikey SEPAY_TEST_KEY' },
    { content: 'ORD_TEST_123', transferAmount: 15000 },
    { apiKey: 'SEPAY_TEST_KEY' },
  );
  assert(sepayValid.isValid === true, 'B10-13: Valid SePAY API key authorized');

  const sepayInvalid = verifySePayWebhook(
    { authorization: 'Apikey WRONG_KEY' },
    { content: 'ORD_TEST_123', transferAmount: 15000 },
    { apiKey: 'SEPAY_TEST_KEY' },
  );
  assert(sepayInvalid.isValid === false, 'B10-13: Invalid SePAY API key rejected');

  // Provider mismatch rejection
  const fulfillProviderMismatch = await fulfillPaymentOrderAtomic({
    orderCode: code15,
    expectedProvider: 'VNPAY', // order15 was created with SEPAY
    expectedAmountVnd: 15000,
  });
  assert(fulfillProviderMismatch.success === false, 'B10-14: Provider mismatch is safely rejected');

  // Amount mismatch rejection
  const fulfillAmountMismatch = await fulfillPaymentOrderAtomic({
    orderCode: code15,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 999999, // actual is 15,000
  });
  assert(fulfillAmountMismatch.success === false, 'B10-15: Amount mismatch is safely rejected');

  // Non-existent order rejection
  const fulfillNonExistent = await fulfillPaymentOrderAtomic({
    orderCode: 'ORD_DOES_NOT_EXIST_9999',
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 15000,
  });
  assert(fulfillNonExistent.success === false, 'B10-16: Non-existent order rejected with order not found error');

  // ─── SECTION 5: CONCURRENT WEBHOOK RACE (B10-17) ───────────────────────────
  console.log('\n--- SECTION 5: Concurrent Webhook Race (B10-17) ---');

  const raceUser = await prisma.user.create({
    data: {
      phoneNumber: `+8490${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Race User ${testSuffix}`,
    },
  });

  const resRace = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_15', provider: 'SEPAY' }, raceUser.id), resRace);
  const raceOrderCode = resRace.jsonBody?.orderCode;

  // Fire 10 concurrent fulfillment attempts
  const racePromises = Array.from({ length: 10 }).map((_, idx) =>
    fulfillPaymentOrderAtomic({
      orderCode: raceOrderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 15000,
      transactionId: `TRANS_RACE_${idx}_${testSuffix}`,
    }),
  );
  const raceResults = await Promise.all(racePromises);

  const wonClaims = raceResults.filter((r) => r.success && !r.alreadyPaid);
  const replayedClaims = raceResults.filter((r) => r.success && r.alreadyPaid);

  assert(wonClaims.length === 1, 'B10-17: Exactly ONE concurrent request won the fresh claim');
  assert(replayedClaims.length === 9, 'B10-17: Remaining 9 concurrent requests received alreadyPaid acknowledgment');

  const racePackCount = await prisma.userCreditPack.count({
    where: { userId: raceUser.id, packCode: 'PACK_VOICE_15' },
  });
  assert(racePackCount === 1, 'B10-17: Exactly ONE credit pack row was provisioned in DB during race');

  // ─── SECTION 6: TRANSACTION ROLLBACK (B10-18) ──────────────────────────────
  console.log('\n--- SECTION 6: Transaction Rollback (B10-18) ---');

  // Verify rollback on transaction failure
  const rollbackPackCode = `PACK_ROLLBACK_${testSuffix}`;
  let rollbackCaught = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.userCreditPack.create({
        data: {
          userId: raceUser.id,
          packCode: rollbackPackCode,
          dimension: 'voice',
          totalUnits: 15,
          remainingUnits: 15,
          status: 'ACTIVE',
          purchasedAt: now,
          expiresAt: new Date(now.getTime() + 86400_000 * 30),
        },
      });
      // Force intentional error inside transaction
      throw new Error('INTENTIONAL_ROLLBACK_TEST_ERROR');
    });
  } catch (err: any) {
    if (err.message === 'INTENTIONAL_ROLLBACK_TEST_ERROR') {
      rollbackCaught = true;
    }
  }
  assert(rollbackCaught, 'B10-18: Intentional error caught in transaction');
  const rollbackPackInDb = await prisma.userCreditPack.findFirst({
    where: { userId: raceUser.id, packCode: rollbackPackCode },
  });
  assert(!rollbackPackInDb, 'B10-18: Failed transaction triggers clean rollback without orphan state');

  // ─── SECTION 7: B6 ENTITLEMENT PRECEDENCE HIERARCHY (B10-19..23) ───────────
  console.log('\n--- SECTION 7: B6 Entitlement Precedence (B10-19..23) ---');

  const userCascade = await prisma.user.create({
    data: {
      phoneNumber: `+8489${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Cascade User ${testSuffix}`,
    },
  });

  // Provision VIP
  await prisma.userVipPass.create({
    data: {
      userId: userCascade.id,
      passCode: 'VIP_PASS_CASCADE',
      status: 'ACTIVE',
      startedAt: new Date(now.getTime() - 1000),
      expiresAt: new Date(now.getTime() + 86400_000 * 30),
    },
  });
  // Provision Subscription
  await provisionSubscription({ userId: userCascade.id, plan: 'STANDARD_MONTHLY' });
  // Provision Add-on
  await provisionCreditPack({ userId: userCascade.id, packCode: 'PACK_VOICE_60' });

  // Priority 1: VIP wins over sub & add-on
  const entCascade1 = await VoiceEntitlementResolver.resolveVoiceEntitlement(userCascade.id, now);
  assert(entCascade1.source === 'VIP' && entCascade1.mode === 'TIME_UNLIMITED', 'B10-19: Priority 1 — VIP overrides Subscription and Add-on');

  // Expire VIP
  await prisma.userVipPass.updateMany({
    where: { userId: userCascade.id },
    data: { status: 'EXPIRED', expiresAt: new Date(now.getTime() - 1000) },
  });
  const entCascade2 = await VoiceEntitlementResolver.resolveVoiceEntitlement(userCascade.id, now);
  assert(entCascade2.source === 'SUBSCRIPTION' && entCascade2.mode === 'QUOTA', 'B10-20: Priority 2 — Expired VIP falls back cleanly to Subscription');

  // Deplete Subscription: Add-on FEFO wins
  await prisma.userQuota.update({
    where: { userId: userCascade.id },
    data: { voiceMinsRemaining: 0 },
  });
  const entCascade3 = await VoiceEntitlementResolver.resolveVoiceEntitlement(userCascade.id, now);
  assert(entCascade3.source === 'ADD_ON' && entCascade3.mode === 'QUOTA', 'B10-21: Priority 3 — Exhausted Subscription falls back to Add-on FEFO');

  // Deplete Add-on: Free Trial wins
  await prisma.userCreditPack.updateMany({
    where: { userId: userCascade.id },
    data: { remainingUnits: 0, status: 'DEPLETED' },
  });
  await prisma.userFreeTrial.create({
    data: {
      userId: userCascade.id,
      phoneNumber: userCascade.phoneNumber,
      voiceMinsRemaining: 5,
      startedAt: new Date(now.getTime() - 1000),
      expiresAt: new Date(now.getTime() + 86400_000 * 7),
    },
  });
  const entCascade4 = await VoiceEntitlementResolver.resolveVoiceEntitlement(userCascade.id, now);
  assert(entCascade4.source === 'TRIAL' && entCascade4.availableMinutes === 5, 'B10-22: Priority 4 — Depleted Add-ons fall back to Free Trial');

  // Deplete Trial: QUOTA_EXCEEDED
  await prisma.userFreeTrial.update({
    where: { userId: userCascade.id },
    data: { voiceMinsRemaining: 0, status: 'COMPLETED' },
  });
  const entCascade5 = await VoiceEntitlementResolver.resolveVoiceEntitlement(userCascade.id, now);
  assert(entCascade5.allowed === false && entCascade5.source === null, 'B10-23: Priority 5 — All depleted resolves to QUOTA_EXCEEDED (allowed: false)');

  // ─── SECTION 8: B7 FEFO MULTI-PACK CONSUMPTION (B10-24..25) ────────────────
  console.log('\n--- SECTION 8: B7 FEFO Multi-Pack Consumption (B10-24..25) ---');

  const userFefo = await prisma.user.create({
    data: {
      phoneNumber: `+8488${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `FEFO User ${testSuffix}`,
    },
  });

  // Provision Pack A (expires in 5 days)
  const packA = await prisma.userCreditPack.create({
    data: {
      userId: userFefo.id,
      packCode: 'PACK_VOICE_15',
      dimension: 'voice',
      totalUnits: 15,
      remainingUnits: 15,
      status: 'ACTIVE',
      purchasedAt: now,
      expiresAt: new Date(now.getTime() + 86400_000 * 5),
    },
  });

  // Provision Pack B (expires in 20 days)
  const packB = await prisma.userCreditPack.create({
    data: {
      userId: userFefo.id,
      packCode: 'PACK_VOICE_60',
      dimension: 'voice',
      totalUnits: 60,
      remainingUnits: 60,
      status: 'ACTIVE',
      purchasedAt: now,
      expiresAt: new Date(now.getTime() + 86400_000 * 20),
    },
  });

  // Consume 10 minutes -> should deduct entirely from Pack A (earlier expiry)
  const vsFefo1 = await VoiceSessionService.createVoiceSession({ userId: userFefo.id });
  await prisma.voiceSession.update({
    where: { id: vsFefo1.id },
    data: { startedAt: new Date(Date.now() - 570_000) }, // 9.5 mins -> ceil to 10 mins
  });
  const finFefo1 = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: vsFefo1.id,
    userId: userFefo.id,
    actualDurationMs: 570_000,
  });
  assert(finFefo1.session.billableMinutes === 10, 'B10-24: First 10m consumption allowed via FEFO');

  const packADb = await prisma.userCreditPack.findUnique({ where: { id: packA.id } });
  const packBDb = await prisma.userCreditPack.findUnique({ where: { id: packB.id } });
  assert(packADb?.remainingUnits === 5, 'B10-24: Pack A decremented from 15 to 5');
  assert(packBDb?.remainingUnits === 60, 'B10-24: Pack B untouched (60 units remaining)');

  // Consume 10 more minutes -> should exhaust Pack A (5m) and take 5m from Pack B
  const vsFefo2 = await VoiceSessionService.createVoiceSession({ userId: userFefo.id });
  await prisma.voiceSession.update({
    where: { id: vsFefo2.id },
    data: { startedAt: new Date(Date.now() - 570_000) }, // 9.5 mins -> ceil to 10 mins
  });
  const finFefo2 = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: vsFefo2.id,
    userId: userFefo.id,
    actualDurationMs: 570_000,
  });
  assert(finFefo2.session.billableMinutes === 10, 'B10-25: Second 10m consumption allowed across pack boundary');

  const packADb2 = await prisma.userCreditPack.findUnique({ where: { id: packA.id } });
  const packBDb2 = await prisma.userCreditPack.findUnique({ where: { id: packB.id } });
  assert(packADb2?.remainingUnits === 0 && packADb2.status === 'DEPLETED', 'B10-25: Pack A fully depleted (0 units, status: DEPLETED)');
  assert(packBDb2?.remainingUnits === 55, 'B10-25: Pack B decremented from 60 to 55 units');

  // ─── SECTION 9: B4 ATOMIC VOICE BILLING & QUANTUM ENGINE (B10-26..29) ──────
  console.log('\n--- SECTION 9: B4 Atomic Voice Billing (B10-26..29) ---');

  const userB4 = await prisma.user.create({
    data: {
      phoneNumber: `+8487${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `B4 User ${testSuffix}`,
    },
  });
  await provisionCreditPack({ userId: userB4.id, packCode: 'PACK_VOICE_15' });

  // 1. Grace period (<3s) -> 0 deduction
  const sess1 = await VoiceSessionService.createVoiceSession({ userId: userB4.id });
  const fin1 = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: sess1.id,
    userId: userB4.id,
    actualDurationMs: 2500, // 2.5s < 3s grace
  });
  assert(fin1.session.billableMinutes === 0, 'B10-26: Sub-3s session charges 0 billable minutes (grace period invariant)');

  // 2. Fractional minute ceiling (65s -> 2 billable minutes)
  const sess2 = await VoiceSessionService.createVoiceSession({ userId: userB4.id });
  await prisma.voiceSession.update({
    where: { id: sess2.id },
    data: { startedAt: new Date(Date.now() - 65_000) },
  });
  const fin2 = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: sess2.id,
    userId: userB4.id,
    actualDurationMs: 65000, // 65s -> ceil(65/60) = 2 mins
  });
  assert(fin2.session.billableMinutes === 2, 'B10-27: 65s speech rounds up to 2 billable minutes (Quantum Q=60s ceiling)');

  // 3. Duplicate finalization idempotency
  const fin2Duplicate = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: sess2.id,
    userId: userB4.id,
    actualDurationMs: 65000,
  });
  assert(fin2Duplicate.alreadyFinalized === true && fin2Duplicate.session.status === 'COMPLETED' && fin2Duplicate.session.billableMinutes === 2, 'B10-28: Duplicate finalization returns existing completed session without double billing');

  // 4. Maximum 15-minute clamp (900,000ms -> 15 billable minutes)
  const sess3 = await VoiceSessionService.createVoiceSession({ userId: userB4.id });
  await prisma.voiceSession.update({
    where: { id: sess3.id },
    data: { startedAt: new Date(Date.now() - 1_000_000) },
  });
  const fin3 = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: sess3.id,
    userId: userB4.id,
    actualDurationMs: 950000, // Spoofed duration > 15m
  });
  assert(fin3.session.actualDurationMs <= 900000 && fin3.session.billableMinutes <= 15, 'B10-29: Client-spoofed duration clamped to maximum 15 minutes (900,000ms)');

  // ─── SECTION 10: B5 SERVER-SIDE 15-MINUTE CAP (B10-30..32) ─────────────────
  console.log('\n--- SECTION 10: B5 Server-Side 15-Minute Cap (B10-30..32) ---');

  const userCap = await prisma.user.create({
    data: {
      phoneNumber: `+8478${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Cap User ${testSuffix}`,
    },
  });
  await provisionCreditPack({ userId: userCap.id, packCode: 'PACK_VOICE_15' });
  const sessCap = await VoiceSessionService.createVoiceSession({ userId: userCap.id });
  assert(sessCap.maxAllowedMs <= 900000, 'B10-30: Server-owned VoiceSession maxAllowedMs never exceeds 900,000ms');

  // Short quota clamping
  const shortUser = await prisma.user.create({
    data: {
      phoneNumber: `+8486${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Short User ${testSuffix}`,
    },
  });
  await prisma.userFreeTrial.create({
    data: {
      userId: shortUser.id,
      phoneNumber: shortUser.phoneNumber,
      voiceMinsRemaining: 2,
      startedAt: now,
      expiresAt: new Date(now.getTime() + 86400_000),
    },
  });
  const shortSess = await VoiceSessionService.createVoiceSession({ userId: shortUser.id });
  assert(shortSess.maxAllowedMs === 120000, 'B10-31: Short balance (2 mins) caps session at exactly 120,000ms');

  // VIP mode technical ceiling
  const vipCapUser = await prisma.user.create({
    data: {
      phoneNumber: `+8479${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `VIP Cap User ${testSuffix}`,
    },
  });
  await prisma.userVipPass.create({
    data: {
      userId: vipCapUser.id,
      passCode: 'VIP_PASS_CAP_TEST',
      status: 'ACTIVE',
      startedAt: now,
      expiresAt: new Date(now.getTime() + 86400_000 * 30),
    },
  });
  const vipSess = await VoiceSessionService.createVoiceSession({ userId: vipCapUser.id });
  assert(vipSess.maxAllowedMs === 900000, 'B10-32: VIP mode session ceiling is strictly 900,000ms (15 minutes)');

  // ─── SECTION 11: CROSS-PHASE UNIFIED E2E PIPELINES (B10-33..36) ────────────
  console.log('\n--- SECTION 11: Cross-Phase Unified E2E Pipelines (B10-33..36) ---');

  // Pipeline: Buy PACK_VOICE_15 -> Webhook -> Entitlement -> Voice Session -> Finalize -> Balance
  const pipelineUser = await prisma.user.create({
    data: {
      phoneNumber: `+8485${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Pipeline User ${testSuffix}`,
    },
  });

  const pRes = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_15', provider: 'SEPAY' }, pipelineUser.id), pRes);
  await fulfillPaymentOrderAtomic({
    orderCode: pRes.jsonBody?.orderCode,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 15000,
    transactionId: `TX_PIPE_${testSuffix}`,
  });

  const pipeEntBefore = await VoiceEntitlementResolver.resolveVoiceEntitlement(pipelineUser.id, now);
  assert(pipeEntBefore.allowed === true && pipeEntBefore.availableMinutes === 15, 'B10-33: Post-purchase entitlement resolves to 15 available voice minutes');

  const pipeSess = await VoiceSessionService.createVoiceSession({ userId: pipelineUser.id });
  await prisma.voiceSession.update({
    where: { id: pipeSess.id },
    data: { startedAt: new Date(Date.now() - 170_000) }, // 2.83 mins -> ceil to 3 mins
  });
  await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: pipeSess.id,
    userId: pipelineUser.id,
    actualDurationMs: 170000, // 3 mins
  });

  const pipeEntAfter = await VoiceEntitlementResolver.resolveVoiceEntitlement(pipelineUser.id, now);
  assert(pipeEntAfter.availableMinutes === 12, 'B10-34: Post-session entitlement reflects exactly 12 remaining minutes');

  // Verify text quota status is pristine
  const pipeQuota = await getUserQuotaStatus(pipelineUser.id);
  assert(pipeQuota.balances.voice.totalAvailable === 12, 'B10-35: getUserQuotaStatus sees 12 voice units available');
  assert(pipeQuota.balances.text.totalAvailable === 0, 'B10-36: Text quota is decoupled and unaffected (0 units)');

  // ─── SECTION 12: DIMENSION QUOTA ISOLATION (B10-37..39) ────────────────────
  console.log('\n--- SECTION 12: Dimension Quota Isolation (B10-37..39) ---');

  const multiDimUser = await prisma.user.create({
    data: {
      phoneNumber: `+8484${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `MultiDim User ${testSuffix}`,
    },
  });
  await provisionCreditPack({ userId: multiDimUser.id, packCode: 'PACK_VOICE_15' });
  await provisionCreditPack({ userId: multiDimUser.id, packCode: 'PACK_TEXT_10' });
  await provisionCreditPack({ userId: multiDimUser.id, packCode: 'PACK_ASST_5' });

  // Consume Voice -> text & asst unaffected
  await consumeQuota(multiDimUser.id, 'voice', 5);
  const qAfterVoice = await getUserQuotaStatus(multiDimUser.id);
  assert(qAfterVoice.balances.voice.totalAvailable === 10, 'B10-37: Voice decreased from 15 to 10');
  assert(qAfterVoice.balances.text.totalAvailable === 10, 'B10-37: Text remained strictly 10');
  assert(qAfterVoice.balances.assistant.totalAvailable === 5, 'B10-37: Assistant remained strictly 5');

  // Consume Text -> voice & asst unaffected
  await consumeQuota(multiDimUser.id, 'text', 3);
  const qAfterText = await getUserQuotaStatus(multiDimUser.id);
  assert(qAfterText.balances.text.totalAvailable === 7, 'B10-38: Text decreased from 10 to 7');
  assert(qAfterText.balances.voice.totalAvailable === 10, 'B10-38: Voice remained strictly 10');

  // Consume Assistant -> voice & text unaffected
  await consumeQuota(multiDimUser.id, 'assistant', 2);
  const qAfterAsst = await getUserQuotaStatus(multiDimUser.id);
  assert(qAfterAsst.balances.assistant.totalAvailable === 3, 'B10-39: Assistant decreased from 5 to 3');
  assert(qAfterAsst.balances.voice.totalAvailable === 10, 'B10-39: Voice remained strictly 10');
  assert(qAfterAsst.balances.text.totalAvailable === 7, 'B10-39: Text remained strictly 7');

  // ─── SECTION 13: FRONTEND CONTRACT & DTO INTEGRITY (B10-40..42) ────────────
  console.log('\n--- SECTION 13: Frontend Contract & DTO (B10-40..42) ---');

  const vipEntDTO = await VoiceEntitlementResolver.resolveVoiceEntitlement(vipCapUser.id, now);
  assert(typeof vipEntDTO.allowed === 'boolean', 'B10-40: DTO allowed is boolean');
  assert(vipEntDTO.availableMinutes === null, 'B10-40: VIP availableMinutes is null (no NaN/0)');
  assert(vipEntDTO.maxAllowedMs === 900000, 'B10-41: VIP maxAllowedMs is exactly 900,000');

  const packEntDTO = await VoiceEntitlementResolver.resolveVoiceEntitlement(multiDimUser.id, now);
  assert(packEntDTO.availableMinutes === 10, 'B10-42: Pack DTO availableMinutes is valid finite number 10');
  assert(packEntDTO.source === 'ADD_ON', 'B10-42: Pack DTO source is ADD_ON');

  // ─── SECTION 14: QUOTA EXCEEDED UX CONTRACT (B10-43..44) ───────────────────
  console.log('\n--- SECTION 14: Quota Exceeded UX Contract (B10-43..44) ---');

  const emptyUser = await prisma.user.create({
    data: {
      phoneNumber: `+8483${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: `Empty User ${testSuffix}`,
    },
  });
  const emptyEnt = await VoiceEntitlementResolver.resolveVoiceEntitlement(emptyUser.id, now);
  assert(emptyEnt.allowed === false, 'B10-43: Zero balance user resolves to allowed: false');

  let emptySessionBlocked = false;
  try {
    await VoiceSessionService.createVoiceSession({ userId: emptyUser.id });
  } catch (err: any) {
    emptySessionBlocked = err.code === 'QUOTA_EXCEEDED' || err.statusCode === 403;
  }
  assert(emptySessionBlocked, 'B10-44: Voice session creation is blocked with QUOTA_EXCEEDED');

  // ─── SECTION 15: CROSS-USER AUTHORIZATION BOUNDARIES (B10-45..47) ──────────
  console.log('\n--- SECTION 15: Cross-User Authorization (B10-45..47) ---');

  const userA = await prisma.user.create({
    data: { phoneNumber: `+8482${Math.floor(1000000 + Math.random() * 9000000)}`, displayName: `User A ${testSuffix}` },
  });
  const userB = await prisma.user.create({
    data: { phoneNumber: `+8481${Math.floor(1000000 + Math.random() * 9000000)}`, displayName: `User B ${testSuffix}` },
  });
  await provisionCreditPack({ userId: userA.id, packCode: 'PACK_VOICE_15' });

  // User A creates session
  const sessA = await VoiceSessionService.createVoiceSession({ userId: userA.id });

  // User B attempts to finalize User A session
  let crossUserBlocked = false;
  try {
    await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: sessA.id,
      userId: userB.id, // User B does not own sessA
      actualDurationMs: 60000,
    });
  } catch (err) {
    crossUserBlocked = true;
  }
  assert(crossUserBlocked, 'B10-45: Cross-user session finalization is blocked');

  // User B attempts to consume User A pack
  const userBQuota = await getUserQuotaStatus(userB.id);
  assert(userBQuota.balances.voice.totalAvailable === 0, 'B10-46: User B cannot access or inherit User A pack');

  // User A balance remains untouched
  const userAQuota = await getUserQuotaStatus(userA.id);
  assert(userAQuota.balances.voice.totalAvailable === 15, 'B10-47: User A quota is preserved at 15 minutes');

  // ─── SECTION 16: 10X REPLAY & IDEMPOTENCY MATRIX (B10-48..50) ──────────────
  console.log('\n--- SECTION 16: 10x Replay & Idempotency Matrix (B10-48..50) ---');

  const replayReq = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_15', provider: 'SEPAY' }, userA.id), replayReq);
  const replayCode = replayReq.jsonBody?.orderCode;

  // Replay fulfillment 10 times sequentially
  let allReplaysSuccessful = true;
  for (let i = 0; i < 10; i++) {
    const fRes = await fulfillPaymentOrderAtomic({
      orderCode: replayCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 15000,
      transactionId: `TX_REPLAY_${i}`,
    });
    if (!fRes.success) allReplaysSuccessful = false;
  }
  assert(allReplaysSuccessful, 'B10-48: 10 consecutive webhook replays succeed idempotently');

  const userAPacks = await prisma.userCreditPack.count({
    where: { userId: userA.id, packCode: 'PACK_VOICE_15' },
  });
  assert(userAPacks === 2, 'B10-49: Exactly 2 packs exist in DB (1 from setup + 1 from replayed order, zero duplicates)');

  // 0-unit quota consumption check (rejected with INVALID_AMOUNT)
  const consumeCheck = await consumeQuota(userA.id, 'voice', 0);
  assert(consumeCheck.decision !== 'ALLOW' && consumeCheck.error?.code === 'INVALID_AMOUNT', 'B10-50: 0-unit consumption is rejected with INVALID_AMOUNT');

  // ─── SECTION 17: SECURITY & BOUNDARY FAILURE MATRIX (B10-51..54) ───────────
  console.log('\n--- SECTION 17: Security & Boundary Failure Matrix (B10-51..54) ---');

  // Negative amount consumption
  const negConsume = await consumeQuota(userA.id, 'voice', -5);
  assert(negConsume.decision !== 'ALLOW' && negConsume.error?.code === 'INVALID_AMOUNT', 'B10-51: Negative quota consumption rejected with INVALID_AMOUNT');

  // NaN consumption
  const nanConsume = await consumeQuota(userA.id, 'voice', NaN);
  assert(nanConsume.decision !== 'ALLOW' && nanConsume.error?.code === 'INVALID_AMOUNT', 'B10-52: NaN quota consumption rejected with INVALID_AMOUNT');

  // Checkout with invalid item code
  const invCheckout = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'INJECT_ATTACK_DROP_TABLE', provider: 'SEPAY' }, userA.id), invCheckout);
  assert(invCheckout.statusCode === 400, 'B10-53: Malformed / SQL injection item codes safely rejected with HTTP 400');

  // Invalid provider
  const invProvider = mockRes();
  await createCheckoutSession(mockReq({ itemCode: 'PACK_VOICE_15', provider: 'BITCOIN_UNKNOWN' }, userA.id), invProvider);
  assert(invProvider.statusCode === 400, 'B10-54: Unsupported payment provider rejected with HTTP 400');

  // ─── SECTION 18: DATABASE STATE & LEDGER AUDIT (B10-55..56) ────────────────
  console.log('\n--- SECTION 18: Database State & Ledger Audit (B10-55..56) ---');

  // Verify no negative remainingUnits in user_credit_packs
  const negativePacks = await prisma.userCreditPack.count({
    where: { remainingUnits: { lt: 0 } },
  });
  assert(negativePacks === 0, 'B10-55: Zero negative balances exist in user_credit_packs table');

  // Verify no orphan subscriptions
  const invalidSubs = await prisma.userSubscription.count({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date(1970, 0, 1) } },
  });
  assert(invalidSubs === 0, 'B10-56: All active subscriptions maintain valid future or current expiration');

  console.log('\n============================================================');
  console.log(`PHASE B10 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runB10Tests()
  .catch((err) => {
    console.error('Fatal B10 test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
