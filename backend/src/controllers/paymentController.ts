/**
 * Payment & Subscription Upgrade Controller - v15.0.0 / v16.0.0
 *
 * Implements:
 *   - POST /api/v1/payments/checkout        — Server-Authoritative Pricing & PaymentOrder Persistence (PENDING)
 *   - GET/POST /api/v1/payments/vnpay/ipn   — VNPay HMAC-SHA512 IPN & Atomic Fulfillment
 *   - POST /api/v1/payments/momo/ipn        — MoMo HMAC-SHA256 IPN & Atomic Fulfillment
 *   - POST /api/v1/payments/sepay/webhook   — SePAY VietQR Authorization & Atomic Fulfillment
 *   - POST /api/v1/payments/webhook         — Universal / Simulated Webhook Handler
 *   - POST /api/v1/payments/sandbox-upgrade — Instant sandbox top-up (dev/test only)
 *
 * ALL 10 COMMERCE INVARIANTS ENFORCED:
 *   COM-INVARIANT-01 to COM-INVARIANT-10
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/auth';
import {
  parsePlanCode,
  parseCreditPackCode,
  getCreditPackDefinition,
  getPlanDefinition,
  parseVipPassCode,
  getVipPassDefinition,
} from '../services/planQuotaRegistry';
import {
  provisionSubscription,
  provisionCreditPack,
  provisionVipPass,
  getUserQuotaStatus,
} from '../services/quotaManager';
import {
  createVNPayCheckoutUrl,
  verifyVNPayIpn,
  createMoMoPayment,
  verifyMoMoIpn,
  generateVietQRPayload,
  verifySePayWebhook,
} from '../services/paymentProviders';

const prisma = new PrismaClient();

function generateOrderCode(prefix = 'ORD'): string {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${rand}`;
}

export function scrubSensitiveData(payload: unknown): Record<string, unknown> | undefined {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return undefined;
  }

  const sensitiveKeys = new Set([
    'cvv',
    'cvc',
    'token',
    'secret',
    'password',
    'private_key',
    'privatekey',
    'card_number',
    'cardnumber',
    'pan',
    'otp',
    'pin',
    'auth_code',
    'authcode',
    'access_token',
    'refresh_token',
    'apikey',
    'api_key',
  ]);

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
    const lower = key.toLowerCase().replace(/[-_]/g, '');
    if (sensitiveKeys.has(lower) || sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      sanitized[key] = scrubSensitiveData(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

// ─── Atomic Fulfillment Helper (Single Transaction Boundary) ──────────────────

export interface FulfillmentResult {
  success: boolean;
  alreadyPaid: boolean;
  orderCode: string;
  message: string;
  order?: any;
}

/**
 * Executes Database-Level Atomic Claim + Fulfillment inside a SINGLE PostgreSQL Transaction.
 * Enforces COM-INVARIANT-05, COM-INVARIANT-06, COM-INVARIANT-07, COM-INVARIANT-09, COM-INVARIANT-10.
 */
