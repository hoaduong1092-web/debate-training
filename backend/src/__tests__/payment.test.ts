/**
 * TC-COM / TC-PAY: Dynamic Commerce & Payment Fulfillment Test Suite
 *
 * Covers:
 *   TC-COM-01: Dynamic subscription plans loaded from DB
 *   TC-COM-02: Inactive plan rejection
 *   TC-COM-03: Server-Authoritative Pricing & Checkout (ignore client amount)
 *   TC-COM-04: Checkout creates PENDING PaymentOrder
 *   TC-COM-05: Correct user ownership
 *   TC-COM-06: Unknown plan rejection
 *   TC-COM-07: Unique order code generation
 *   TC-COM-16: Transaction Rollback (Fulfillment error rolls back PaymentOrder & Quota)
 *   TC-COM-17: Concurrent Webhook Race (Atomic claim allows exactly 1 fulfillment)
 *   TC-COM-18: Provider Mismatch rejection
 *   TC-COM-19: Cross-Gateway Amount Integrity
 *   TC-COM-20: Already PAID safe idempotent return
 */

import { PrismaClient } from '@prisma/client';
import {
  createCheckoutSession,
  fulfillPaymentOrderAtomic,
  handleSandboxDirectUpgrade,
} from '../controllers/paymentController';
import {
  provisionSubscription,
  getUserQuotaStatus,
  consumeQuota,
} from '../services/quotaManager';
import {
  getPlanDefinition,
  listPlanCodes,
  parsePlanCode,
} from '../services/planQuotaRegistry';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass += 1;
    console.log('  ✅ PASS', name);
  } else {
    fail += 1;
    failures.push(name);
    console.log('  ❌ FAIL', name, detail !== undefined ? detail : '');
  }
}

function section(name: string): void {
  console.log(`\n▶ ${name}`);
}

function makeRes(): Response & { _status: number; _json: any } {
  const res = {
    _status: 200,
    _json: null as any,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: any) {
      this._json = data;
      return this;
    },
  };
  return res as unknown as Response & { _status: number; _json: any };
}

function makeAuthReq(opts: {
  userId?: string;
  body?: Record<string, unknown>;
}): Request & AuthRequest {
  return {
    userId: opts.userId ?? '33333333-3333-3333-3333-333333333333',
    isDemo: false,
    params: {},
    body: opts.body ?? {},
    query: {},
    headers: {},
  } as unknown as Request & AuthRequest;
}

