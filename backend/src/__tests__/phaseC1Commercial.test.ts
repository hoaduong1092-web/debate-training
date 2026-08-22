/**
 * Phase C1 — Commercial Packaging & User Transaction Portal Test Suite.
 * Spec: Phase C1 Locked Implementation Contract v1.0
 * 
 * Verifies all Phase C1 capabilities:
 *  - Section 1: C1-A User Transaction History & Order Portal (Orders API, Security Isolation, Ordering, Pagination)
 *  - Section 2: C1-B VIP Pass Commercialization (Catalog, Checkout, Atomic Provisioning, Stacking, Entitlement Precedence)
 *  - Section 3: C1-C Subscription Renewal Stacking (Additive Extension on Same-Plan Active Renewal, Upgrade Handling)
 *  - Section 4: Cross-Feature E2E Commercial Lifecycle
 */

import { PrismaClient } from '@prisma/client';
import {
  listVipPassCodes,
  getVipPassDefinition,
  parseVipPassCode,
} from '../services/planQuotaRegistry';
import {
  provisionSubscription,
  provisionVipPass,
  getUserQuotaStatus,
} from '../services/quotaManager';
import {
  createCheckoutSession,
  fulfillPaymentOrderAtomic,
  getUserOrders,
  handleSandboxDirectUpgrade,
} from '../controllers/paymentController';
import { VoiceEntitlementResolver } from '../services/voiceEntitlementResolver';
import type { AuthRequest } from '../middleware/auth';

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

function createMockResponse() {
  const res: any = {};
  res.statusCode = 200;
  res.data = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return res;
}