export async function fulfillPaymentOrderAtomic(params: {
  orderCode: string;
  expectedProvider: string;
  expectedAmountVnd?: number;
  transactionId?: string;
  rawWebhookData?: unknown;
}): Promise<FulfillmentResult> {
  const { orderCode, expectedProvider, expectedAmountVnd, transactionId, rawWebhookData } = params;
  const sanitizedData = rawWebhookData ? scrubSensitiveData(rawWebhookData) : null;
  const jsonSanitized = sanitizedData ? JSON.stringify(sanitizedData) : null;

  return prisma.$transaction(async (tx) => {
    // 1. Locate Order
    const order = await tx.paymentOrder.findUnique({
      where: { orderCode },
    });

    if (!order) {
      return {
        success: false,
        alreadyPaid: false,
        orderCode,
        message: `Order not found: ${orderCode}`,
      };
    }

    // 2. Provider Integrity Check
    if (order.provider !== expectedProvider) {
      return {
        success: false,
        alreadyPaid: false,
        orderCode,
        message: `Provider mismatch: expected ${order.provider}, got ${expectedProvider}`,
      };
    }

    // 3. Amount Integrity Check
    if (expectedAmountVnd !== undefined) {
      const orderAmount = Number(order.amountVnd);
      if (Math.abs(orderAmount - expectedAmountVnd) > 0.01) {
        return {
          success: false,
          alreadyPaid: false,
          orderCode,
          message: `Amount mismatch: expected ${orderAmount}, got ${expectedAmountVnd}`,
        };
      }
    }

    // 4. Atomic Claim: Exactly 1 concurrent request can transition PENDING -> PAID
    const updatedCount = await tx.$executeRaw`
      UPDATE payment_orders
      SET status = 'PAID',
          transaction_id = ${transactionId || null},
          raw_webhook_data = ${jsonSanitized}::jsonb,
          updated_at = NOW()
      WHERE order_code = ${orderCode}
        AND status = 'PENDING'
        AND provider = ${expectedProvider}
    `;

    if (updatedCount === 1) {
      // Claim won -> Check if order is for VIP Pass, Credit Pack, or Subscription Plan
      const parsedVip = parseVipPassCode(order.planId);
      const parsedPack = !parsedVip ? parseCreditPackCode(order.planId) : null;

      if (parsedVip) {
        await provisionVipPass(
          {
            userId: order.userId,
            vipCode: parsedVip,
          },
          tx,
        );
      } else if (parsedPack) {
        await provisionCreditPack(
          {
            userId: order.userId,
            packCode: parsedPack,
          },
          tx,
        );
      } else {
        await provisionSubscription(
          {
            userId: order.userId,
            plan: order.planId,
            status: 'ACTIVE',
            replaceExisting: true,
          },
          tx,
        );
      }

      const updatedOrder = await tx.paymentOrder.findUnique({ where: { orderCode } });

      return {
        success: true,
        alreadyPaid: false,
        orderCode,
        message: parsedVip
          ? 'Order fulfilled successfully and VIP pass activated'
          : parsedPack
          ? 'Order fulfilled successfully and credit pack provisioned'
          : 'Order fulfilled successfully and subscription activated',
        order: updatedOrder,
      };
    }

    // 5. If updatedCount is 0, re-fetch fresh order to check if now PAID (Idempotent replay / race winner committed)
    const freshOrder = await tx.paymentOrder.findUnique({ where: { orderCode } });
    if (freshOrder && freshOrder.status === 'PAID') {
      return {
        success: true,
        alreadyPaid: true,
        orderCode,
        message: 'Order already fulfilled (idempotent replay)',
        order: freshOrder,
      };
    }

    return {
      success: false,
      alreadyPaid: false,
      orderCode,
      message: `Cannot fulfill order with status: ${freshOrder?.status ?? order.status}`,
    };
  }, {
    timeout: 15000,
    maxWait: 10000,
  });
}

// ─── POST /api/v1/payments/checkout ──────────────────────────────────────────

