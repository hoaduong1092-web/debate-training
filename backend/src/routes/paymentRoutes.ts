/**
 * Payment & Subscription Upgrade Routes
 *
 * Mounts endpoints:
 *   POST     /api/v1/payments/checkout        — Create checkout session & PaymentOrder (VNPAY, MOMO, SEPAY, SANDBOX)
 *   GET/POST /api/v1/payments/vnpay/ipn       — VNPay HMAC-SHA512 IPN webhook callback
 *   POST     /api/v1/payments/momo/ipn        — MoMo HMAC-SHA256 IPN webhook callback
 *   POST     /api/v1/payments/sepay/webhook   — SePAY VietQR API Key authenticated webhook
 *   POST     /api/v1/payments/webhook         — Universal / Simulated webhook handler
 *   POST     /api/v1/payments/sandbox-upgrade — Instant sandbox top-up (dev/test only)
 *
 * STRICT NO-LLM & COST SAFETY:
 *   Zero LLM API calls. Zero quota deduction.
 *   All operations are pure DB/cryptographic billing logic.
 *
 * Spec: docs/16_PLAN_QUOTA_BUSINESS_SPEC.md (v1.1.0), docs/02_DOMAIN_SPEC.md §9
 */

import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createCheckoutSession,
  getUserOrders,
  getOrderStatus,
  handleVNPayIpn,
  handleMoMoIpn,
  handleSePayWebhook,
  handlePaymentWebhook,
  handleSandboxDirectUpgrade,
} from '../controllers/paymentController';

const router = Router();

// GET /api/v1/payments/orders (Phase C1-A User Transaction History)
router.get('/orders', authenticate, getUserOrders as unknown as RequestHandler);

// GET /api/v1/payments/status/:orderCode (Phase C1-A Live Order Status Polling)
router.get('/status/:orderCode', authenticate, getOrderStatus as unknown as RequestHandler);

// POST /api/v1/payments/checkout
// Authenticated endpoint to initiate a payment order (Plan, Credit Pack, or VIP Pass)
router.post('/checkout', authenticate, createCheckoutSession as unknown as RequestHandler);

// GET & POST /api/v1/payments/vnpay/ipn
// VNPay server IPN callback endpoint (HMAC-SHA512 checksum verified)
router.get('/vnpay/ipn', handleVNPayIpn as unknown as RequestHandler);
router.post('/vnpay/ipn', handleVNPayIpn as unknown as RequestHandler);

// POST /api/v1/payments/momo/ipn
// MoMo server IPN callback endpoint (HMAC-SHA256 signature verified)
router.post('/momo/ipn', handleMoMoIpn as unknown as RequestHandler);

// POST /api/v1/payments/sepay/webhook
// SePAY VietQR bank transfer notification endpoint (API Key authenticated)
router.post('/sepay/webhook', handleSePayWebhook as unknown as RequestHandler);

// POST /api/v1/payments/webhook
// Universal / simulated webhook endpoint (backward-compatible & testing)
router.post('/webhook', handlePaymentWebhook as unknown as RequestHandler);

// POST /api/v1/payments/sandbox-upgrade
// Authenticated sandbox activation endpoint
router.post('/sandbox-upgrade', authenticate, handleSandboxDirectUpgrade as unknown as RequestHandler);

export default router;