async function runC1Tests() {
  console.log('\n============================================================');
  console.log('PHASE C1: COMMERCIAL PACKAGING & USER TRANSACTION PORTAL TESTS');
  console.log('============================================================\n');

  const testSuffix = `c1_${Date.now()}`;

  let userA: any;
  let userB: any;
  let userRenewal: any;
  let userE2E: any;

  try {
    // Seed test users
    userA = await prisma.user.create({
      data: {
        phoneNumber: `+8491${Math.floor(1000000 + Math.random() * 9000000)}`,
        displayName: `User A ${testSuffix}`,
      },
    });

    userB = await prisma.user.create({
      data: {
        phoneNumber: `+8492${Math.floor(1000000 + Math.random() * 9000000)}`,
        displayName: `User B ${testSuffix}`,
      },
    });

    userRenewal = await prisma.user.create({
      data: {
        phoneNumber: `+8493${Math.floor(1000000 + Math.random() * 9000000)}`,
        displayName: `Renewal User ${testSuffix}`,
      },
    });

    userE2E = await prisma.user.create({
      data: {
        phoneNumber: `+8494${Math.floor(1000000 + Math.random() * 9000000)}`,
        displayName: `E2E User ${testSuffix}`,
      },
    });

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 1: C1-A USER TRANSACTION HISTORY & ORDER PORTAL
    // ═════════════════════════════════════════════════════════════════════════
    console.log('--- SECTION 1: C1-A User Transaction History & Order Portal ---');

    // C1-A01: Rejects unauthenticated requests
    {
      const req: any = { query: {} };
      const res = createMockResponse();
      await getUserOrders(req as AuthRequest, res);
      assert(res.statusCode === 401 && res.data.error === 'Unauthorized', 'C1-A01: rejects unauthenticated requests with HTTP 401');
    }

    // C1-A02: Empty orders for new user
    {
      const req: any = { userId: userA.id, query: {} };
      const res = createMockResponse();
      await getUserOrders(req as AuthRequest, res);
      assert(res.statusCode === 200 && res.data.total === 0 && res.data.orders.length === 0, 'C1-A02: returns empty orders list for new user');
    }

    // C1-A03: Multi-tenant user isolation
    const orderCodeA = `ORD_C1_A_${Date.now()}`;
    const orderCodeB = `ORD_C1_B_${Date.now()}`;
    {
      await prisma.paymentOrder.create({
        data: {
          userId: userA.id,
          orderCode: orderCodeA,
          planId: 'BASIC_MONTHLY',
          amountVnd: 49000,
          provider: 'SEPAY',
          status: 'PAID',
        },
      });

      await prisma.paymentOrder.create({
        data: {
          userId: userB.id,
          orderCode: orderCodeB,
          planId: 'PREMIUM_MONTHLY',
          amountVnd: 399000,
          provider: 'VNPAY',
          status: 'PAID',
        },
      });

      const reqA: any = { userId: userA.id, query: {} };
      const resA = createMockResponse();
      await getUserOrders(reqA as AuthRequest, resA);

      const reqB: any = { userId: userB.id, query: {} };
      const resB = createMockResponse();
      await getUserOrders(reqB as AuthRequest, resB);

      const isolationPassed =
        resA.data.total === 1 &&
        resA.data.orders[0].orderCode === orderCodeA &&
        !resA.data.orders.some((o: any) => o.orderCode === orderCodeB) &&
        resB.data.total === 1 &&
        resB.data.orders[0].orderCode === orderCodeB &&
        !resB.data.orders.some((o: any) => o.orderCode === orderCodeA);

      assert(isolationPassed, 'C1-A03: strictly enforces multi-tenant user isolation');
    }

    // C1-A04: Order sorting and DTO formatting
    const order2 = `ORD_C1_A2_${Date.now()}`;
    const order3 = `ORD_C1_A3_${Date.now()}`;
    {
      await prisma.paymentOrder.create({
        data: {
          userId: userA.id,
          orderCode: order2,
          planId: 'PACK_VOICE_15',
          amountVnd: 15000,
          provider: 'MOMO',
          status: 'PAID',
          createdAt: new Date(Date.now() + 1000),
        },
      });

      await prisma.paymentOrder.create({
        data: {
          userId: userA.id,
          orderCode: order3,
          planId: 'VIP_3D',
          amountVnd: 49000,
          provider: 'SEPAY',
          status: 'PENDING',
          createdAt: new Date(Date.now() + 2000),
        },
      });

      const req: any = { userId: userA.id, query: {} };
      const res = createMockResponse();
      await getUserOrders(req as AuthRequest, res);

      const sortingAndFormatPassed =
        res.data.total === 3 &&
        res.data.orders[0].orderCode === order3 &&
        res.data.orders[0].itemType === 'VIP' &&
        res.data.orders[0].itemName === 'VIP Pass 3 Ngày (Chiến Dịch)' &&
        res.data.orders[1].orderCode === order2 &&
        res.data.orders[1].itemType === 'CREDIT_PACK' &&
        res.data.orders[2].itemType === 'PLAN';

      assert(sortingAndFormatPassed, 'C1-A04: orders transactions newest-first with human-readable item names and DTO types');
    }

    // C1-A05: Pagination limits and offsets
    {
      const req: any = { userId: userA.id, query: { limit: 1, skip: 1 } };
      const res = createMockResponse();
      await getUserOrders(req as AuthRequest, res);

      const paginationPassed =
        res.data.total === 3 &&
        res.data.orders.length === 1 &&
        res.data.orders[0].orderCode === order2;

      assert(paginationPassed, 'C1-A05: respects pagination limit and skip offsets');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 2: C1-B VIP PASS COMMERCIALIZATION
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 2: C1-B VIP Pass Commercialization ---');

    // C1-B01: VIP pass registry integrity
    {
      const codes = listVipPassCodes();
      const vip1 = getVipPassDefinition('VIP_1D');
      const vip3 = getVipPassDefinition('VIP_3D');
      const vip7 = getVipPassDefinition('VIP_7D');
      const vip30 = getVipPassDefinition('VIP_30D');

      const registryValid =
        codes.length === 4 &&
        vip1?.listPriceVnd === 19000 && vip1?.durationDays === 1 &&
        vip3?.listPriceVnd === 49000 && vip3?.durationDays === 3 &&
        vip7?.listPriceVnd === 89000 && vip7?.durationDays === 7 &&
        vip30?.listPriceVnd === 199000 && vip30?.durationDays === 30;

      assert(registryValid, 'C1-B01: VIP pass registry contains exactly the 4 locked active tiers with correct prices and durations');
    }

    // C1-B02: Parsing and normalization
    {
      const parsingValid =
        parseVipPassCode('VIP_1D') === 'VIP_1D' &&
        parseVipPassCode('vip_3d') === 'VIP_3D' &&
        parseVipPassCode('VIP_7') === 'VIP_7D' &&
        parseVipPassCode('VIP_MONTH') === 'VIP_30D' &&
        parseVipPassCode('INVALID') === null;

      assert(parsingValid, 'C1-B02: parseVipPassCode normalizes casing and aliases');
    }

    // C1-B03: Checkout session creation for VIP
    let checkoutOrderCode = '';
    {
      const req: any = {
        userId: userB.id,
        body: {
          itemCode: 'VIP_3D',
          provider: 'SEPAY',
        },
      };
      const res = createMockResponse();
      await createCheckoutSession(req as AuthRequest, res);

      checkoutOrderCode = res.data?.orderCode;

      const orderInDb = await prisma.paymentOrder.findUnique({
        where: { orderCode: checkoutOrderCode },
      });

      const checkoutValid =
        res.statusCode === 200 &&
        res.data.amountVnd === 49000 &&
        res.data.itemType === 'VIP' &&
        res.data.itemCode === 'VIP_3D' &&
        orderInDb !== null &&
        orderInDb.status === 'PENDING' &&
        Number(orderInDb.amountVnd) === 49000;

      assert(checkoutValid, 'C1-B03: checkout session enforces server-authoritative VIP pricing and creates pending order');
    }

    // C1-B04: Atomic fulfillment of VIP Pass
    {
      const fulfillment = await fulfillPaymentOrderAtomic({
        orderCode: checkoutOrderCode,
        expectedProvider: 'SEPAY',
        expectedAmountVnd: 49000,
        transactionId: `TX_VIP_${Date.now()}`,
      });

      const activePass = await prisma.userVipPass.findFirst({
        where: { userId: userB.id, status: 'ACTIVE' },
      });

      const fulfillmentValid =
        fulfillment.success &&
        activePass !== null &&
        activePass.passCode === 'VIP_3D' &&
        activePass.expiresAt.getTime() > Date.now() + 2 * 24 * 60 * 60 * 1000;

      assert(fulfillmentValid, 'C1-B04: fulfills VIP pass atomically creating active UserVipPass record');
    }

    // C1-B05: Webhook Replay Idempotency
    {
      const replay = await fulfillPaymentOrderAtomic({
        orderCode: checkoutOrderCode,
        expectedProvider: 'SEPAY',
        expectedAmountVnd: 49000,
        transactionId: `TX_REPLAY_${Date.now()}`,
      });

      const passCount = await prisma.userVipPass.count({
        where: { userId: userB.id, status: 'ACTIVE' },
      });

      assert(replay.success && replay.alreadyPaid && passCount === 1, 'C1-B05: replaying webhook fulfillment is idempotent and does not duplicate pass');
    }

    // C1-B06: Entitlement resolution for VIP
    {
      const ent = await VoiceEntitlementResolver.resolveVoiceEntitlement(userB.id);

      const entValid =
        ent.allowed === true &&
        ent.mode === 'TIME_UNLIMITED' &&
        ent.source === 'VIP' &&
        ent.breakdown?.vipPassCode === 'VIP_3D' &&
        ent.maxAllowedMs === 900000;

      assert(entValid, 'C1-B06: active VIP pass grants TIME_UNLIMITED Voice entitlement with 0 quota deduction and 15m cap');
    }

    // C1-B07: Additive extension on active VIP pass
    {
      const activePassBefore = await prisma.userVipPass.findFirst({
        where: { userId: userB.id, status: 'ACTIVE' },
      });
      const expiresAtBefore = activePassBefore!.expiresAt.getTime();

      const result = await provisionVipPass({
        userId: userB.id,
        vipCode: 'VIP_7D',
      });

      const expectedDurationMs = 7 * 24 * 60 * 60 * 1000;
      const additiveValid =
        Math.abs(result.expiresAt.getTime() - (expiresAtBefore + expectedDurationMs)) < 2000;

      const activeCount = await prisma.userVipPass.count({
        where: { userId: userB.id, status: 'ACTIVE' },
      });

      assert(additiveValid && activeCount === 1, 'C1-B07: purchasing second VIP while active additively stacks expiration duration');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 3: C1-C SUBSCRIPTION RENEWAL STACKING
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 3: C1-C Subscription Renewal Stacking ---');

    // C1-C01: Initial subscription creation
    let initialExpiresAt = 0;
    {
      const now = new Date();
      const result = await provisionSubscription({
        userId: userRenewal.id,
        plan: 'BASIC_MONTHLY',
        status: 'ACTIVE',
      });

      initialExpiresAt = result.periodEnd.getTime();
      const expectedEnd = now.getTime() + 30 * 24 * 60 * 60 * 1000;

      assert(
        result.plan === 'BASIC_MONTHLY' && Math.abs(initialExpiresAt - expectedEnd) < 3000,
        'C1-C01: initial subscription sets periodStart to now and periodEnd to now + 30 days',
      );
    }

    // C1-C02: Same-Plan active renewal stacking (Additive Extension)
    {
      const renewalResult = await provisionSubscription({
        userId: userRenewal.id,
        plan: 'BASIC_MONTHLY',
        status: 'ACTIVE',
      });

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const expectedStacked = initialExpiresAt + thirtyDaysMs;

      const stackingPassed =
        Math.abs(renewalResult.periodEnd.getTime() - expectedStacked) < 2000 &&
        renewalResult.remaining.text === 30 &&
        renewalResult.remaining.voice === 15 &&
        renewalResult.remaining.assistant === 10;

      assert(stackingPassed, 'C1-C02: same-plan early renewal additively stacks remaining days onto existing expiration');
    }

    // C1-C03: Renewing expired subscription
    {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      await prisma.userSubscription.update({
        where: { userId: userRenewal.id },
        data: {
          status: 'EXPIRED',
          expiresAt: pastDate,
        },
      });

      const now = new Date();
      const reactivated = await provisionSubscription({
        userId: userRenewal.id,
        plan: 'BASIC_MONTHLY',
        status: 'ACTIVE',
      });

      const expectedEnd = now.getTime() + 30 * 24 * 60 * 60 * 1000;
      assert(
        Math.abs(reactivated.periodEnd.getTime() - expectedEnd) < 3000,
        'C1-C03: renewing an expired subscription resets periodStart to now',
      );
    }

    // C1-C04: Tier upgrade switches plan and baseline immediately
    {
      const now = new Date();
      const upgraded = await provisionSubscription({
        userId: userRenewal.id,
        plan: 'STANDARD_MONTHLY',
        status: 'ACTIVE',
      });

      const upgradePassed =
        upgraded.plan === 'STANDARD_MONTHLY' &&
        upgraded.limits.text === 100 &&
        upgraded.limits.voice === 60 &&
        upgraded.limits.assistant === 50;

      assert(upgradePassed, 'C1-C04: plan tier upgrade immediately updates tier and baseline quota');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SECTION 4: FULL E2E COMMERCIAL LIFECYCLE
    // ═════════════════════════════════════════════════════════════════════════
    console.log('\n--- SECTION 4: Full E2E Commercial Lifecycle ---');

    // 1. Buy BASIC_MONTHLY via Sandbox
    const reqSub: any = { userId: userE2E.id, body: { planTier: 'BASIC_MONTHLY' } };
    const resSub = createMockResponse();
    await handleSandboxDirectUpgrade(reqSub as AuthRequest, resSub);

    // 2. Buy Add-on PACK_VOICE_15 via Sandbox
    const reqPack: any = { userId: userE2E.id, body: { itemCode: 'PACK_VOICE_15' } };
    const resPack = createMockResponse();
    await handleSandboxDirectUpgrade(reqPack as AuthRequest, resPack);

    // 3. Buy VIP Pass VIP_1D via Sandbox
    const reqVip: any = { userId: userE2E.id, body: { itemCode: 'VIP_1D' } };
    const resVip = createMockResponse();
    await handleSandboxDirectUpgrade(reqVip as AuthRequest, resVip);

    // 4. Fetch Order History
    const reqOrders: any = { userId: userE2E.id, query: {} };
    const resOrders = createMockResponse();
    await getUserOrders(reqOrders as AuthRequest, resOrders);

    // 5. Check Voice Entitlement
    const ent = await VoiceEntitlementResolver.resolveVoiceEntitlement(userE2E.id);

    // 6. Check Wallet Quota
    const quota = await getUserQuotaStatus(userE2E.id);

    const lifecyclePassed =
      resSub.data?.success &&
      resPack.data?.success &&
      resVip.data?.success &&
      resOrders.data?.total === 3 &&
      resOrders.data?.orders[0].itemType === 'VIP' &&
      resOrders.data?.orders[1].itemType === 'CREDIT_PACK' &&
      resOrders.data?.orders[2].itemType === 'PLAN' &&
      ent.allowed === true &&
      ent.mode === 'TIME_UNLIMITED' &&
      ent.source === 'VIP' &&
      quota.balances.voice.subscriptionRemaining === 15 &&
      quota.balances.voice.creditPackRemaining === 15 &&
      quota.creditPacks.length === 1 &&
      quota.creditPacks[0].remainingUnits === 15;

    assert(lifecyclePassed, 'C1-E2E: complete lifecycle: Subscription -> Credit Pack -> VIP Pass -> Orders History -> Quota Invariants');

  } finally {
    // Clean up test data
    const userIds = [userA?.id, userB?.id, userRenewal?.id, userE2E?.id].filter(Boolean) as string[];
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    }).catch(() => {});
    await prisma.$disconnect();
  }

  console.log('\n============================================================');
  console.log(`PHASE C1 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void runC1Tests();
