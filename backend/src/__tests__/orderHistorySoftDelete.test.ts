/**
 * TC-ORD-DEL: Order History Soft Delete & Privacy Test Suite
 *
 * Covers:
 *   TC-ORD-DEL-01: Single order soft delete (own order -> deletedAt set, record exists in DB, excluded from history query)
 *   TC-ORD-DEL-02: Multi-tenant security gate (cannot delete another user's order)
 *   TC-ORD-DEL-03: Batch delete multiple owned orders (deletedCount correct, deletedAt set)
 *   TC-ORD-DEL-04: Mixed batch security isolation (only caller's orders deleted, victim untouched)
 *   TC-ORD-DEL-05: Validation guards (empty array, invalid types, oversized batch -> HTTP 400)
 *   TC-ORD-DEL-06: Clear all history isolation (only caller's orders cleared, other users unaffected)
 *   TC-ORD-DEL-07: Webhook fulfillment integrity on soft-deleted PENDING order
 *   TC-ORD-DEL-08: Non-rollback invariant (Quota, Membership, VIP Pass, Voice Entitlement untouched)
 */

import { PrismaClient } from '@prisma/client';
import {
  deleteUserOrder,
  deleteUserOrdersBatch,
  clearUserOrderHistory,
  getUserOrders,
  fulfillPaymentOrderAtomic,
} from '../controllers/paymentController';
import {
  provisionSubscription,
  provisionVipPass,
  getUserQuotaStatus,
} from '../services/quotaManager';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';
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
  console.log('\n▶ ' + name);
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
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}): Request & AuthRequest {
  return {
    userId: opts.userId ?? '44444444-4444-4444-4444-444444444444',
    isDemo: false,
    params: opts.params ?? {},
    body: opts.body ?? {},
    query: opts.query ?? {},
    headers: {},
  } as unknown as Request & AuthRequest;
}

