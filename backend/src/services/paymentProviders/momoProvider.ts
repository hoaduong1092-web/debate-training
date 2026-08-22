/**
 * MoMo Payment Gateway Provider Adapter
 *
 * Implements:
 *   - MoMo Payment Gateway V2 raw signature string construction & HMAC-SHA256 generation.
 *   - Secure Webhook / IPN cryptographic verification with constant-time comparison.
 *
 * Spec: docs/16_PLAN_QUOTA_BUSINESS_SPEC.md (v1.1.0), docs/02_DOMAIN_SPEC.md §9
 * Zero Live AI calls.
 */

import crypto from 'crypto';

export interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
}

export interface CreateMoMoPaymentInput {
  orderCode: string;
  amountVnd: number;
  orderInfo: string;
  extraData?: string;
  requestId?: string;
  redirectUrl?: string;
  ipnUrl?: string;
}

export interface MoMoCheckoutResult {
  payUrl: string;
  qrCodeUrl: string;
  deeplink: string;
  rawSignature: string;
  signature: string;
  orderCode: string;
  amountVnd: number;
  requestId: string;
}

export interface MoMoIpnVerificationResult {
  isValid: boolean;
  orderCode: string;
  amountVnd: number;
  resultCode: number;
  transId: string;
  message: string;
  payType?: string;
  responseTime?: number;
}

export function getMoMoConfig(): MoMoConfig {
  return {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO_DEMO_PARTNER',
    accessKey: process.env.MOMO_ACCESS_KEY || 'MOMO_DEMO_ACCESS_KEY',
    secretKey: process.env.MOMO_SECRET_KEY || 'MOMO_DEMO_SECRET_KEY_256',
    endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:5173/profile?payment=momo',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3000/api/v1/payments/momo/ipn',
  };
}

export function calculateMoMoHmacSha256(rawSignature: string, secretKey: string): string {
  return crypto.createHmac('sha256', secretKey).update(Buffer.from(rawSignature, 'utf-8')).digest('hex');
}

export function buildMoMoCreateSignature(params: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}): string {
  return `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}&requestId=${params.requestId}&requestType=${params.requestType}`;
}

export function buildMoMoIpnSignature(params: {
  accessKey: string;
  amount: number | string;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: number | string;
  resultCode: number | string;
  transId: number | string;
}): string {
  return `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${params.orderType}&partnerCode=${params.partnerCode}&payType=${params.payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${params.transId}`;
}

export function createMoMoPayment(
  input: CreateMoMoPaymentInput,
  configOverride?: Partial<MoMoConfig>,
): MoMoCheckoutResult {
  const config = { ...getMoMoConfig(), ...configOverride };
  const requestId = input.requestId || `${input.orderCode}_${Date.now()}`;
  const extraData = input.extraData || '';
  const requestType = 'captureWallet';
  const redirectUrl = input.redirectUrl || config.redirectUrl;
  const ipnUrl = input.ipnUrl || config.ipnUrl;

  const rawSignature = buildMoMoCreateSignature({
    accessKey: config.accessKey,
    amount: input.amountVnd,
    extraData,
    ipnUrl,
    orderId: input.orderCode,
    orderInfo: input.orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl,
    requestId,
    requestType,
  });

  const signature = calculateMoMoHmacSha256(rawSignature, config.secretKey);

  const payUrl = `${config.endpoint}?partnerCode=${config.partnerCode}&orderId=${input.orderCode}&amount=${input.amountVnd}&signature=${signature}`;
  const qrCodeUrl = `2|99|0987654321|AI DEBATE MASTER|ai@debatemaster.vn|0|0|${input.amountVnd}|${input.orderCode}|transfer_p2p`;
  const deeplink = `momo://app?action=payWithApp&orderId=${input.orderCode}&amount=${input.amountVnd}`;

  return {
    payUrl,
    qrCodeUrl,
    deeplink,
    rawSignature,
    signature,
    orderCode: input.orderCode,
    amountVnd: input.amountVnd,
    requestId,
  };
}

export function verifyMoMoIpn(
  body: Record<string, any>,
  configOverride?: Partial<MoMoConfig>,
): MoMoIpnVerificationResult {
  const config = { ...getMoMoConfig(), ...configOverride };

  const orderCode = String(body.orderId || '');
  const amountVnd = Number(body.amount || 0);
  const signature = String(body.signature || '');
  const resultCode = Number(body.resultCode !== undefined ? body.resultCode : -1);
  const transId = String(body.transId || '');
  const message = String(body.message || '');

  if (!orderCode || !signature) {
    return {
      isValid: false,
      orderCode,
      amountVnd,
      resultCode,
      transId,
      message: 'Missing orderId or signature in MoMo IPN payload',
    };
  }

  const rawIpnSig = buildMoMoIpnSignature({
    accessKey: config.accessKey,
    amount: body.amount,
    extraData: body.extraData ?? '',
    message: body.message ?? '',
    orderId: body.orderId,
    orderInfo: body.orderInfo ?? '',
    orderType: body.orderType ?? 'momo_wallet',
    partnerCode: body.partnerCode ?? config.partnerCode,
    payType: body.payType ?? 'qr',
    requestId: body.requestId ?? '',
    responseTime: body.responseTime ?? '',
    resultCode: body.resultCode,
    transId: body.transId ?? '',
  });

  const expectedSignature = calculateMoMoHmacSha256(rawIpnSig, config.secretKey);

  let isSignatureValid = false;
  try {
    const sigBuf = Buffer.from(signature.toLowerCase(), 'utf-8');
    const expectedBuf = Buffer.from(expectedSignature.toLowerCase(), 'utf-8');
    if (sigBuf.length === expectedBuf.length) {
      isSignatureValid = crypto.timingSafeEqual(sigBuf, expectedBuf);
    }
  } catch {
    isSignatureValid = false;
  }

  if (!isSignatureValid) {
    return {
      isValid: false,
      orderCode,
      amountVnd,
      resultCode,
      transId,
      message: 'Invalid MoMo cryptographic signature mismatch',
    };
  }

  return {
    isValid: true,
    orderCode,
    amountVnd,
    resultCode,
    transId,
    message: resultCode === 0 ? 'Success' : `MoMo error resultCode=${resultCode}: ${message}`,
    payType: body.payType,
    responseTime: body.responseTime ? Number(body.responseTime) : undefined,
  };
}