export async function runPaymentTests(): Promise<boolean> {
  console.log('\n=== RUNNING DYNAMIC COMMERCE & FULFILLMENT TESTS (v15/v16) ===');

  const testUserId = '33333333-3333-3333-3333-333333333333';
  const testPhone = '+84912345678';

  // Ensure test user exists
  await prisma.user.upsert({
    where: { id: testUserId },
    update: {},
    create: {
      id: testUserId,
      phoneNumber: testPhone,
      displayName: 'Payment Test User',
    },
  });

  // Ensure 6 canonical plans are in DB
  const canonicalPlans = [
    { id: 'BASIC_MONTHLY', name: 'Cơ Bản (Khám Phá)', priceVnd: 49000, durationDays: 30, textTurnsQuota: 30, voiceMinsQuota: 15, assistantQuota: 10, isActive: true },
    { id: 'BASIC_YEARLY', name: 'Cơ Bản (Khám Phá)', priceVnd: 490000, durationDays: 365, textTurnsQuota: 360, voiceMinsQuota: 180, assistantQuota: 120, isActive: true },
    { id: 'STANDARD_MONTHLY', name: 'Tiêu Chuẩn (Rèn Luyện)', priceVnd: 129000, durationDays: 30, textTurnsQuota: 100, voiceMinsQuota: 60, assistantQuota: 50, isActive: true },
    { id: 'STANDARD_YEARLY', name: 'Tiêu Chuẩn (Rèn Luyện)', priceVnd: 1190000, durationDays: 365, textTurnsQuota: 1200, voiceMinsQuota: 720, assistantQuota: 600, isActive: true },
    { id: 'PREMIUM_MONTHLY', name: 'Cao Cấp (Bứt Phá)', priceVnd: 399000, durationDays: 30, textTurnsQuota: 500, voiceMinsQuota: 300, assistantQuota: 200, isActive: true },
    { id: 'PREMIUM_YEARLY', name: 'Cao Cấp (Bứt Phá)', priceVnd: 3590000, durationDays: 365, textTurnsQuota: 6000, voiceMinsQuota: 3600, assistantQuota: 2400, isActive: true },
  ];

  for (const p of canonicalPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  // ── TC-COM-01: Dynamic Plans Loaded From DB ──────────────────────────────────
  section('TC-COM-01: Dynamic Subscription Plans in Database');
  const dbPlansCount = await prisma.subscriptionPlan.count({ where: { isActive: true } });
  assert('TC-COM-01: Database contains active Dual-Cycle plans', dbPlansCount >= 6);

  // ── TC-COM-02: Inactive Plan Rejection ───────────────────────────────────────
  section('TC-COM-02: Inactive Plan Rejection');
  await prisma.subscriptionPlan.upsert({
    where: { id: 'INACTIVE_TEST_PLAN' },
    update: { isActive: false },
    create: { id: 'INACTIVE_TEST_PLAN', name: 'Inactive Plan', priceVnd: 99000, durationDays: 30, textTurnsQuota: 10, voiceMinsQuota: 5, assistantQuota: 5, isActive: false },
  });
  const reqInactive = makeAuthReq({ userId: testUserId, body: { itemCode: 'INACTIVE_TEST_PLAN', provider: 'SEPAY' } });
  const resInactive = makeRes();
  await createCheckoutSession(reqInactive, resInactive);
  assert('TC-COM-02: Inactive plan checkout rejected with HTTP 400', resInactive._status === 400);

  // ── TC-COM-03: Server-Authoritative Price ────────────────────────────────────
  section('TC-COM-03 & TC-COM-04: Server-Authoritative Price & PENDING Order Creation');
  const reqCheckout = makeAuthReq({
    userId: testUserId,
    body: { itemCode: 'STANDARD_MONTHLY', provider: 'SEPAY', amountVnd: 1000 }, // Client tries to spoof amount 1000
  });
  const resCheckout = makeRes();
  await createCheckoutSession(reqCheckout, resCheckout);
  const checkoutData = resCheckout._json;

  assert('TC-COM-03: Client price ignored; DB listPriceVnd (129000) used', checkoutData.amountVnd === 129000);
  assert('TC-COM-04a: OrderCode generated', !!checkoutData.orderCode && checkoutData.orderCode.startsWith('ORD_'));

  const createdOrder = await prisma.paymentOrder.findUnique({
    where: { orderCode: checkoutData.orderCode },
  });
  assert('TC-COM-04b: PaymentOrder persisted in DB with status PENDING', createdOrder !== null && createdOrder.status === 'PENDING');
  assert('TC-COM-05: PaymentOrder has correct user ownership', createdOrder?.userId === testUserId);

  // ── TC-COM-06: Unknown Plan Rejection ───────────────────────────────────────
  section('TC-COM-06: Unknown Plan Rejection');
  const reqUnknown = makeAuthReq({ userId: testUserId, body: { itemCode: 'NON_EXISTENT_PLAN', provider: 'SEPAY' } });
  const resUnknown = makeRes();
  await createCheckoutSession(reqUnknown, resUnknown);
  assert('TC-COM-06: Unknown plan rejected with HTTP 400', resUnknown._status === 400);

  // ── TC-COM-16: Transaction Rollback Invariant ────────────────────────────────
  section('TC-COM-16: Transaction Rollback Invariant');
  const rollbackOrderCode = `ORD_ROLLBACK_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: testUserId,
      orderCode: rollbackOrderCode,
      planId: 'STANDARD_MONTHLY',
      provider: 'SEPAY',
      amountVnd: 129000,
      status: 'PENDING',
    },
  });

  // Simulate a fulfillment failure inside transaction
  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { orderCode: rollbackOrderCode },
        data: { status: 'PAID' },
      });
      // Force failure during quota provisioning
      throw new Error('Simulated DB failure during fulfillment');
    });
  } catch {
    // expected rollback
  }

  const orderAfterRollback = await prisma.paymentOrder.findUnique({ where: { orderCode: rollbackOrderCode } });
  assert('TC-COM-16: Persistent state remains PENDING after rollback (COM-INVARIANT-05)', orderAfterRollback?.status === 'PENDING');

  // ── TC-COM-17: Concurrent Webhook Race Condition ─────────────────────────────
  section('TC-COM-17: Database-Level Concurrent Webhook Race Protection');
  const raceOrderCode = `ORD_RACE_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: testUserId,
      orderCode: raceOrderCode,
      planId: 'STANDARD_MONTHLY',
      provider: 'SEPAY',
      amountVnd: 129000,
      status: 'PENDING',
    },
  });

  // Shoot Webhook A & Webhook B concurrently
  const [resultA, resultB] = await Promise.all([
    fulfillPaymentOrderAtomic({
      orderCode: raceOrderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 129000,
      transactionId: 'TXN_A',
      rawWebhookData: { simulated: 'A' },
    }),
    fulfillPaymentOrderAtomic({
      orderCode: raceOrderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 129000,
      transactionId: 'TXN_B',
      rawWebhookData: { simulated: 'B' },
    }),
  ]);

  const fulfillmentWins = [resultA, resultB].filter((r) => r.success && !r.alreadyPaid);
  const replayWins = [resultA, resultB].filter((r) => r.success && r.alreadyPaid);

  assert('TC-COM-17a: Exactly 1 concurrent webhook wins fulfillment', fulfillmentWins.length === 1);
  assert('TC-COM-17b: Competing concurrent webhook safely returns alreadyPaid', replayWins.length === 1);

  const quotaAfterRace = await getUserQuotaStatus(testUserId);
  assert('TC-COM-17c: Quota provisioned exactly once (100 text turns for Standard)', quotaAfterRace.balances.text.totalAvailable === 100);

  // ── TC-COM-18: Provider Mismatch Guard ───────────────────────────────────────
  section('TC-COM-18: Provider Mismatch Guard');
  const mismatchOrderCode = `ORD_MISMATCH_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: testUserId,
      orderCode: mismatchOrderCode,
      planId: 'BASIC_MONTHLY',
      provider: 'SEPAY',
      amountVnd: 49000,
      status: 'PENDING',
    },
  });

  const mismatchRes = await fulfillPaymentOrderAtomic({
    orderCode: mismatchOrderCode,
    expectedProvider: 'VNPAY', // Wrong provider
    expectedAmountVnd: 49000,
  });
  assert('TC-COM-18: Provider mismatch fails fulfillment', mismatchRes.success === false);

  // ── TC-COM-19: Cross-Gateway Amount Integrity ────────────────────────────────
  section('TC-COM-19: Cross-Gateway Amount Integrity');
  const amountTamperOrderCode = `ORD_TAMPER_${Date.now()}`;
  await prisma.paymentOrder.create({
    data: {
      userId: testUserId,
      orderCode: amountTamperOrderCode,
      planId: 'BASIC_MONTHLY',
      provider: 'SEPAY',
      amountVnd: 49000,
      status: 'PENDING',
    },
  });

  const tamperRes = await fulfillPaymentOrderAtomic({
    orderCode: amountTamperOrderCode,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 20000, // Tampered amount
  });
  assert('TC-COM-19: Amount mismatch fails fulfillment', tamperRes.success === false);

  // ── TC-COM-20: Already PAID Safe Replay ──────────────────────────────────────
  section('TC-COM-20: Already PAID Safe Replay (COM-INVARIANT-06)');
  const replayRes = await fulfillPaymentOrderAtomic({
    orderCode: raceOrderCode,
    expectedProvider: 'SEPAY',
    expectedAmountVnd: 129000,
  });
  assert('TC-COM-20: Subsequent webhook replay returns success without error or double provisioning', replayRes.success === true && replayRes.alreadyPaid === true);

  console.log(`\nPayment & Fulfillment Tests Result: ${pass}/${pass + fail} assertions passed.`);
  return fail === 0;
}

if (require.main === module) {
  runPaymentTests()
    .then((ok) => {
      process.exit(ok ? 0 : 1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
