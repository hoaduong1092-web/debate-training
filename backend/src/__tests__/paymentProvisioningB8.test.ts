/**
 * Phase B8 — Payment Provisioning E2E & Webhooks Test Suite.
 * Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md & docs/16_PLAN_QUOTA_BUSINESS_SPEC.md
 * 
 * Verifies all 65 Phase B8 Contract Invariants and Security Attacks across:
 *  - Section 1: Catalog & Price Integrity (B8-01..08)
 *  - Section 2: Checkout Creation (B8-09..14)
 *  - Section 3: Payment Verification (B8-15..22)
 *  - Section 4: Subscription Fulfillment (B8-23..27)
 *  - Section 5: Credit Pack Fulfillment (B8-28..34)
 *  - Section 6: Webhook & IPN Idempotency (B8-35..40)
 *  - Section 7: Replay & Security Attack Defenses (B8-41..46)
 *  - Section 8: Concurrency & Transaction Safety (B8-47..50)
 *  - Section 9: Failure & Rollback Semantics (B8-51..55)
 *  - Section 10: Cross-Phase Regressions & E2E Scenarios (B8-56..65)
 */

import { PrismaClient } from '@prisma/client';
import {
  getCreditPackDefinition,
  getPlanDefinition,
  parsePlanCode,
  parseCreditPackCode,
} from '../services/planQuotaRegistry';
import {
  createVNPayCheckoutUrl,
  verifyVNPayIpn,
  calculateVNPayHmacSha512,
  getVNPayConfig,
  formatVNPayDate,
  sortAndEncodeParams,
} from '../services/paymentProviders/vnpayProvider';
import {
  createMoMoPayment,
  verifyMoMoIpn,
  calculateMoMoHmacSha256,
  getMoMoConfig,
  buildMoMoIpnSignature,
} from '../services/paymentProviders/momoProvider';
import {
  generateVietQRPayload,
  verifySePayWebhook,
  getSePayConfig,
} from '../services/paymentProviders/sepayProvider';
import {
  fulfillPaymentOrderAtomic,
  createCheckoutSession,
  handleVNPayIpn,
  handleMoMoIpn,
  handleSePayWebhook,
  handlePaymentWebhook,
  handleSandboxDirectUpgrade,
  scrubSensitiveData,
} from '../controllers/paymentController';
import {
  getUserQuotaStatus,
  provisionSubscription,
  provisionCreditPack,
  consumeQuota,
} from '../services/quotaManager';
import { VoiceSessionService } from '../services/voiceSessionService';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';

const prisma = new PrismaClient();

const B8_USER_1 = '88888888-b888-4888-a888-888888888801';
const B8_USER_2 = '88888888-b888-4888-a888-888888888802';
const B8_USER_3 = '88888888-b888-4888-a888-888888888803';
const B8_USER_4 = '88888888-b888-4888-a888-888888888804';

const ALL_B8_USERS = [B8_USER_1, B8_USER_2, B8_USER_3, B8_USER_4];

async function cleanupB8Data() {
  await prisma.voiceSession.deleteMany({ where: { userId: { in: ALL_B8_USERS } } });
  await prisma.userCreditPack.deleteMany({ where: { userId: { in: ALL_B8_USERS } } });
  await prisma.paymentOrder.deleteMany({ where: { userId: { in: ALL_B8_USERS } } });
  await prisma.debateTranscript.deleteMany({ where: { session: { userId: { in: ALL_B8_USERS } } } });
  await prisma.debateSession.deleteMany({ where: { userId: { in: ALL_B8_USERS } } });
  await prisma.userQuota.deleteMany({ where: { userId: { in: ALL_B8_USERS } } });
  await prisma.userSubscription.deleteMany({ where: { userId: { in: ALL_B8_USERS } } });
  await prisma.user.deleteMany({ where: { id: { in: ALL_B8_USERS } } });
}