export async function createCheckoutSession(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const userId = req.userId;
    const {
      itemCode,
      planTier,
      provider: rawProvider,
      ipAddr,
    } = req.body as {
      itemCode?: string;
      planTier?: string;
      provider?: string;
      ipAddr?: string;
    };

    const targetCode = planTier || itemCode;
    const providerUpper = (rawProvider ?? 'SEPAY').trim().toUpperCase();

    const allowedProviders = ['VNPAY', 'MOMO', 'SEPAY', 'SANDBOX'];
    if (!allowedProviders.includes(providerUpper)) {
      res.status(400).json({
        error: 'Invalid provider',
        message: `Provider "${providerUpper}" is not supported. Choose from: ${allowedProviders.join(', ')}.`,
      });
      return;
    }

    // Check if targetCode is a VIP Pass, Credit Pack, or Subscription Plan
    const parsedVip = parseVipPassCode(targetCode);
    const parsedPack = !parsedVip ? parseCreditPackCode(targetCode) : null;
    const parsedPlan = !parsedVip && !parsedPack ? parsePlanCode(targetCode) : null;

    if (!parsedVip && !parsedPack && !parsedPlan) {
      res.status(400).json({
        error: 'Invalid item',
        message: `Unknown plan tier, pack code, or VIP pass "${String(targetCode)}". Supported VIP: VIP_1D, VIP_3D, VIP_7D, VIP_30D. Supported packs: PACK_VOICE_15, PACK_VOICE_60, PACK_TEXT_10, PACK_ASST_5. Supported plans: BASIC_MONTHLY, BASIC_YEARLY, STANDARD_MONTHLY, STANDARD_YEARLY, PREMIUM_MONTHLY, PREMIUM_YEARLY.`,
      });
      return;
    }

    let itemName = '';
    let itemCodeOut = '';
    let amountVnd = 0;
    let itemType: 'PLAN' | 'CREDIT_PACK' | 'VIP' = 'PLAN';

    if (parsedVip) {
      const vipDef = getVipPassDefinition(parsedVip);
      if (!vipDef) {
        res.status(400).json({
          error: 'VIP pass not available',
          message: `VIP pass "${parsedVip}" is not defined.`,
        });
        return;
      }
      itemName = vipDef.displayName;
      itemCodeOut = vipDef.code;
      amountVnd = vipDef.listPriceVnd;
      itemType = 'VIP';
    } else if (parsedPack) {
      const packDef = getCreditPackDefinition(parsedPack);
      if (!packDef) {
        res.status(400).json({
          error: 'Credit pack not available',
          message: `Credit pack "${parsedPack}" is not defined.`,
        });
        return;
      }
      itemName = packDef.displayName;
      itemCodeOut = packDef.code;
      amountVnd = packDef.listPriceVnd;
      itemType = 'CREDIT_PACK';
    } else if (parsedPlan) {
      // Lookup plan from Database (Single Source of Truth - COM-INVARIANT-02)
      let dbPlan = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            { id: parsedPlan },
            { id: targetCode },
          ],
          isActive: true,
        },
      });

      // Self-heal / Auto-seed plan if missing from database
      if (!dbPlan) {
        const planDef = getPlanDefinition(parsedPlan);
        if (planDef) {
          try {
            dbPlan = await prisma.subscriptionPlan.upsert({
              where: { id: planDef.code },
              update: { isActive: true },
              create: {
                id: planDef.code,
                name: planDef.displayName,
                billingCycle: planDef.durationDays > 30 ? 'yearly' : 'monthly',
                priceVnd: planDef.listPriceVnd,
                durationDays: planDef.durationDays,
                textTurnsQuota: planDef.limits.text,
                voiceMinsQuota: planDef.limits.voice,
                assistantQuota: planDef.limits.assistant,
                isActive: true,
                isPopular: planDef.code.includes('STANDARD'),
                sortOrder: planDef.code.includes('BASIC') ? 1 : planDef.code.includes('STANDARD') ? 3 : 5,
              },
            });
          } catch (upsertErr) {
            console.warn('[PLAN_SELF_HEAL_WARN]', upsertErr);
          }
        }
      }

      if (!dbPlan) {
        res.status(400).json({
          error: 'Plan not available',
          message: `Plan "${parsedPlan}" is not active or does not exist in Database.`,
        });
        return;
      }
      itemName = dbPlan.name;
      itemCodeOut = dbPlan.id;
      amountVnd = Number(dbPlan.priceVnd);
      itemType = 'PLAN';
    }

    const orderCode = generateOrderCode(providerUpper === 'SANDBOX' ? 'SBX' : 'ORD');

    // Persist PaymentOrder in PostgreSQL (COM-INVARIANT-04)
    await prisma.paymentOrder.create({
      data: {
        userId,
        orderCode,
        planId: itemCodeOut,
        provider: providerUpper,
        amountVnd,
        status: 'PENDING',
      },
    });

    let checkoutUrl: string | null = null;
    let qrData: any = null;

    if (providerUpper === 'VNPAY') {
      const vnpResult = createVNPayCheckoutUrl({
        orderCode,
        amountVnd,
        orderInfo: `Thanh toan ${itemName} AI Debate Master`,
        ipAddr: ipAddr ?? '127.0.0.1',
      });
      checkoutUrl = vnpResult.checkoutUrl;
    } else if (providerUpper === 'MOMO') {
      const momoResult = await createMoMoPayment({
        orderCode,
        amountVnd,
        orderInfo: `Thanh toan ${itemName} AI Debate Master`,
      });
      checkoutUrl = momoResult.payUrl;
    } else if (providerUpper === 'SEPAY') {
      qrData = generateVietQRPayload({
        orderCode,
        amountVnd,
        orderInfo: `AIDB ${orderCode}`,
      });
      checkoutUrl = qrData.checkoutUrl;
    }

    res.json({
      success: true,
      orderCode,
      provider: providerUpper,
      itemType,
      itemCode: itemCodeOut,
      amountVnd,
      checkoutUrl,
      qrData,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[CHECKOUT_SESSION_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

// ─── GET / POST /api/v1/payments/vnpay/ipn ────────────────────────────────────

export async function handleVNPayIpn(req: Request, res: Response): Promise<void> {
  try {
    const queryParams = (req.method === 'POST' ? req.body : req.query) as Record<string, string>;
    const verification = verifyVNPayIpn(queryParams);

    if (!verification.isValid) {
      res.status(400).json({ RspCode: '97', Message: 'Checksum failed' });
      return;
    }

    if (verification.responseCode === '00') {
      const fulfillment = await fulfillPaymentOrderAtomic({
        orderCode: verification.orderCode,
        expectedProvider: 'VNPAY',
        expectedAmountVnd: verification.amountVnd,
        transactionId: verification.transactionNo,
        rawWebhookData: queryParams,
      });

      if (fulfillment.success) {
        res.json({ RspCode: '00', Message: 'Confirm Success' });
        return;
      }

      res.status(400).json({ RspCode: '01', Message: fulfillment.message });
      return;
    }

    // Payment failed on VNPay gateway side -> mark FAILED if PENDING
    await prisma.paymentOrder.updateMany({
      where: { orderCode: verification.orderCode, status: 'PENDING' },
      data: { status: 'FAILED', rawWebhookData: scrubSensitiveData(queryParams) as any },
    });

    res.json({ RspCode: '00', Message: 'Failure acknowledged' });
  } catch (error: unknown) {
    console.error('[VNPAY_IPN_ERROR]', error);
    res.status(500).json({ RspCode: '99', Message: 'Unknown error' });
  }
}

// ─── POST /api/v1/payments/momo/ipn ──────────────────────────────────────────

export async function handleMoMoIpn(req: Request, res: Response): Promise<void> {
  try {
    const verification = verifyMoMoIpn(req.body as Record<string, unknown>);

    if (!verification.isValid) {
      res.status(400).json({ resultCode: 97, message: 'Invalid signature' });
      return;
    }

    if (verification.resultCode === 0) {
      const fulfillment = await fulfillPaymentOrderAtomic({
        orderCode: verification.orderCode,
        expectedProvider: 'MOMO',
        expectedAmountVnd: verification.amountVnd,
        transactionId: verification.transId,
        rawWebhookData: req.body,
      });

      if (fulfillment.success) {
        res.json({ resultCode: 0, message: 'Success' });
        return;
      }

      res.status(400).json({ resultCode: 99, message: fulfillment.message });
      return;
    }

    // MoMo payment failure -> mark FAILED if PENDING
    await prisma.paymentOrder.updateMany({
      where: { orderCode: verification.orderCode, status: 'PENDING' },
      data: { status: 'FAILED', rawWebhookData: scrubSensitiveData(req.body) as any },
    });

    res.json({ resultCode: 0, message: 'Failure acknowledged' });
  } catch (error: unknown) {
    console.error('[MOMO_IPN_ERROR]', error);
    res.status(500).json({ resultCode: 99, message: 'Internal error' });
  }
}

// ─── POST /api/v1/payments/sepay/webhook ─────────────────────────────────────

export async function handleSePayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const verification = verifySePayWebhook(req.headers, req.body as Record<string, any>);

    if (!verification.isValid) {
      res.status(401).json({ error: verification.message });
      return;
    }

    const orderCode = verification.orderCode;
    if (!orderCode) {
      res.status(400).json({ error: 'Missing orderCode in bank transfer content' });
      return;
    }

    const fulfillment = await fulfillPaymentOrderAtomic({
      orderCode,
      expectedProvider: 'SEPAY',
      expectedAmountVnd: verification.amountVnd,
      transactionId: verification.transactionId,
      rawWebhookData: req.body,
    });

    if (fulfillment.success) {
      res.json({
        success: true,
        message: 'SePAY webhook verified and fulfilled',
        alreadyPaid: fulfillment.alreadyPaid,
      });
      return;
    }

    res.status(400).json({ error: fulfillment.message });
  } catch (error: unknown) {
    console.error('[SEPAY_WEBHOOK_ERROR]', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// ─── POST /api/v1/payments/webhook (Universal / Testing Simulation) ──────────

export async function handlePaymentWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { orderCode, provider, amountVnd, transactionId } = req.body as {
      orderCode?: string;
      provider?: string;
      amountVnd?: number;
      transactionId?: string;
    };

    if (!orderCode) {
      res.status(400).json({ error: 'Missing orderCode' });
      return;
    }

    const fulfillment = await fulfillPaymentOrderAtomic({
      orderCode,
      expectedProvider: (provider ?? 'SEPAY').toUpperCase(),
      expectedAmountVnd: amountVnd ? Number(amountVnd) : undefined,
      transactionId: transactionId || `SIM_${Date.now()}`,
      rawWebhookData: req.body,
    });

    res.json({
      success: fulfillment.success,
      alreadyPaid: fulfillment.alreadyPaid,
      message: fulfillment.message,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PAYMENT_WEBHOOK_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

// ─── GET /api/v1/payments/status/:orderCode ───────────────────────────────────

export async function getOrderStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const rawOrderCode = req.params.orderCode;
    const orderCode = Array.isArray(rawOrderCode) ? rawOrderCode[0] : String(rawOrderCode || '');

    if (!orderCode) {
      res.status(400).json({ error: 'orderCode is required' });
      return;
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { orderCode },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const isPaid = order.status === 'PAID';
    const quotaStatus = isPaid ? await getUserQuotaStatus(userId) : null;

    res.json({
      success: true,
      orderCode: order.orderCode,
      status: order.status,
      isPaid,
      amountVnd: Number(order.amountVnd),
      planId: order.planId,
      provider: order.provider,
      quotaStatus,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[GET_ORDER_STATUS_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

// ─── POST /api/v1/payments/sandbox-upgrade ───────────────────────────────────

export async function handleSandboxDirectUpgrade(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const allowSandbox =
      process.env.NODE_ENV !== 'production' ||
      process.env.ENABLE_SANDBOX === 'true' ||
      process.env.ENABLE_TEST_OTP === 'true';

    if (!allowSandbox) {
      res.status(403).json({
        error: 'Sandbox disabled',
        message: 'Sandbox instant upgrades are disabled in production environment',
      });
      return;
    }

    const userId = req.userId;
    const { planTier, itemCode } = req.body as {
      planTier?: string;
      itemCode?: string;
    };

    const targetCode = planTier || itemCode;
    const parsedVip = parseVipPassCode(targetCode);
    const parsedPack = !parsedVip ? parseCreditPackCode(targetCode) : null;
    const parsedPlan = !parsedVip && !parsedPack ? parsePlanCode(targetCode) : null;

    if (!parsedVip && !parsedPack && !parsedPlan) {
      res.status(400).json({
        error: 'Invalid item',
        message: `Unknown plan, pack, or VIP pass "${String(targetCode)}". Supported VIP: VIP_1D, VIP_3D, VIP_7D, VIP_30D. Supported packs: PACK_VOICE_15, PACK_VOICE_60, PACK_TEXT_10, PACK_ASST_5. Supported plans: BASIC_MONTHLY, BASIC_YEARLY, STANDARD_MONTHLY, STANDARD_YEARLY, PREMIUM_MONTHLY, PREMIUM_YEARLY.`,
      });
      return;
    }

    let itemCodeOut = '';
    let amountVnd = 0;

    if (parsedVip) {
      const vipDef = getVipPassDefinition(parsedVip);
      if (!vipDef) {
        res.status(400).json({ error: 'VIP pass not available' });
        return;
      }
      itemCodeOut = vipDef.code;
      amountVnd = vipDef.listPriceVnd;
    } else if (parsedPack) {
      const packDef = getCreditPackDefinition(parsedPack);
      if (!packDef) {
        res.status(400).json({
          error: 'Credit pack not available',
          message: `Credit pack "${parsedPack}" is not defined.`,
        });
        return;
      }
      itemCodeOut = packDef.code;
      amountVnd = packDef.listPriceVnd;
    } else if (parsedPlan) {
      let dbPlan = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            { id: parsedPlan },
            { id: targetCode },
          ],
          isActive: true,
        },
      });

      // Self-heal / Auto-seed plan if missing from database
      if (!dbPlan) {
        const planDef = getPlanDefinition(parsedPlan);
        if (planDef) {
          try {
            dbPlan = await prisma.subscriptionPlan.upsert({
              where: { id: planDef.code },
              update: { isActive: true },
              create: {
                id: planDef.code,
                name: planDef.displayName,
                billingCycle: planDef.durationDays > 30 ? 'yearly' : 'monthly',
                priceVnd: planDef.listPriceVnd,
                durationDays: planDef.durationDays,
                textTurnsQuota: planDef.limits.text,
                voiceMinsQuota: planDef.limits.voice,
                assistantQuota: planDef.limits.assistant,
                isActive: true,
                isPopular: planDef.code.includes('STANDARD'),
                sortOrder: planDef.code.includes('BASIC') ? 1 : planDef.code.includes('STANDARD') ? 3 : 5,
              },
            });
          } catch (upsertErr) {
            console.warn('[PLAN_SELF_HEAL_WARN]', upsertErr);
          }
        }
      }

      if (!dbPlan) {
        res.status(400).json({
          error: 'Plan not available',
          message: `Plan "${parsedPlan}" is not active or does not exist in Database.`,
        });
        return;
      }
      itemCodeOut = dbPlan.id;
      amountVnd = Number(dbPlan.priceVnd);
    }

    const orderCode = generateOrderCode('SBX');

    // Create sandbox order
    await prisma.paymentOrder.create({
      data: {
        userId,
        orderCode,
        planId: itemCodeOut,
        provider: 'SANDBOX',
        amountVnd,
        status: 'PENDING',
      },
    });

    // Fulfill atomically
    const fulfillment = await fulfillPaymentOrderAtomic({
      orderCode,
      expectedProvider: 'SANDBOX',
      expectedAmountVnd: amountVnd,
      transactionId: `SBX_${Date.now()}`,
      rawWebhookData: { simulated: true, userId, itemCode: itemCodeOut },
    });

    const updatedStatus = await getUserQuotaStatus(userId);

    res.json({
      success: fulfillment.success,
      message: parsedVip
        ? 'VIP pass provisioned instantly via Sandbox'
        : parsedPack
        ? 'Credit pack provisioned instantly via Sandbox'
        : 'Plan upgraded instantly via Sandbox',
      itemCode: itemCodeOut,
      orderCode,
      quotaStatus: updatedStatus,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[SANDBOX_UPGRADE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

// ─── GET /api/v1/payments/orders (Phase C1-A User Transaction History) ─────────

/**
 * Returns authenticated user's order history ordered newest first.
 * User-isolated, server-authoritative, strict security boundaries.
 */
export async function getUserOrders(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const [total, orders] = await Promise.all([
      prisma.paymentOrder.count({ where: { userId } }),
      prisma.paymentOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    const formatted = orders.map((o) => {
      const parsedVip = parseVipPassCode(o.planId);
      const parsedPack = !parsedVip ? parseCreditPackCode(o.planId) : null;
      const parsedPlan = !parsedVip && !parsedPack ? parsePlanCode(o.planId) : null;

      const vipDef = parsedVip ? getVipPassDefinition(parsedVip) : null;
      const packDef = parsedPack ? getCreditPackDefinition(parsedPack) : null;
      const planDef = parsedPlan ? getPlanDefinition(parsedPlan) : null;

      const itemName = vipDef?.displayName || packDef?.displayName || planDef?.displayName || o.planId;
      const itemType: 'PLAN' | 'CREDIT_PACK' | 'VIP' = vipDef ? 'VIP' : packDef ? 'CREDIT_PACK' : 'PLAN';

      return {
        id: o.id,
        orderCode: o.orderCode,
        itemCode: o.planId,
        itemName,
        itemType,
        amountVnd: Number(o.amountVnd),
        provider: o.provider,
        status: o.status,
        transactionId: o.transactionId,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      };
    });

    res.json({
      success: true,
      total,
      orders: formatted,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[GET_USER_ORDERS_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}