export async function runOrderHistorySoftDeleteTests(): Promise<boolean> {
  console.log('\n=== RUNNING ORDER HISTORY SOFT DELETE & PRIVACY TESTS ===');

  const userAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  try {
    // Ensure test users exist
    await prisma.user.upsert({
      where: { id: userAId },
      update: {},
      create: {
        id: userAId,
        phoneNumber: '+84911111111',
        displayName: 'Soft Delete User A',
      },
    });

    await prisma.user.upsert({
      where: { id: userBId },
      update: {},
      create: {
        id: userBId,
        phoneNumber: '+84922222222',
        displayName: 'Soft Delete User B',
      },
    });

    // ── TC-ORD-DEL-01: Single Delete ──────────────────────────────────────────
    section('TC-ORD-DEL-01: Single Delete (Own Order)');
    const order1Code = 'ORD_SD_01_' + Date.now();
    const order1 = await prisma.paymentOrder.create({
      data: {
        userId: userAId,
        orderCode: order1Code,
        planId: 'BASIC_MONTHLY',
        provider: 'SEPAY',
        amountVnd: 49000,
        status: 'PAID',
      },
    });

    const reqDel1 = makeAuthReq({
      userId: userAId,
      params: { orderId: order1.id },
    });
    const resDel1 = makeRes();
    await deleteUserOrder(reqDel1, resDel1);

    assert('TC-ORD-DEL-01a: Single delete returns HTTP 200 with success: true', resDel1._status === 200 && resDel1._json?.success === true);
    assert('TC-ORD-DEL-01b: Returns deleted orderId', resDel1._json?.orderId === order1.id);

    // Verify DB state
    const order1InDb = await prisma.paymentOrder.findUnique({ where: { id: order1.id } });
    assert('TC-ORD-DEL-01c: Record STILL EXISTS in database (No Hard Delete)', order1InDb !== null);
    assert('TC-ORD-DEL-01d: deletedAt timestamp is set', order1InDb?.deletedAt !== null);

    // Verify getUserOrders query
    const reqGetOrdersA = makeAuthReq({ userId: userAId });
    const resGetOrdersA = makeRes();
    await getUserOrders(reqGetOrdersA, resGetOrdersA);
    const hasOrder1 = resGetOrdersA._json?.orders?.some((o: any) => o.id === order1.id);
    assert('TC-ORD-DEL-01e: getUserOrders excludes soft-deleted order from response', !hasOrder1);

    // ── TC-ORD-DEL-02: Multi-tenant Security Gate ──────────────────────────────
    section('TC-ORD-DEL-02: Multi-tenant Security Gate (Cannot delete other user order)');
    const orderBCode = 'ORD_SD_B_' + Date.now();
    const orderB = await prisma.paymentOrder.create({
      data: {
        userId: userBId,
        orderCode: orderBCode,
        planId: 'STANDARD_MONTHLY',
        provider: 'VNPAY',
        amountVnd: 129000,
        status: 'PAID',
      },
    });

    // User A attempts to delete User B's order
    const reqHack = makeAuthReq({
      userId: userAId,
      params: { orderId: orderB.id },
    });
    const resHack = makeRes();
    await deleteUserOrder(reqHack, resHack);

    assert('TC-ORD-DEL-02a: Unauthorized delete rejected with HTTP 404', resHack._status === 404);

    const orderBInDb = await prisma.paymentOrder.findUnique({ where: { id: orderB.id } });
    assert('TC-ORD-DEL-02b: Victim User B order in DB remains completely UNTOUCHED (deletedAt is null)', orderBInDb?.deletedAt === null);

    // ── TC-ORD-DEL-03: Batch Delete ───────────────────────────────────────────
    section('TC-ORD-DEL-03: Batch Delete Multiple Owned Orders');
    const bOrder1 = await prisma.paymentOrder.create({
      data: { userId: userAId, orderCode: 'ORD_BATCH_1_' + Date.now(), planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15000, status: 'PAID' },
    });
    const bOrder2 = await prisma.paymentOrder.create({
      data: { userId: userAId, orderCode: 'ORD_BATCH_2_' + Date.now(), planId: 'VIP_1D', provider: 'SEPAY', amountVnd: 19000, status: 'PAID' },
    });
    const bOrder3 = await prisma.paymentOrder.create({
      data: { userId: userAId, orderCode: 'ORD_BATCH_3_' + Date.now(), planId: 'BASIC_MONTHLY', provider: 'SEPAY', amountVnd: 49000, status: 'PAID' },
    });

    const reqBatch = makeAuthReq({
      userId: userAId,
      body: { orderIds: [bOrder1.id, bOrder2.id, bOrder3.id] },
    });
    const resBatch = makeRes();
    await deleteUserOrdersBatch(reqBatch, resBatch);

    assert('TC-ORD-DEL-03a: Batch delete returns HTTP 200 and success: true', resBatch._status === 200 && resBatch._json?.success === true);
    assert('TC-ORD-DEL-03b: deletedCount matches 3', resBatch._json?.deletedCount === 3);

    const checkBatchOrders = await prisma.paymentOrder.findMany({
      where: { id: { in: [bOrder1.id, bOrder2.id, bOrder3.id] } },
    });
    assert('TC-ORD-DEL-03c: All 3 orders have deletedAt set in DB', checkBatchOrders.every((o) => o.deletedAt !== null));

    // ── TC-ORD-DEL-04: Mixed Batch Security Isolation ─────────────────────────
    section('TC-ORD-DEL-04: Mixed Batch Security Isolation');
    const mixA1 = await prisma.paymentOrder.create({
      data: { userId: userAId, orderCode: 'ORD_MIX_A1_' + Date.now(), planId: 'PACK_TEXT_10', provider: 'MOMO', amountVnd: 10000, status: 'PAID' },
    });
    const mixA2 = await prisma.paymentOrder.create({
      data: { userId: userAId, orderCode: 'ORD_MIX_A2_' + Date.now(), planId: 'VIP_3D', provider: 'SEPAY', amountVnd: 49000, status: 'PAID' },
    });
    const mixB = await prisma.paymentOrder.create({
      data: { userId: userBId, orderCode: 'ORD_MIX_B_' + Date.now(), planId: 'PREMIUM_MONTHLY', provider: 'VNPAY', amountVnd: 399000, status: 'PAID' },
    });

    // User A submits batch containing [mixA1, mixA2, mixB]
    const reqMix = makeAuthReq({
      userId: userAId,
      body: { orderIds: [mixA1.id, mixA2.id, mixB.id] },
    });
    const resMix = makeRes();
    await deleteUserOrdersBatch(reqMix, resMix);

    assert('TC-ORD-DEL-04a: Returns success with deletedCount = 2', resMix._json?.deletedCount === 2);

    const mixA1Db = await prisma.paymentOrder.findUnique({ where: { id: mixA1.id } });
    const mixA2Db = await prisma.paymentOrder.findUnique({ where: { id: mixA2.id } });
    const mixBDb = await prisma.paymentOrder.findUnique({ where: { id: mixB.id } });

    assert('TC-ORD-DEL-04b: User A order 1 soft-deleted', mixA1Db?.deletedAt !== null);
    assert('TC-ORD-DEL-04c: User A order 2 soft-deleted', mixA2Db?.deletedAt !== null);
    assert('TC-ORD-DEL-04d: User B order untouched (deletedAt === null)', mixBDb?.deletedAt === null);

    // ── TC-ORD-DEL-05: Validation Guards ──────────────────────────────────────
    section('TC-ORD-DEL-05: Validation Guards');
    // 5a: Empty array
    const reqValEmpty = makeAuthReq({ userId: userAId, body: { orderIds: [] } });
    const resValEmpty = makeRes();
    await deleteUserOrdersBatch(reqValEmpty, resValEmpty);
    assert('TC-ORD-DEL-05a: Empty array returns HTTP 400', resValEmpty._status === 400);

    // 5b: Missing body
    const reqValMissing = makeAuthReq({ userId: userAId, body: {} });
    const resValMissing = makeRes();
    await deleteUserOrdersBatch(reqValMissing, resValMissing);
    assert('TC-ORD-DEL-05b: Missing body returns HTTP 400', resValMissing._status === 400);

    // 5c: Invalid types in array
    const reqValTypes = makeAuthReq({ userId: userAId, body: { orderIds: ['valid-id', 123, null] } });
    const resValTypes = makeRes();
    await deleteUserOrdersBatch(reqValTypes, resValTypes);
    assert('TC-ORD-DEL-05c: Non-string elements return HTTP 400', resValTypes._status === 400);

    // 5d: Oversized batch (>100)
    const bigBatch = Array.from({ length: 105 }, (_, i) => 'mock_id_' + i);
    const reqValBig = makeAuthReq({ userId: userAId, body: { orderIds: bigBatch } });
    const resValBig = makeRes();
    await deleteUserOrdersBatch(reqValBig, resValBig);
    assert('TC-ORD-DEL-05d: Batch > 100 returns HTTP 400', resValBig._status === 400);

    // ── TC-ORD-DEL-06: Clear All History Isolation ────────────────────────────
    section('TC-ORD-DEL-06: Clear All History Isolation');
    // Seed 2 more for A, 2 more for B
    await prisma.paymentOrder.create({ data: { userId: userAId, orderCode: 'ORD_CLR_A1_' + Date.now(), planId: 'BASIC_MONTHLY', provider: 'SEPAY', amountVnd: 49000, status: 'PAID' } });
    await prisma.paymentOrder.create({ data: { userId: userAId, orderCode: 'ORD_CLR_A2_' + Date.now(), planId: 'PACK_VOICE_15', provider: 'SEPAY', amountVnd: 15000, status: 'PAID' } });
    const clrB1 = await prisma.paymentOrder.create({ data: { userId: userBId, orderCode: 'ORD_CLR_B1_' + Date.now(), planId: 'STANDARD_MONTHLY', provider: 'SEPAY', amountVnd: 129000, status: 'PAID' } });
    const clrB2 = await prisma.paymentOrder.create({ data: { userId: userBId, orderCode: 'ORD_CLR_B2_' + Date.now(), planId: 'VIP_7D', provider: 'SEPAY', amountVnd: 89000, status: 'PAID' } });

    const reqClear = makeAuthReq({ userId: userAId });
    const resClear = makeRes();
    await clearUserOrderHistory(reqClear, resClear);

    assert('TC-ORD-DEL-06a: Clear all returns HTTP 200 with deletedCount >= 2', resClear._status === 200 && resClear._json?.deletedCount >= 2);

    const activeAOrders = await prisma.paymentOrder.count({ where: { userId: userAId, deletedAt: null } });
    assert('TC-ORD-DEL-06b: User A active orders count in DB is 0', activeAOrders === 0);

    const activeBOrders = await prisma.paymentOrder.count({ where: { userId: userBId, deletedAt: null } });
    assert('TC-ORD-DEL-06c: User B active orders completely intact', activeBOrders >= 2);

    // ── TC-ORD-DEL-07: Webhook Fulfillment Integrity on Soft-Deleted Order ─────
    section('TC-ORD-DEL-07: Webhook Fulfillment Integrity on Soft-Deleted Order');
    const pendingOrderCode = 'ORD_PENDING_SD_' + Date.now();
    const pendingOrder = await prisma.paymentOrder.create({
      data: {
        userId: userAId,
        orderCode: pendingOrderCode,
        planId: 'STANDARD_MONTHLY',
        provider: 'SEPAY',
        amountVnd: 129000,
        status: 'PENDING',
      },
    });

    // User soft-deletes this PENDING order before webhook arrives
    const reqDelPending = makeAuthReq({ userId: userAId, params: { orderId: pendingOrder.id } });
    const resDelPending = makeRes();
    await deleteUserOrder(reqDelPending, resDelPending);
    assert('TC-ORD-DEL-07a: User successfully soft-deletes PENDING order', resDelPending._json?.success === true);

    // Now SePAY webhook arrives with payment confirmation
    const webhookResult = await fulfillPaymentOrderAtomic({
      orderCode: pendingOrderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: 129000,
      transactionId: 'TX_SD_WEBHOOK_' + Date.now(),
      rawWebhookData: { simulated: true, note: 'payment after soft delete' },
    });

    assert('TC-ORD-DEL-07b: Webhook successfully finds and fulfills soft-deleted order', webhookResult.success === true);

    const fulfilledOrder = await prisma.paymentOrder.findUnique({ where: { orderCode: pendingOrderCode } });
    assert('TC-ORD-DEL-07c: Order transitioned PENDING -> PAID', fulfilledOrder?.status === 'PAID');

    // ── TC-ORD-DEL-08: Non-Rollback Invariant ──────────────────────────────────
    section('TC-ORD-DEL-08: Quota/VIP/Membership Non-Rollback Invariant');
    // Provision active VIP pass and Subscription for User A
    await provisionVipPass({ userId: userAId, vipCode: 'VIP_7D' });
    await provisionSubscription({ userId: userAId, plan: 'PREMIUM_MONTHLY', status: 'ACTIVE' });

    const quotaBefore = await getUserQuotaStatus(userAId);
    const entitlementBefore = await VoiceEntitlementResolver.resolveVoiceEntitlement(userAId);

    // User wipes all transaction history
    const reqClearFinal = makeAuthReq({ userId: userAId });
    const resClearFinal = makeRes();
    await clearUserOrderHistory(reqClearFinal, resClearFinal);

    const quotaAfter = await getUserQuotaStatus(userAId);
    const entitlementAfter = await VoiceEntitlementResolver.resolveVoiceEntitlement(userAId);

    assert('TC-ORD-DEL-08a: Active subscription plan is still PREMIUM_MONTHLY', quotaAfter.plan === 'PREMIUM_MONTHLY');
    assert('TC-ORD-DEL-08b: Text turns quota untouched', quotaAfter.balances.text.totalAvailable === quotaBefore.balances.text.totalAvailable);
    assert('TC-ORD-DEL-08c: Voice mins quota untouched', quotaAfter.balances.voice.totalAvailable === quotaBefore.balances.voice.totalAvailable);
    assert('TC-ORD-DEL-08d: Assistant quota untouched', quotaAfter.balances.assistant.totalAvailable === quotaBefore.balances.assistant.totalAvailable);
    assert('TC-ORD-DEL-08e: VIP Voice Entitlement is still TIME_UNLIMITED', entitlementAfter.mode === 'TIME_UNLIMITED' && entitlementAfter.source === 'VIP');

    console.log('\nOrder History Soft Delete Tests Result: ' + pass + '/' + (pass + fail) + ' assertions passed.');
    return fail === 0;
  } finally {
    // Cleanup test users and data
    try {
      await prisma.userSubscription.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.userQuota.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.userVipPass.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.userCreditPack.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.paymentOrder.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    } catch {}
  }
}

if (require.main === module) {
  runOrderHistorySoftDeleteTests()
    .then((ok) => {
      process.exit(ok ? 0 : 1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