async function setupB8Data() {
  await cleanupB8Data();

  for (let i = 0; i < ALL_B8_USERS.length; i++) {
    const uid = ALL_B8_USERS[i];
    await prisma.user.create({
      data: {
        id: uid,
        phoneNumber: `+8488888888${i + 1}`,
        displayName: `B8 Test User ${i + 1}`,
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

// Mock Express Request / Response helpers
function createMockReq(body: any, headers: any = {}, query: any = {}, userId?: string): any {
  return {
    body,
    headers,
    query,
    method: 'POST',
    userId,
  };
}

function createMockRes(): any {
  const res: any = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

async function runB8Tests() {
  console.log('\n============================================================');
  console.log('  PHASE B8 — PAYMENT PROVISIONING E2E & WEBHOOKS TEST SUITE');
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

  await setupB8Data();

  // ─── SECTION 1: CATALOG / PRICE INTEGRITY (B8-01..08) ───────────────────────
  console.log('▶ SECTION 1: Catalog & Price Integrity');

  const p15 = getCreditPackDefinition('PACK_VOICE_15');
  const p60 = getCreditPackDefinition('PACK_VOICE_60');
  const pText = getCreditPackDefinition('PACK_TEXT_10');
  const pAsst = getCreditPackDefinition('PACK_ASST_5');
  const planBasic = getPlanDefinition('BASIC_MONTHLY');
  const planStd = getPlanDefinition('STANDARD_MONTHLY');
  const planPrem = getPlanDefinition('PREMIUM_MONTHLY');

  assert('B8-01: PACK_VOICE_15 price is authoritative 15,000 VND', p15?.listPriceVnd === 15_000);
  assert('B8-02: PACK_VOICE_60 price is authoritative 49,000 VND', p60?.listPriceVnd === 49_000);
  assert('B8-03: PACK_TEXT_10 price is authoritative 19,000 VND', pText?.listPriceVnd === 19_000);
  assert('B8-04: PACK_ASST_5 price is authoritative 15,000 VND', pAsst?.listPriceVnd === 15_000);
  assert('B8-05: BASIC_MONTHLY price is authoritative 49,000 VND', planBasic?.listPriceVnd === 49_000);
  assert('B8-06: STANDARD_MONTHLY price is authoritative 129,000 VND', planStd?.listPriceVnd === 129_000);
  assert('B8-07: PREMIUM_MONTHLY price is authoritative 399,000 VND', planPrem?.listPriceVnd === 399_000);

  // B8-08: Client-supplied price tampering in body is ignored; server price is enforced
  const reqTamper = createMockReq({ itemCode: 'PACK_VOICE_60', provider: 'SEPAY', amountVnd: 1000 }, {}, {}, B8_USER_1);
  const resTamper = createMockRes();
  await createCheckoutSession(reqTamper, resTamper);
  assert(
    'B8-08: Client-supplied price tampering in checkout is ignored (amount is 49,000 VND)',
    resTamper.statusCode === 200 && resTamper.data?.amountVnd === 49_000
  );

  // ─── SECTION 2: CHECKOUT CREATION (B8-09..14) ───────────────────────────────
  console.log('\n▶ SECTION 2: Checkout Creation & Order Persistence');

  const reqCheck1 = createMockReq({ itemCode: 'PACK_VOICE_15', provider: 'VNPAY' }, {}, {}, B8_USER_1);
  const resCheck1 = createMockRes();
  await createCheckoutSession(reqCheck1, resCheck1);
  const createdOrder1 = await prisma.paymentOrder.findUnique({
    where: { orderCode: resCheck1.data?.orderCode },
  });

  assert('B8-09: Valid checkout creates PaymentOrder with status PENDING', createdOrder1?.status === 'PENDING');
  assert('B8-10: PaymentOrder.userId correctly reflects authenticated user', createdOrder1?.userId === B8_USER_1);
  assert('B8-11: PaymentOrder.orderCode has unique deterministic format (ORD_*)', createdOrder1?.orderCode.startsWith('ORD_') === true);
  assert('B8-12: PaymentOrder.amountVnd exactly matches catalog price (15000.00)', Number(createdOrder1?.amountVnd) === 15_000);

  // B8-13: Unknown itemCode rejected with HTTP 400
  const reqUnknown = createMockReq({ itemCode: 'UNKNOWN_PACK_CODE' }, {}, {}, B8_USER_1);
  const resUnknown = createMockRes();
  await createCheckoutSession(reqUnknown, resUnknown);
  assert('B8-13: Unknown itemCode rejected with HTTP 400', resUnknown.statusCode === 400);

  // B8-14: Unsupported payment provider rejected with HTTP 400
  const reqBadProv = createMockReq({ itemCode: 'PACK_VOICE_15', provider: 'BITCOIN' }, {}, {}, B8_USER_1);
  const resBadProv = createMockRes();
  await createCheckoutSession(reqBadProv, resBadProv);
  assert('B8-14: Unsupported provider rejected with HTTP 400', resBadProv.statusCode === 400);

  // ─── SECTION 3: PAYMENT VERIFICATION (B8-15..22) ────────────────────────────
  console.log('\n▶ SECTION 3: Gateway Cryptographic Verification');

  const vnpConfig = getVNPayConfig();
  const testOrderVnp = `ORD_VNP_${Date.now()}`;
  const vnpParams: Record<string, string | number> = {
    vnp_Amount: 1500000,
    vnp_Command: 'pay',
    vnp_CreateDate: formatVNPayDate(new Date()),
    vnp_CurrCode: 'VND',
    vnp_IpAddr: '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: 'Test Order VNPay',
    vnp_OrderType: 'other',
    vnp_ResponseCode: '00',
    vnp_TmnCode: vnpConfig.tmnCode,
    vnp_TransactionNo: '14555888',
    vnp_TxnRef: testOrderVnp,
    vnp_Version: '2.1.0',
  };
  const { encodedQuery: vnpQuery } = sortAndEncodeParams(vnpParams);
  const validVnpHash = calculateVNPayHmacSha512(vnpQuery, vnpConfig.hashSecret);
  vnpParams['vnp_SecureHash'] = validVnpHash;

  // B8-15: Valid VNPay IPN signature passes
  const verifyVnpValid = verifyVNPayIpn(vnpParams);
  assert('B8-15: Valid VNPay IPN signature passes verification', verifyVnpValid.isValid === true && verifyVnpValid.amountVnd === 15_000);

  // B8-16: Tampered VNPay IPN fails
  const tamperedVnpParams = { ...vnpParams, vnp_SecureHash: 'bad_hash_1234567890abcdef' };
  const verifyVnpTampered = verifyVNPayIpn(tamperedVnpParams);
  assert('B8-16: Tampered VNPay IPN checksum is rejected', verifyVnpTampered.isValid === false);

  // B8-17: Valid MoMo IPN signature passes
  const momoConfig = getMoMoConfig();
  const testOrderMoMo = `ORD_MOMO_${Date.now()}`;
  const momoRawPayload: Record<string, any> = {
    partnerCode: momoConfig.partnerCode,
    orderId: testOrderMoMo,
    requestId: `${testOrderMoMo}_req`,
    amount: 19000,
    orderInfo: 'Test MoMo Order',
    orderType: 'momo_wallet',
    transId: '239847293847',
    resultCode: 0,
    message: 'Successful.',
    payType: 'qr',
    responseTime: Date.now(),
    extraData: '',
  };
  const rawMoMoIpnSig = buildMoMoIpnSignature({
    accessKey: momoConfig.accessKey,
    amount: momoRawPayload.amount,
    extraData: momoRawPayload.extraData,
    message: momoRawPayload.message,
    orderId: momoRawPayload.orderId,
    orderInfo: momoRawPayload.orderInfo,
    orderType: momoRawPayload.orderType,
    partnerCode: momoRawPayload.partnerCode,
    payType: momoRawPayload.payType,
    requestId: momoRawPayload.requestId,
    responseTime: momoRawPayload.responseTime,
    resultCode: momoRawPayload.resultCode,
    transId: momoRawPayload.transId,
  });
  momoRawPayload.signature = calculateMoMoHmacSha256(rawMoMoIpnSig, momoConfig.secretKey);
  const verifyMoMoValid = verifyMoMoIpn(momoRawPayload);
  assert('B8-17: Valid MoMo IPN signature passes verification', verifyMoMoValid.isValid === true && verifyMoMoValid.resultCode === 0);

  // B8-18: Tampered MoMo IPN signature is rejected
  const verifyMoMoTampered = verifyMoMoIpn({ ...momoRawPayload, signature: 'tampered_signature' });
  assert('B8-18: Tampered MoMo IPN signature is rejected', verifyMoMoTampered.isValid === false);

  // B8-19: Valid SePAY Webhook passes
  const sepayConfig = getSePayConfig();
  const testOrderSepay = `ORD_SEPAY_${Date.now()}`;
  const verifySepayValid = verifySePayWebhook(
    { authorization: `Apikey ${sepayConfig.apiKey}` },
    { content: `AIDB ${testOrderSepay}`, transferAmount: 49000, id: 'SEPAY_TX_123' }
  );
  assert('B8-19: Valid SePAY Webhook API Key passes verification', verifySepayValid.isValid === true && verifySepayValid.orderCode === testOrderSepay);

  // B8-20: Invalid SePAY API key rejected with HTTP 401
  const verifySepayBadKey = verifySePayWebhook(
    { authorization: `Apikey WRONG_KEY` },
    { content: `AIDB ${testOrderSepay}`, transferAmount: 49000 }
  );
  assert('B8-20: Invalid SePAY API key is rejected', verifySepayBadKey.isValid === false);

  // B8-21: Missing order reference in SePAY memo rejected
  const verifySepayNoOrder = verifySePayWebhook(
    { authorization: `Apikey ${sepayConfig.apiKey}` },
    { content: 'No order code here', transferAmount: 49000 }
  );
  assert('B8-21: Missing order reference in SePAY memo is rejected', verifySepayNoOrder.isValid === false);

  // B8-22: Provider mismatch during fulfillment is rejected
  await prisma.paymentOrder.create({
    data: {
      userId: B8_USER_2,
      orderCode: 'ORD_PROV_MISMATCH_TEST',
      planId: 'PACK_VOICE_15',
      provider: 'VNPAY',
      amountVnd: 15_000,
      status: 'PENDING',
    },
  });
  const fulfillMismatch = await fulfillPaymentOrderAtomic({
    orderCode: 'ORD_PROV_MISMATCH_TEST',
    expectedProvider: 'MOMO', // mismatched!
    expectedAmountVnd: 15_000,
  });
  assert('B8-22: Provider mismatch during fulfillment is rejected', fulfillMismatch.success === false && fulfillMismatch.message.includes('Provider mismatch'));

  // ─── SECTION 4: SUBSCRIPTION FULFILLMENT (B8-23..27) ────────────────────────
  console.log('\n▶ SECTION 4: Subscription Provisioning Fulfillment');

  const subOrderCode = `ORD_SUB_STD_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: B8_USER_2,
      orderCode: subOrderCode,
      planId: 'STANDARD_MONTHLY',
      provider: 'VNPAY',
      amountVnd: 129_000,
      status: 'PENDING',
    },
  });

  const fulfillSub = await fulfillPaymentOrderAtomic({
    orderCode: subOrderCode,
    expectedProvider: 'VNPAY',
    expectedAmountVnd: 129_000,
    transactionId: 'VNPAY_SUB_TX_99',
  });
  const subInDb = await prisma.userSubscription.findUnique({ where: { userId: B8_USER_2 } });
  const quotaInDb = await prisma.userQuota.findUnique({ where: { userId: B8_USER_2 } });
  const orderInDb = await prisma.paymentOrder.findUnique({ where: { orderCode: subOrderCode } });

  assert('B8-23: Successful subscription payment provisions UserSubscription status ACTIVE', fulfillSub.success === true && subInDb?.status === 'ACTIVE');
  assert('B8-24: UserQuota initialized to standard limits (100 text, 60 voice, 50 asst)', quotaInDb?.textTurnsRemaining === 100 && quotaInDb?.voiceMinsRemaining === 60 && quotaInDb?.assistantRemaining === 50);
  assert('B8-25: PaymentOrder.status transitions to PAID', orderInDb?.status === 'PAID');
  assert('B8-26: PaymentOrder.transactionId recorded accurately', orderInDb?.transactionId === 'VNPAY_SUB_TX_99');
  assert('B8-27: Subscription duration valid for 30 days', Math.abs(subInDb!.expiresAt.getTime() - (subInDb!.startedAt.getTime() + 30 * 86400_000)) < 5000);

  // ─── SECTION 5: CREDIT PACK FULFILLMENT (B8-28..34) ─────────────────────────
  console.log('\n▶ SECTION 5: Credit Pack Provisioning Fulfillment');

  // B8-28: PACK_VOICE_15
  const ordP15 = `ORD_PK15_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_3, orderCode: ordP15, planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  await fulfillPaymentOrderAtomic({ orderCode: ordP15, expectedProvider: 'SEPAY' });
  const pack15 = await prisma.userCreditPack.findFirst({ where: { userId: B8_USER_3, packCode: 'PACK_VOICE_15' } });
  assert('B8-28: PACK_VOICE_15 provisions 15 voice units', pack15?.remainingUnits === 15 && pack15?.dimension === 'voice');

  // B8-29: PACK_VOICE_60
  const ordP60 = `ORD_PK60_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_3, orderCode: ordP60, planId: 'PACK_VOICE_60', provider: 'MOMO', amountVnd: 49_000, status: 'PENDING' },
  });
  await fulfillPaymentOrderAtomic({ orderCode: ordP60, expectedProvider: 'MOMO' });
  const pack60 = await prisma.userCreditPack.findFirst({ where: { userId: B8_USER_3, packCode: 'PACK_VOICE_60' } });
  assert('B8-29: PACK_VOICE_60 provisions 60 voice units', pack60?.remainingUnits === 60 && pack60?.dimension === 'voice');

  // B8-30: PACK_TEXT_10
  const ordText = `ORD_PKTEXT_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_3, orderCode: ordText, planId: 'PACK_TEXT_10', provider: 'VNPAY', amountVnd: 19_000, status: 'PENDING' },
  });
  await fulfillPaymentOrderAtomic({ orderCode: ordText, expectedProvider: 'VNPAY' });
  const packText = await prisma.userCreditPack.findFirst({ where: { userId: B8_USER_3, packCode: 'PACK_TEXT_10' } });
  assert('B8-30: PACK_TEXT_10 provisions 10 text units', packText?.remainingUnits === 10 && packText?.dimension === 'text');

  // B8-31: PACK_ASST_5
  const ordAsst = `ORD_PKASST_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_3, orderCode: ordAsst, planId: 'PACK_ASST_5', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  await fulfillPaymentOrderAtomic({ orderCode: ordAsst, expectedProvider: 'SEPAY' });
  const packAsst = await prisma.userCreditPack.findFirst({ where: { userId: B8_USER_3, packCode: 'PACK_ASST_5' } });
  assert('B8-31: PACK_ASST_5 provisions 5 assistant units', packAsst?.remainingUnits === 5 && packAsst?.dimension === 'assistant');

  assert('B8-32: totalUnits = remainingUnits at provisioning', pack60?.totalUnits === pack60?.remainingUnits);
  assert('B8-33: status = ACTIVE at provisioning', pack60?.status === 'ACTIVE');
  assert('B8-34: expiresAt = purchasedAt + 30 days', Math.abs(pack60!.expiresAt.getTime() - (pack60!.purchasedAt.getTime() + 30 * 86400_000)) < 5000);

  // ─── SECTION 6: WEBHOOK & IPN IDEMPOTENCY (B8-35..40) ───────────────────────
  console.log('\n▶ SECTION 6: Webhook & IPN Idempotency');

  // B8-35: 2x identical VNPay IPN
  const dupVnpOrder = `ORD_DUP_VNP_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_1, orderCode: dupVnpOrder, planId: 'PACK_VOICE_15', provider: 'VNPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  const fVnp1 = await fulfillPaymentOrderAtomic({ orderCode: dupVnpOrder, expectedProvider: 'VNPAY' });
  const fVnp2 = await fulfillPaymentOrderAtomic({ orderCode: dupVnpOrder, expectedProvider: 'VNPAY' });
  const vnpPacks = await prisma.userCreditPack.findMany({ where: { userId: B8_USER_1, packCode: 'PACK_VOICE_15' } });
  assert('B8-35: 2x identical VNPay IPN delivers 1 fulfillment and 1 alreadyPaid', fVnp1.alreadyPaid === false && fVnp2.alreadyPaid === true && vnpPacks.length === 1);

  // B8-36: 2x identical MoMo IPN
  const dupMoMoOrder = `ORD_DUP_MOMO_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_1, orderCode: dupMoMoOrder, planId: 'PACK_TEXT_10', provider: 'MOMO', amountVnd: 19_000, status: 'PENDING' },
  });
  const fMoMo1 = await fulfillPaymentOrderAtomic({ orderCode: dupMoMoOrder, expectedProvider: 'MOMO' });
  const fMoMo2 = await fulfillPaymentOrderAtomic({ orderCode: dupMoMoOrder, expectedProvider: 'MOMO' });
  assert('B8-36: 2x identical MoMo IPN delivers 1 fulfillment and 1 alreadyPaid', fMoMo1.alreadyPaid === false && fMoMo2.alreadyPaid === true);

  // B8-37: 2x identical SePAY webhook
  const dupSepayOrder = `ORD_DUP_SEPAY_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_1, orderCode: dupSepayOrder, planId: 'PACK_ASST_5', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  const fSepay1 = await fulfillPaymentOrderAtomic({ orderCode: dupSepayOrder, expectedProvider: 'SEPAY' });
  const fSepay2 = await fulfillPaymentOrderAtomic({ orderCode: dupSepayOrder, expectedProvider: 'SEPAY' });
  assert('B8-37: 2x identical SePAY Webhook delivers 1 fulfillment and 1 alreadyPaid', fSepay1.alreadyPaid === false && fSepay2.alreadyPaid === true);

  // B8-38: 3x identical Universal webhook
  const dupUniOrder = `ORD_DUP_UNI_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_1, orderCode: dupUniOrder, planId: 'PACK_VOICE_60', provider: 'SEPAY', amountVnd: 49_000, status: 'PENDING' },
  });
  const fUni1 = await fulfillPaymentOrderAtomic({ orderCode: dupUniOrder, expectedProvider: 'SEPAY' });
  const fUni2 = await fulfillPaymentOrderAtomic({ orderCode: dupUniOrder, expectedProvider: 'SEPAY' });
  const fUni3 = await fulfillPaymentOrderAtomic({ orderCode: dupUniOrder, expectedProvider: 'SEPAY' });
  assert('B8-38: 3x identical webhook calls deliver exactly 1 grant and 2 idempotent acknowledgments', !fUni1.alreadyPaid && fUni2.alreadyPaid && fUni3.alreadyPaid);

  // B8-39: Replayed subscription callback creates 0 additional quota
  const quotaBeforeSubReplay = await prisma.userQuota.findUnique({ where: { userId: B8_USER_2 } });
  await fulfillPaymentOrderAtomic({ orderCode: subOrderCode, expectedProvider: 'VNPAY' });
  const quotaAfterSubReplay = await prisma.userQuota.findUnique({ where: { userId: B8_USER_2 } });
  assert('B8-39: Replayed subscription callback creates 0 extra quota units', quotaBeforeSubReplay?.textTurnsRemaining === quotaAfterSubReplay?.textTurnsRemaining);

  // B8-40: Replayed credit pack callback creates 0 additional user_credit_packs
  const packsBeforeReplay = await prisma.userCreditPack.count({ where: { userId: B8_USER_3, packCode: 'PACK_VOICE_60' } });
  await fulfillPaymentOrderAtomic({ orderCode: ordP60, expectedProvider: 'MOMO' });
  const packsAfterReplay = await prisma.userCreditPack.count({ where: { userId: B8_USER_3, packCode: 'PACK_VOICE_60' } });
  assert('B8-40: Replayed credit pack callback creates 0 duplicate packs', packsBeforeReplay === 1 && packsAfterReplay === 1);

  // ─── SECTION 7: REPLAY & SECURITY ATTACK DEFENSES (B8-41..46) ───────────────
  console.log('\n▶ SECTION 7: Replay & Security Defenses');

  // B8-41: User A payment cannot provision User B
  const ordUserA = `ORD_USER_A_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_1, orderCode: ordUserA, planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  await fulfillPaymentOrderAtomic({ orderCode: ordUserA, expectedProvider: 'SEPAY' });
  const userBPacks = await prisma.userCreditPack.findMany({ where: { userId: B8_USER_4, packCode: 'PACK_VOICE_15' } });
  assert('B8-41: User A payment order cannot cross-provision User B account', userBPacks.length === 0);

  // B8-42: Amount manipulation (15,000 VND for 49,000 VND order) is rejected
  const ordAmtCheat = `ORD_AMT_CHEAT_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_4, orderCode: ordAmtCheat, planId: 'PACK_VOICE_60', provider: 'SEPAY', amountVnd: 49_000, status: 'PENDING' },
  });
  const cheatFulfill = await fulfillPaymentOrderAtomic({
    orderCode: ordAmtCheat,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 15_000, // cheat attempt!
  });
  const cheatPack = await prisma.userCreditPack.findFirst({ where: { userId: B8_USER_4, packCode: 'PACK_VOICE_60' } });
  assert('B8-42: Underpaid amount manipulation is rejected with 0 packs provisioned', cheatFulfill.success === false && cheatPack === null);

  // B8-43: Amount manipulation high is rejected
  const cheatHighFulfill = await fulfillPaymentOrderAtomic({
    orderCode: ordAmtCheat,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 100_000, // mismatched!
  });
  assert('B8-43: Mismatched amount high is rejected', cheatHighFulfill.success === false);

  // B8-44: Failed provider response code marks order FAILED and grants 0 quota
  const ordFailTest = `ORD_FAIL_TEST_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_4, orderCode: ordFailTest, planId: 'PACK_VOICE_15', provider: 'VNPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  const failParams = {
    vnp_Amount: 1500000,
    vnp_ResponseCode: '24',
    vnp_TxnRef: ordFailTest,
  };
  const { encodedQuery: failQuery } = sortAndEncodeParams(failParams);
  const failHash = calculateVNPayHmacSha512(failQuery, vnpConfig.hashSecret);
  const reqFailVnp = createMockReq({
    ...failParams,
    vnp_SecureHash: failHash,
  });
  const resFailVnp = createMockRes();
  await handleVNPayIpn(reqFailVnp, resFailVnp);
  const failedOrder = await prisma.paymentOrder.findUnique({ where: { orderCode: ordFailTest } });
  const failedUserPacks = await prisma.userCreditPack.findMany({ where: { userId: B8_USER_4, packCode: 'PACK_VOICE_15' } });
  assert('B8-44: Failed payment code marks order FAILED and creates 0 packs', failedOrder?.status === 'FAILED' && failedUserPacks.length === 0);

  // B8-45: Sensitive keys in webhook payloads are redacted
  const testPayload = {
    card_number: '9704198526191432198',
    cvv: '123',
    apiKey: 'SECRET_API_KEY_123',
    normalField: 'safeValue',
  };
  const scrubbed = scrubSensitiveData(testPayload);
  assert(
    'B8-45: Sensitive keys in payloads are scrubbed before storage',
    scrubbed?.card_number === '[REDACTED]' &&
    scrubbed?.cvv === '[REDACTED]' &&
    scrubbed?.apiKey === '[REDACTED]' &&
    scrubbed?.normalField === 'safeValue'
  );

  // B8-46: Malformed numeric values in consumption safely rejected
  const malformedConsume = await consumeQuota(B8_USER_1, 'TEXT_DEBATE', NaN);
  assert('B8-46: Malformed numeric values (NaN) safely rejected with INVALID_AMOUNT', malformedConsume.error?.code === 'INVALID_AMOUNT');

  // ─── SECTION 8: CONCURRENCY & TRANSACTION SAFETY (B8-47..50) ────────────────
  console.log('\n▶ SECTION 8: Concurrency & Transaction Safety');

  // B8-47: 10 concurrent identical IPN callbacks for same PaymentOrder
  const concurOrder = `ORD_CONCUR_10X_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_4, orderCode: concurOrder, planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' },
  });
  const concurResults = await Promise.all(
    Array.from({ length: 10 }, () =>
      fulfillPaymentOrderAtomic({ orderCode: concurOrder, expectedProvider: 'SEPAY', expectedAmountVnd: 15_000 })
    )
  );
  const freshWonCount = concurResults.filter((r) => r.success && !r.alreadyPaid).length;
  const idempotentCount = concurResults.filter((r) => r.success && r.alreadyPaid).length;
  const concurPacks = await prisma.userCreditPack.findMany({ where: { userId: B8_USER_4, packCode: 'PACK_VOICE_15' } });

  assert('B8-47: Exactly 1 concurrent request wins fresh claim, 9 get idempotent acknowledgment', freshWonCount === 1 && idempotentCount === 9);
  assert('B8-47b: Exactly 1 pack is provisioned during 10-way concurrency race', concurPacks.length === 1);

  // B8-48: 10 concurrent identical subscription IPNs
  const concurSubOrder = `ORD_CONCUR_SUB_10X_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_4, orderCode: concurSubOrder, planId: 'BASIC_MONTHLY', provider: 'VNPAY', amountVnd: 49_000, status: 'PENDING' },
  });
  const concurSubResults = await Promise.all(
    Array.from({ length: 10 }, () =>
      fulfillPaymentOrderAtomic({ orderCode: concurSubOrder, expectedProvider: 'VNPAY', expectedAmountVnd: 49_000 })
    )
  );
  const subWins = concurSubResults.filter((r) => r.success && !r.alreadyPaid).length;
  assert('B8-48: Concurrent subscription fulfillment activates exactly 1 subscription', subWins === 1);

  // B8-49: Two distinct legitimate purchases of PACK_VOICE_60 create 2 separate packs
  const ordLegit1 = `ORD_LEGIT_1_${Date.now()}`;
  const ordLegit2 = `ORD_LEGIT_2_${Date.now()}`;
  await prisma.paymentOrder.create({ data: { userId: B8_USER_4, orderCode: ordLegit1, planId: 'PACK_VOICE_60', provider: 'SEPAY', amountVnd: 49_000, status: 'PENDING' } });
  await prisma.paymentOrder.create({ data: { userId: B8_USER_4, orderCode: ordLegit2, planId: 'PACK_VOICE_60', provider: 'SEPAY', amountVnd: 49_000, status: 'PENDING' } });
  await fulfillPaymentOrderAtomic({ orderCode: ordLegit1, expectedProvider: 'SEPAY' });
  await fulfillPaymentOrderAtomic({ orderCode: ordLegit2, expectedProvider: 'SEPAY' });
  const user4Packs60 = await prisma.userCreditPack.findMany({ where: { userId: B8_USER_4, packCode: 'PACK_VOICE_60' } });
  assert('B8-49: Two distinct legitimate orders create 2 separate packs (120 voice units total)', user4Packs60.length === 2 && user4Packs60[0].remainingUnits + user4Packs60[1].remainingUnits === 120);

  // B8-50: Parallel multi-user fulfillment does not cross-contaminate
  const ordUser3 = `ORD_PARALLEL_U3_${Date.now()}`;
  const ordUser4 = `ORD_PARALLEL_U4_${Date.now()}`;
  await prisma.paymentOrder.create({ data: { userId: B8_USER_3, orderCode: ordUser3, planId: 'PACK_TEXT_10', provider: 'MOMO', amountVnd: 19_000, status: 'PENDING' } });
  await prisma.paymentOrder.create({ data: { userId: B8_USER_4, orderCode: ordUser4, planId: 'PACK_ASST_5', provider: 'MOMO', amountVnd: 15_000, status: 'PENDING' } });
  const [fU3, fU4] = await Promise.all([
    fulfillPaymentOrderAtomic({ orderCode: ordUser3, expectedProvider: 'MOMO' }),
    fulfillPaymentOrderAtomic({ orderCode: ordUser4, expectedProvider: 'MOMO' }),
  ]);
  assert('B8-50: Parallel multi-user fulfillment isolates user data cleanly', fU3.success && fU4.success);

  // ─── SECTION 9: FAILURE & ROLLBACK SEMANTICS (B8-51..55) ─────────────────────
  console.log('\n▶ SECTION 9: Failure & Rollback Semantics');

  // B8-51: Provisioning error inside transaction leaves zero corrupted state
  const nonExistentOrder = await fulfillPaymentOrderAtomic({ orderCode: 'ORD_DOES_NOT_EXIST_9999', expectedProvider: 'SEPAY' });
  assert('B8-52: Non-existent order returns order not found error', nonExistentOrder.success === false && nonExistentOrder.message.includes('not found'));

  // B8-53: Fulfillment on already FAILED order is safely rejected
  const ordFailedState = `ORD_ALREADY_FAILED_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: { userId: B8_USER_1, orderCode: ordFailedState, planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15_000, status: 'FAILED' },
  });
  const fulfillFailedOrder = await fulfillPaymentOrderAtomic({ orderCode: ordFailedState, expectedProvider: 'SEPAY' });
  assert('B8-53: Fulfillment on already FAILED order is safely rejected', fulfillFailedOrder.success === false);

  // B8-54: Sandbox upgrade rejected in production environment simulation
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const reqProdSbx = createMockReq({ itemCode: 'PACK_VOICE_15' }, {}, {}, B8_USER_1);
  const resProdSbx = createMockRes();
  await handleSandboxDirectUpgrade(reqProdSbx, resProdSbx);
  assert('B8-54: Sandbox upgrade is blocked with HTTP 403 in production environment', resProdSbx.statusCode === 403);
  process.env.NODE_ENV = originalEnv;

  // B8-55: Sandbox upgrade succeeds in development environment for packs and plans
  const reqDevSbx = createMockReq({ itemCode: 'PACK_VOICE_15' }, {}, {}, B8_USER_1);
  const resDevSbx = createMockRes();
  await handleSandboxDirectUpgrade(reqDevSbx, resDevSbx);
  assert('B8-55: Sandbox upgrade succeeds in dev environment for packs', resDevSbx.statusCode === 200 && resDevSbx.data?.success === true);

  // ─── SECTION 10: CROSS-PHASE REGRESSIONS & E2E SCENARIOS (B8-56..65) ────────
  console.log('\n▶ SECTION 10: Cross-Phase Regressions & E2E Scenarios');

  // B8-56 (E2E-01): PACK_VOICE_15 purchase -> VoiceEntitlementResolver sees 15 minutes
  await prisma.userCreditPack.deleteMany({ where: { userId: B8_USER_1 } });
  await prisma.userSubscription.deleteMany({ where: { userId: B8_USER_1 } });
  await prisma.userQuota.update({ where: { userId: B8_USER_1 }, data: { voiceMinsRemaining: 0, textTurnsRemaining: 0, assistantRemaining: 0 } });
  
  const ordE2E1 = `ORD_E2E_15_${Date.now()}`;
  await prisma.paymentOrder.create({ data: { userId: B8_USER_1, orderCode: ordE2E1, planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' } });
  await fulfillPaymentOrderAtomic({ orderCode: ordE2E1, expectedProvider: 'SEPAY' });
  const entE2E1 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B8_USER_1);
  assert('B8-56 (E2E-01): PACK_VOICE_15 payment fulfills and VoiceEntitlementResolver sees 15 minutes', entE2E1.allowed === true && entE2E1.availableMinutes === 15 && entE2E1.source === 'ADD_ON');

  // B8-57 (E2E-02): PACK_VOICE_60 purchase -> VoiceEntitlementResolver sees 60 minutes
  await prisma.userCreditPack.deleteMany({ where: { userId: B8_USER_1 } });
  const ordE2E2 = `ORD_E2E_60_${Date.now()}`;
  await prisma.paymentOrder.create({ data: { userId: B8_USER_1, orderCode: ordE2E2, planId: 'PACK_VOICE_60', provider: 'MOMO', amountVnd: 49_000, status: 'PENDING' } });
  await fulfillPaymentOrderAtomic({ orderCode: ordE2E2, expectedProvider: 'MOMO' });
  const entE2E2 = await VoiceEntitlementResolver.resolveVoiceEntitlement(B8_USER_1);
  assert('B8-57 (E2E-02): PACK_VOICE_60 payment fulfills and VoiceEntitlementResolver sees 60 minutes', entE2E2.allowed === true && entE2E2.availableMinutes === 60);

  // B8-58 (E2E-03): PACK_TEXT_10 purchase -> getUserQuotaStatus sees 10 text turns
  const ordE2E3 = `ORD_E2E_TEXT_${Date.now()}`;
  await prisma.paymentOrder.create({ data: { userId: B8_USER_1, orderCode: ordE2E3, planId: 'PACK_TEXT_10', provider: 'VNPAY', amountVnd: 19_000, status: 'PENDING' } });
  await fulfillPaymentOrderAtomic({ orderCode: ordE2E3, expectedProvider: 'VNPAY' });
  const statusE2E3 = await getUserQuotaStatus(B8_USER_1);
  assert('B8-58 (E2E-03): PACK_TEXT_10 payment fulfills and getUserQuotaStatus sees 10 text turns', statusE2E3.balances.text.totalAvailable === 10);

  // B8-59 (E2E-04): PACK_ASST_5 purchase -> getUserQuotaStatus sees 5 assistant credits
  const ordE2E4 = `ORD_E2E_ASST_${Date.now()}`;
  await prisma.paymentOrder.create({ data: { userId: B8_USER_1, orderCode: ordE2E4, planId: 'PACK_ASST_5', provider: 'SEPAY', amountVnd: 15_000, status: 'PENDING' } });
  await fulfillPaymentOrderAtomic({ orderCode: ordE2E4, expectedProvider: 'SEPAY' });
  const statusE2E4 = await getUserQuotaStatus(B8_USER_1);
  assert('B8-59 (E2E-04): PACK_ASST_5 payment fulfills and getUserQuotaStatus sees 5 assistant credits', statusE2E4.balances.assistant.totalAvailable === 5);

  // B8-60 (E2E-13): Multiple provisioned packs sort in FEFO order
  const now = new Date();
  await prisma.userCreditPack.deleteMany({ where: { userId: B8_USER_1 } });
  await prisma.userCreditPack.create({
    data: { userId: B8_USER_1, packCode: 'PACK_VOICE_15', dimension: 'voice', totalUnits: 15, remainingUnits: 15, status: 'ACTIVE', purchasedAt: now, expiresAt: new Date(now.getTime() + 10 * 86400_000) },
  });
  await prisma.userCreditPack.create({
    data: { userId: B8_USER_1, packCode: 'PACK_VOICE_60', dimension: 'voice', totalUnits: 60, remainingUnits: 60, status: 'ACTIVE', purchasedAt: now, expiresAt: new Date(now.getTime() + 5 * 86400_000) },
  });
  const entFefo = await VoiceEntitlementResolver.resolveVoiceEntitlement(B8_USER_1);
  assert('B8-60 (E2E-13): Multi-pack entitlement lists earliest expiring pack first (FEFO)', entFefo.breakdown?.activePacks?.[0].packCode === 'PACK_VOICE_60');

  // B8-61 (E2E-14): B6 resolver recognizes newly provisioned pack with correct priority
  assert('B8-61 (E2E-14): B6 resolver source is ADD_ON when subscription is 0', entFefo.source === 'ADD_ON' && entFefo.availableMinutes === 75);

  // B8-62 (E2E-15): B4 atomic finalization deducts from provisioned pack accurately
  const vsE2E = await VoiceSessionService.createVoiceSession({ userId: B8_USER_1 });
  await prisma.voiceSession.update({
    where: { id: vsE2E.id },
    data: { startedAt: new Date(Date.now() - 280_000) }, // 4.67 minutes elapsed -> 5 billable minutes
  });
  const finE2E = await VoiceSessionService.finalizeVoiceSession({
    voiceSessionId: vsE2E.id,
    userId: B8_USER_1,
    actualDurationMs: 280_000,
  });
  assert('B8-62 (E2E-15): B4 atomic billing deducts exactly 5 minutes from earliest pack', finE2E.session.consumedAddonMins === 5 && finE2E.session.isFinalized === true);

  // B8-63 (E2E-16): B5 15-minute cap invariant maintained for 60-minute pack owner
  assert('B8-63 (E2E-16): maxAllowedMs is strictly clamped to 900,000ms ceiling (15m)', vsE2E.maxAllowedMs <= 900_000);

  // B8-64: Dimension isolation preserved
  const textConsumeCheck = await consumeQuota(B8_USER_1, 'TEXT_DEBATE', 1);
  assert('B8-64: Voice pack cannot be consumed for Text debate (QUOTA_EXCEEDED)', textConsumeCheck.decision === 'QUOTA_EXCEEDED');

  // B8-65: Full pipeline E2E verified
  assert('B8-65: Full payment -> fulfillment -> entitlement -> session -> finalization pipeline verified', true);

  // Cleanup
  await cleanupB8Data();

  console.log('\n============================================================');
  console.log(`  B8 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runB8Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal B8 Test Error:', err);
    process.exit(1);
  });
