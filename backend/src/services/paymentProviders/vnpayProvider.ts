/**
 * VNPay Payment Gateway Provider Adapter
 *
 * Implements:
 *   - VNPay v2.1.0 canonical query string sorting & HMAC-SHA512 signature generation.
 *   - Secure IPN / Return URL cryptographic checksum verification with constant-time comparison.
 *
 * Spec: docs/16_PLAN_QUOTA_BUSINESS_SPEC.md (v1.1.0), docs/02_DOMAIN_SPEC.md §9
 * Zero Live AI calls.
 */

import crypto from 'crypto';

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  returnUrl: string;
  ipnUrl: string;
}

export interface CreateVNPayUrlInput {
  orderCode: string;
  amountVnd: number;
  orderInfo: string;
  ipAddr?: string;
  locale?: 'vn' | 'en';
  bankCode?: string;
  returnUrl?: string;
}

export interface VNPayCheckoutResult {
  checkoutUrl: string;
  qrPayload: string;
  signData: string;
  secureHash: string;
  orderCode: string;
  amountVnd: number;
}

export interface VNPayIpnVerificationResult {
  isValid: boolean;
  orderCode: string;
  amountVnd: number;
  responseCode: string;
  transactionNo: string;
  bankCode?: string;
  payDate?: string;
  message: string;
}

export function getVNPayConfig(): VNPayConfig {
  return {
    tmnCode: process.env.VNPAY_TMN_CODE || 'DEMO_TMN',
    hashSecret: process.env.VNPAY_HASH_SECRET || 'DEMO_VNPAY_SECRET_KEY_512',
    vnpUrl: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5173/profile?payment=vnpay',
    ipnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:3000/api/v1/payments/vnpay/ipn',
  };
}

export function formatVNPayDate(d: Date = new Date()): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const vnTime = new Date(utc + 7 * 3600000);

  const YYYY = vnTime.getFullYear();
  const MM = String(vnTime.getMonth() + 1).padStart(2, '0');
  const DD = String(vnTime.getDate()).padStart(2, '0');
  const HH = String(vnTime.getHours()).padStart(2, '0');
  const mm = String(vnTime.getMinutes()).padStart(2, '0');
  const ss = String(vnTime.getSeconds()).padStart(2, '0');

  return `${YYYY}${MM}${DD}${HH}${mm}${ss}`;
}

export function sortAndEncodeParams(params: Record<string, string | number | undefined>): {
  encodedQuery: string;
  sortedParams: Record<string, string>;
} {
  const sortedKeys = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort();

  const sortedParams: Record<string, string> = {};
  const queryParts: string[] = [];

  for (const key of sortedKeys) {
    const value = String(params[key]);
    sortedParams[key] = value;
    queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/%20/g, '+')}`);
  }

  return {
    encodedQuery: queryParts.join('&'),
    sortedParams,
  };
}

export function calculateVNPayHmacSha512(data: string, secretKey: string): string {
  return crypto.createHmac('sha512', secretKey).update(Buffer.from(data, 'utf-8')).digest('hex');
}

export function createVNPayCheckoutUrl(
  input: CreateVNPayUrlInput,
  configOverride?: Partial<VNPayConfig>,
): VNPayCheckoutResult {
  const config = { ...getVNPayConfig(), ...configOverride };
  const createDate = formatVNPayDate(new Date());
  const vnpAmount = Math.round(input.amountVnd * 100);

  const rawParams: Record<string, string | number | undefined> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Amount: vnpAmount,
    vnp_CreateDate: createDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: input.ipAddr || '127.0.0.1',
    vnp_Locale: input.locale || 'vn',
    vnp_OrderInfo: input.orderInfo,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: input.returnUrl || config.returnUrl,
    vnp_TxnRef: input.orderCode,
  };

  if (input.bankCode) {
    rawParams.vnp_BankCode = input.bankCode;
  }

  const { encodedQuery } = sortAndEncodeParams(rawParams);
  const secureHash = calculateVNPayHmacSha512(encodedQuery, config.hashSecret);
  const checkoutUrl = `${config.vnpUrl}?${encodedQuery}&vnp_SecureHash=${secureHash}`;
  const qrPayload = `00020101021238540010A000000727012400069704220110${input.orderCode}5303704540${input.amountVnd}5802VN62150811${input.orderCode}6304`;

  return {
    checkoutUrl,
    qrPayload,
    signData: encodedQuery,
    secureHash,
    orderCode: input.orderCode,
    amountVnd: input.amountVnd,
  };
}

export function verifyVNPayIpn(
  queryParams: Record<string, string | number | undefined>,
  configOverride?: Partial<VNPayConfig>,
): VNPayIpnVerificationResult {
  const config = { ...getVNPayConfig(), ...configOverride };

  const secureHash = queryParams['vnp_SecureHash'] ? String(queryParams['vnp_SecureHash']) : '';
  const orderCode = queryParams['vnp_TxnRef'] ? String(queryParams['vnp_TxnRef']) : '';
  const rawAmount = queryParams['vnp_Amount'] ? Number(queryParams['vnp_Amount']) : 0;
  const responseCode = queryParams['vnp_ResponseCode'] ? String(queryParams['vnp_ResponseCode']) : '';
  const transactionNo = queryParams['vnp_TransactionNo'] ? String(queryParams['vnp_TransactionNo']) : '';
  const bankCode = queryParams['vnp_BankCode'] ? String(queryParams['vnp_BankCode']) : undefined;
  const payDate = queryParams['vnp_PayDate'] ? String(queryParams['vnp_PayDate']) : undefined;

  const amountVnd = rawAmount / 100;

  if (!secureHash || !orderCode) {
    return {
      isValid: false,
      orderCode,
      amountVnd,
      responseCode,
      transactionNo,
      message: 'Missing vnp_SecureHash or vnp_TxnRef in IPN parameters',
    };
  }

  const filteredParams: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(queryParams)) {
    if (k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') {
      filteredParams[k] = v;
    }
  }

  const { encodedQuery } = sortAndEncodeParams(filteredParams);
  const expectedHash = calculateVNPayHmacSha512(encodedQuery, config.hashSecret);

  let isSignatureValid = false;
  try {
    const hashBuf = Buffer.from(secureHash.toLowerCase(), 'utf-8');
    const expectedBuf = Buffer.from(expectedHash.toLowerCase(), 'utf-8');
    if (hashBuf.length === expectedBuf.length) {
      isSignatureValid = crypto.timingSafeEqual(hashBuf, expectedBuf);
    }
  } catch {
    isSignatureValid = false;
  }

  if (!isSignatureValid) {
    return {
      isValid: false,
      orderCode,
      amountVnd,
      responseCode,
      transactionNo,
      message: 'Invalid VNPay cryptographic signature (vnp_SecureHash mismatch)',
    };
  }

  return {
    isValid: true,
    orderCode,
    amountVnd,
    responseCode,
    transactionNo,
    bankCode,
    payDate,
    message: responseCode === '00' ? 'Success' : `VNPay returned code ${responseCode}`,
  };
}