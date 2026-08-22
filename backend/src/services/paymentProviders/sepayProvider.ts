/**
 * SePAY / VietQR Bank Transfer Provider Adapter
 *
 * Implements:
 *   - VietQR Quick Transfer Payload & QR Image generation.
 *   - SePAY Webhook API Key Authorization Header verification (constant-time).
 *   - Automatic orderCode parsing from bank transfer description/memo.
 *
 * Spec: docs/16_PLAN_QUOTA_BUSINESS_SPEC.md (v1.1.0), docs/02_DOMAIN_SPEC.md §9
 * Zero Live AI calls.
 */

import crypto from 'crypto';

export interface SePayConfig {
  apiKey: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
}

export interface CreateVietQRInput {
  orderCode: string;
  amountVnd: number;
  orderInfo?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

export interface VietQRCheckoutResult {
  qrImageUrl: string;
  qrPayload: string;
  checkoutUrl: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  orderCode: string;
  amountVnd: number;
  transferMemo: string;
}

export interface SePayWebhookVerificationResult {
  isValid: boolean;
  orderCode: string | null;
  amountVnd: number;
  transactionId: string;
  message: string;
  bankBrandName?: string;
  transactionDate?: string;
}

export function getSePayConfig(): SePayConfig {
  return {
    apiKey: process.env.SEPAY_API_KEY || 'SEPAY_DEMO_API_KEY',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '0987654321',
    bankName: process.env.SEPAY_BANK_NAME || 'MBBank',
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'AI DEBATE MASTER',
  };
}

export function generateVietQRPayload(
  input: CreateVietQRInput,
  configOverride?: Partial<SePayConfig>,
): VietQRCheckoutResult {
  const config = { ...getSePayConfig(), ...configOverride };
  const bankName = input.bankName || config.bankName;
  const accountNumber = input.accountNumber || config.accountNumber;
  const accountName = input.accountName || config.accountName;
  const transferMemo = input.orderCode;

  const qrImageUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(accountNumber)}&bank=${encodeURIComponent(bankName)}&amount=${input.amountVnd}&des=${encodeURIComponent(transferMemo)}`;
  const checkoutUrl = `/transfer?orderCode=${input.orderCode}&amount=${input.amountVnd}&bank=${encodeURIComponent(bankName)}&acc=${encodeURIComponent(accountNumber)}`;
  const qrPayload = `00020101021238540010A000000727012400069704220110${transferMemo}5303704540${input.amountVnd}5802VN62150811${transferMemo}6304`;

  return {
    qrImageUrl,
    qrPayload,
    checkoutUrl,
    bankName,
    accountNumber,
    accountName,
    orderCode: input.orderCode,
    amountVnd: input.amountVnd,
    transferMemo,
  };
}

export function extractOrderCodeFromContent(content: string): string | null {
  if (!content) return null;
  const match = content.match(/(?:ORD|PLAN|BOOST|SBX)_[A-Z0-9_]+/i);
  return match ? match[0].toUpperCase() : null;
}

export function verifySePayWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, any>,
  configOverride?: Partial<SePayConfig>,
): SePayWebhookVerificationResult {
  const config = { ...getSePayConfig(), ...configOverride };

  const rawAuth = headers['authorization'] || headers['Authorization'] || headers['x-api-key'] || '';
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;

  let incomingToken = '';
  if (authHeader.startsWith('Apikey ') || authHeader.startsWith('apikey ')) {
    incomingToken = authHeader.slice(7).trim();
  } else if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
    incomingToken = authHeader.slice(7).trim();
  } else {
    incomingToken = authHeader.trim();
  }

  let isApiKeyValid = false;
  try {
    const tokenBuf = Buffer.from(incomingToken, 'utf-8');
    const expectedBuf = Buffer.from(config.apiKey, 'utf-8');
    if (tokenBuf.length === expectedBuf.length && tokenBuf.length > 0) {
      isApiKeyValid = crypto.timingSafeEqual(tokenBuf, expectedBuf);
    }
  } catch {
    isApiKeyValid = false;
  }

  const transactionId = String(body.id || body.transactionId || `TXN_${Date.now()}`);
  const amountIn = Number(body.transferAmount ?? body.amount_in ?? body.amount ?? 0);
  const content = String(body.content || body.description || body.orderCode || '');
  const orderCode = extractOrderCodeFromContent(content) || (body.orderCode ? String(body.orderCode).toUpperCase() : null);

  if (!isApiKeyValid) {
    return {
      isValid: false,
      orderCode,
      amountVnd: amountIn,
      transactionId,
      message: 'Invalid SePAY Webhook API Key authorization header',
    };
  }

  if (!orderCode) {
    return {
      isValid: false,
      orderCode: null,
      amountVnd: amountIn,
      transactionId,
      message: 'Could not extract valid orderCode from bank transfer content',
    };
  }

  return {
    isValid: true,
    orderCode,
    amountVnd: amountIn,
    transactionId,
    bankBrandName: body.bank_brand_name || body.gateway,
    transactionDate: body.transaction_date,
    message: 'SePAY Webhook verified successfully',
  };
}