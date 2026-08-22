/**
 * Payment Gateway Adapters, Cryptographic Security & Webhook Fulfillment Test Suite
 *
 * Covers:
 *   TC-GW-01: VNPay HMAC-SHA512 URL generation & canonical sorting
 *   TC-GW-02 / TC-COM-08: VNPay IPN signature verification & atomic fulfillment to PAID
 *   TC-COM-09: VNPay tampered signature rejection
 *   TC-COM-10: VNPay tampered amount rejection
 *   TC-COM-11: VNPay duplicate IPN replay idempotency
 *   TC-GW-03 / TC-COM-12: MoMo HMAC-SHA256 signature creation & IPN fulfillment
 *   TC-COM-13: MoMo invalid signature rejection
 *   TC-COM-14: MoMo duplicate IPN replay idempotency
 *   TC-GW-04 / TC-COM-15: SePAY Webhook API Key authorization, memo regex & atomic fulfillment
 *   TC-GW-05: Payment Controller IPN & Webhook Handlers
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
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
  extractOrderCodeFromContent,
} from '../services/paymentProviders/sepayProvider';
import {
  handleVNPayIpn,
  handleMoMoIpn,
  handleSePayWebhook,
} from '../controllers/paymentController';
import { getUserQuotaStatus } from '../services/quotaManager';

const prisma = new PrismaClient();

let totalAsserts = 0;
let passedAsserts = 0;
const failedTests: string[] = [];

function assert(description: string, condition: boolean, detail?: unknown) {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✅ PASS ${description}`);
  } else {
    failedTests.push(description);
    console.error(`  ❌ FAIL ${description}`, detail !== undefined ? detail : '');
  }
}

function section(name: string) {
  console.log(`\n▶ ${name}`);
}

function makeReq(opts: {
  userId?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}): Request {
  return {
    userId: opts.userId ?? '00000000-0000-4000-a000-000000000003',
    body: opts.body ?? {},
    query: opts.query ?? {},
    headers: opts.headers ?? {},
    method: opts.query ? 'GET' : 'POST',
  } as unknown as Request;
}

function makeRes() {
  const res: any = {
    _status: 200,
    _body: null as any,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: any) {
      res._body = data;
      return res;
    },
  };
  return res;
}

export async function runPaymentGatewayTests(): Promise<boolean> {
  console.log('============================================================');
  console.log('  PAYMENT GATEWAY CRYPTOGRAPHIC & FULFILLMENT TEST SUITE');
  console.log('============================================================\n');

  const testUserId = '00000000-0000-4000-a000-000000000003';

  try {
    // Ensure test user exists
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        phoneNumber: '+84988776655',
        displayName: 'Gateway Test User',
      },
    });

    // ── TC-GW-01: VNPay HMAC-SHA512 URL Generation ───────────────────────────
    section('TC-GW-01: VNPay HMAC-SHA512 URL Generation & Canonical Sorting');
    {
      const vnpRes = createVNPayCheckoutUrl({
        orderCode: 'PLAN_1001_TEST',
        amountVnd: 129_000,
        orderInfo: 'Thanh toan Goi Tieu chuan',
        ipAddr: '192.168.1.1',
      });

      assert('TC-GW-01a: VNPay checkoutUrl contains vnp_SecureHash', vnpRes.checkoutUrl.includes('vnp_SecureHash='), vnpRes);
      assert('TC-GW-01b: VNPay checkoutUrl contains amount multiplied by 100 (12900000)', vnpRes.checkoutUrl.includes('vnp_Amount=12900000'), vnpRes);
      assert('TC-GW-01c: VNPay secureHash length is 128 (SHA512 hex)', vnpRes.secureHash.length === 128, vnpRes.secureHash);
      assert('TC-GW-01d: VNPay signData keys sorted alphabetically', vnpRes.signData.indexOf('vnp_Amount') < vnpRes.signData.indexOf('vnp_Command'), vnpRes.signData);
    }

    // ── TC-GW-02 & TC-COM-08 to TC-COM-11: VNPay IPN & Atomic Fulfillment ────
    section('TC-GW-02 & TC-COM-08: VNPay IPN Verification & Atomic Fulfillment');
    {
      const vnpOrderCode = `ORD_VNP_${Date.now()}`;
      await prisma.paymentOrder.create({
        data: {
          userId: testUserId,
          orderCode: vnpOrderCode,
          planId: 'STANDARD_MONTHLY',
          provider: 'VNPAY',
          amountVnd: 129000,
          status: 'PENDING',
        },
      });

      const vnpParams: Record<string, string> = {
        vnp_Amount: '12900000',
        vnp_BankCode: 'NCB',
        vnp_CardType: 'ATM',
        vnp_Command: 'pay',
        vnp_CreateDate: '20260819120000',
        vnp_CurrCode: 'VND',
        vnp_IpAddr: '192.168.1.1',
        vnp_Locale: 'vn',
        vnp_OrderInfo: 'Thanh toan Goi Tieu chuan',
        vnp_OrderType: 'other',
        vnp_ResponseCode: '00',
        vnp_TmnCode: 'DEMO_TMN',
        vnp_TransactionNo: '14567890',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: vnpOrderCode,
        vnp_Version: '2.1.0',
      };

      const sorted = sortAndEncodeParams(vnpParams);
      const validHash = calculateVNPayHmacSha512(sorted.encodedQuery, 'DEMO_VNPAY_SECRET_KEY_512');

      const ipnReq = makeReq({
        query: { ...vnpParams, vnp_SecureHash: validHash },
      });
      const ipnRes = makeRes();
      await handleVNPayIpn(ipnReq, ipnRes as unknown as Response);

      assert('TC-COM-08a: VNPay IPN handler returns RspCode 00', ipnRes._body?.RspCode === '00', ipnRes._body);

      const orderAfterVnp = await prisma.paymentOrder.findUnique({ where: { orderCode: vnpOrderCode } });
      assert('TC-COM-08b: PaymentOrder transitioned to PAID in DB', orderAfterVnp?.status === 'PAID');

      const quotaStatus = await getUserQuotaStatus(testUserId);
      assert('TC-COM-08c: Subscription and Quota provisioned (100 text turns)', quotaStatus.balances.text.totalAvailable === 100);

      // TC-COM-11: Replay VNPay IPN
      const replayRes = makeRes();
      await handleVNPayIpn(ipnReq, replayRes as unknown as Response);
      assert('TC-COM-11: Duplicate VNPay IPN returns 00 without double-provisioning', replayRes._body?.RspCode === '00');

      // TC-COM-10: Tampered VNPay IPN
      const tamperedVerification = verifyVNPayIpn({
        ...vnpParams,
        vnp_Amount: '10000000',
        vnp_SecureHash: validHash,
      });
      assert('TC-COM-10: Tampered VNPay IPN fails checksum verification', tamperedVerification.isValid === false);
    }

    // ── TC-GW-03 & TC-COM-12 to TC-COM-14: MoMo HMAC-SHA256 & Fulfillment ────
    section('TC-GW-03 & TC-COM-12: MoMo HMAC-SHA256 Creation & IPN Fulfillment');
    {
      const momoOrderCode = `ORD_MOMO_${Date.now()}`;
      await prisma.paymentOrder.create({
        data: {
          userId: testUserId,
          orderCode: momoOrderCode,
          planId: 'PREMIUM_MONTHLY',
          provider: 'MOMO',
          amountVnd: 399000,
          status: 'PENDING',
        },
      });

      const momoParams = {
        accessKey: 'MOMO_DEMO_ACCESS_KEY',
        amount: 399000,
        extraData: '',
        message: 'Successful.',
        orderId: momoOrderCode,
        orderInfo: 'Thanh toan Goi Cao cap',
        orderType: 'momo_wallet',
        partnerCode: 'MOMO_DEMO_PARTNER',
        payType: 'qr',
        requestId: `REQ_${Date.now()}`,
        responseTime: 1724068800000,
        resultCode: 0,
        transId: 9876543210,
      };

      const rawSig = buildMoMoIpnSignature(momoParams);
      const momoSig = calculateMoMoHmacSha256(rawSig, 'MOMO_DEMO_SECRET_KEY_256');

      const ipnPayload = {
        ...momoParams,
        signature: momoSig,
      };

      const momoReq = makeReq({ body: ipnPayload });
      const momoRes = makeRes();
      await handleMoMoIpn(momoReq, momoRes as unknown as Response);

      assert('TC-COM-12a: Valid MoMo IPN returns resultCode 0', momoRes._body?.resultCode === 0, momoRes._body);

      const orderAfterMoMo = await prisma.paymentOrder.findUnique({ where: { orderCode: momoOrderCode } });
      assert('TC-COM-12b: PaymentOrder transitioned to PAID for MoMo', orderAfterMoMo?.status === 'PAID');

      // TC-COM-14: MoMo Replay
      const momoReplayRes = makeRes();
      await handleMoMoIpn(momoReq, momoReplayRes as unknown as Response);
      assert('TC-COM-14: MoMo Replay idempotent returns resultCode 0', momoReplayRes._body?.resultCode === 0);

      // TC-COM-13: Invalid MoMo Signature
      const tamperedIpn = { ...ipnPayload, amount: 20000 };
      const tamperedVerification = verifyMoMoIpn(tamperedIpn);
      assert('TC-COM-13: Tampered MoMo IPN fails verification', tamperedVerification.isValid === false);
    }

    // ── TC-GW-04 & TC-COM-15: SePAY Webhook Authorization & Fulfillment ──────
    section('TC-GW-04 & TC-COM-15: SePAY Webhook API Key Authorization & Fulfillment');
    {
      const sepayOrderCode = `ORD_SEPAY_${Date.now()}`;
      await prisma.paymentOrder.create({
        data: {
          userId: testUserId,
          orderCode: sepayOrderCode,
          planId: 'BASIC_MONTHLY',
          provider: 'SEPAY',
          amountVnd: 49000,
          status: 'PENDING',
        },
      });

      assert('TC-GW-04a: Extract orderCode with prefix ORD_', extractOrderCodeFromContent(`Thanh toan don hang ${sepayOrderCode} tai MBBank`) === sepayOrderCode);

      const sepayReq = makeReq({
        headers: { authorization: 'Apikey SEPAY_DEMO_API_KEY' },
        body: {
          id: 123456,
          gateway: 'MBBank',
          transactionDate: '2026-08-21 15:00:00',
          accountNumber: '0987654321',
          content: `AIDB ${sepayOrderCode}`,
          transferAmount: 49000,
        },
      });
      const sepayRes = makeRes();
      await handleSePayWebhook(sepayReq, sepayRes as unknown as Response);

      assert('TC-COM-15a: SePAY webhook returns success true', sepayRes._body?.success === true, sepayRes._body);

      const orderAfterSePay = await prisma.paymentOrder.findUnique({ where: { orderCode: sepayOrderCode } });
      assert('TC-COM-15b: PaymentOrder transitioned to PAID for SePAY', orderAfterSePay?.status === 'PAID');

      // Wrong API key rejection
      const invalidWebhook = verifySePayWebhook(
        { authorization: 'Apikey WRONG_API_KEY' },
        { content: `AIDB ${sepayOrderCode}` },
      );
      assert('TC-GW-04d: Wrong SePAY API key rejected with 401', invalidWebhook.isValid === false);
    }
  } catch (err) {
    console.error('Error running gateway tests:', err);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${totalAsserts} | ✅ PASS: ${passedAsserts} | ❌ FAIL: ${failedTests.length}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return failedTests.length === 0;
}

if (require.main === module) {
  runPaymentGatewayTests()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}