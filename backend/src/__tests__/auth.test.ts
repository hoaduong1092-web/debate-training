/**
 * TC-AUTH: Authentication & SMS OTP Security Test Suite (v15.0.0)
 *
 * Covers:
 *   TC-AUTH-01: E.164 Phone Normalization & Validation (0901234567, 0912345678)
 *   TC-AUTH-02: HMAC-SHA256 OTP Generation & Verification (Test Mode devOtp)
 *   TC-AUTH-03: 60s Request Cooldown
 *   TC-AUTH-04: Max 5 Incorrect Attempts Lockout & Attempt Counter Decrement
 *   TC-AUTH-05: Max 5 Daily OTP Cap
 *   TC-AUTH-06: AuthController HTTP Handlers (requestOtp & verifyOtp with Full User Payload)
 *   TC-AUTH-07: Production Mode Security & SMS Provider Verification
 *   TC-AUTH-08: Test Auth Mode Override in Production (ENABLE_TEST_OTP=true)
 *
 * Zero Live AI calls. 100% Offline.
 */

import { PhoneValidator } from '../utils/phoneValidator';
import { OtpService } from '../services/otpService';
import { AuthController } from '../controllers/authController';
import { redisClient } from '../infrastructure/redis/redisClient';
import { redisKeys } from '../infrastructure/redis/redisKeys';
import type { Request, Response } from 'express';

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

function makeRes() {
  const res: any = {
    _status: 200,
    _json: null as any,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: any) {
      res._json = data;
      return res;
    },
  };
  return res;
}

export async function runAuthTests(): Promise<boolean> {
  console.log('============================================================');
  console.log('  AUTH FLOW & SMS OTP TEST SUITE (v15.0.0)');
  console.log('============================================================\n');

  // Save original env vars
  const origNodeEnv = process.env.NODE_ENV;
  const origEnableTestOtp = process.env.ENABLE_TEST_OTP;
  const origTestAuthMode = process.env.TEST_AUTH_MODE;
  const origSmsProvider = process.env.SMS_PROVIDER;
  const origDevOtp = process.env.DEV_OTP;

  try {
    // Ensure test mode by default during tests
    process.env.NODE_ENV = 'test';
    delete process.env.ENABLE_TEST_OTP;
    delete process.env.TEST_AUTH_MODE;
    delete process.env.SMS_PROVIDER;

    // ── TC-AUTH-01: Phone Normalizer ───────────────────────────────────────────
    section('TC-AUTH-01: E.164 Phone Normalization & Validation');
    {
      assert('Normalize 0901234567 to +84901234567', PhoneValidator.normalizeE164('0901234567') === '+84901234567');
      assert('Normalize 0912345678 to +84912345678', PhoneValidator.normalizeE164('0912345678') === '+84912345678');
      assert('Normalize 84901234567 to +84901234567', PhoneValidator.normalizeE164('84901234567') === '+84901234567');
      assert('Normalize +84901234567 to +84901234567', PhoneValidator.normalizeE164('+84901234567') === '+84901234567');
      assert('Normalize formatted phone (090) 123-4567 to +84901234567', PhoneValidator.normalizeE164('(090) 123-4567') === '+84901234567');
      assert('Normalize international US +14155552671', PhoneValidator.normalizeE164('+14155552671') === '+14155552671');
      assert('Reject invalid string', PhoneValidator.normalizeE164('invalid-phone') === null);
      assert('Reject empty string', PhoneValidator.normalizeE164('') === null);
    }

    // ── TC-AUTH-02: OTP Generation & Verification in Test Mode ───────────────────
    section('TC-AUTH-02: HMAC-SHA256 OTP Generation & Verification (Test Mode)');
    {
      await OtpService.clearStore();
      const phone = '+84909999001';

      const gen = await OtpService.generateOtp(phone);
      assert('Generate OTP succeeds in test mode', gen.success === true);
      assert('Generate OTP exposes devOtp in test mode', gen.devOtp === '123456');

      const wrongVerify = await OtpService.verifyOtp(phone, '000000');
      assert('Verify with wrong OTP fails', wrongVerify.success === false && wrongVerify.code === 'INVALID_OTP');
      assert('Verify with wrong OTP returns 4 remaining attempts', wrongVerify.remainingAttempts === 4);

      const correctVerify = await OtpService.verifyOtp(phone, gen.devOtp || '123456');
      assert('Verify with correct OTP succeeds', correctVerify.success === true && correctVerify.code === 'SUCCESS');

      const reuseVerify = await OtpService.verifyOtp(phone, gen.devOtp || '123456');
      assert('Re-verifying consumed OTP fails (single use)', reuseVerify.success === false && reuseVerify.code === 'EXPIRED');
    }

    // ── TC-AUTH-03: 60s Request Cooldown ───────────────────────────────────────
    section('TC-AUTH-03: 60-Second Request Cooldown');
    {
      await OtpService.clearStore();
      const phone = '+84909999002';

      const gen1 = await OtpService.generateOtp(phone);
      assert('First OTP request succeeds', gen1.success === true);

      const gen2 = await OtpService.generateOtp(phone);
      assert('Immediate second request fails with cooldown', gen2.success === false && (gen2.cooldownRemaining ?? 0) > 0 && gen2.code === 'COOLDOWN');
    }

    // ── TC-AUTH-04: Max 5 Incorrect Attempts Lockout ───────────────────────────
    section('TC-AUTH-04: Max 5 Incorrect Attempts Lockout & Attempt Decrement');
    {
      await OtpService.clearStore();
      const phone = '+84909999003';

      const gen = await OtpService.generateOtp(phone);
      assert('Generate OTP succeeds', gen.success === true);

      for (let i = 1; i <= 4; i++) {
        const attemptRes = await OtpService.verifyOtp(phone, `99999${i}`);
        assert(`Attempt ${i} fails with ${5 - i} remaining`, attemptRes.success === false && attemptRes.remainingAttempts === (5 - i));
      }

      // 5th failed attempt -> LOCKOUT
      const attempt5 = await OtpService.verifyOtp(phone, '999995');
      assert('5th failed attempt triggers lockout', attempt5.success === false && attempt5.code === 'LOCKOUT');

      // Subsequent attempt even with correct OTP is rejected
      const verifyAfterLockout = await OtpService.verifyOtp(phone, gen.devOtp || '123456');
      assert('Correct OTP rejected after lockout', verifyAfterLockout.success === false);
    }

    // ── TC-AUTH-05: Max 5 Daily OTP Cap ────────────────────────────────────────
    section('TC-AUTH-05: Max 5 Daily OTP Cap');
    {
      await OtpService.clearStore();
      const phone = '+84909999004';

      // Simulate 5 requests across intervals
      for (let i = 0; i < 5; i++) {
        await redisClient.del(redisKeys.otpCooldown(phone));
        const r = await OtpService.generateOtp(phone);
        assert(`Daily request ${i + 1} succeeds`, r.success === true);
      }
      await redisClient.del(redisKeys.otpCooldown(phone));
      const r6 = await OtpService.generateOtp(phone);
      assert('6th request blocked by daily cap (429 / DAILY_CAP)', r6.success === false && r6.code === 'DAILY_CAP');
    }

    // ── TC-AUTH-06: AuthController HTTP Handlers (E2E API) ────────────────────
    section('TC-AUTH-06: AuthController HTTP Handlers (requestOtp & verifyOtp)');
    {
      await OtpService.clearStore();

      // Invalid phone
      const req1: any = { body: { phone: 'abc' } };
      const res1 = makeRes();
      await AuthController.requestOtp(req1, res1);
      assert('requestOtp with invalid phone returns 400', res1._status === 400);

      // Valid phone: 0912345678
      const req2: any = { body: { phone: '0912345678' } };
      const res2 = makeRes();
      await AuthController.requestOtp(req2, res2);
      assert('requestOtp with 0912345678 returns 200', res2._status === 200 && res2._json.success === true);
      assert('requestOtp returns normalized phone +84912345678', res2._json.phone === '+84912345678');
      assert('requestOtp returns devOtp in test mode', res2._json.devOtp === '123456');

      // Immediate re-request -> 429
      const req3: any = { body: { phone: '0912345678' } };
      const res3 = makeRes();
      await AuthController.requestOtp(req3, res3);
      assert('Immediate re-request returns 429 cooldown', res3._status === 429 && res3._json.code === 'COOLDOWN');

      // Verify OTP with wrong code -> 400 with attempts
      const reqWrong: any = { body: { phone: '0912345678', otp: '999999' } };
      const resWrong = makeRes();
      await AuthController.verifyOtp(reqWrong, resWrong);
      assert('verifyOtp with wrong OTP returns 400', resWrong._status === 400 && resWrong._json.success === false);
      assert('verifyOtp returns remainingAttempts: 4', resWrong._json.remainingAttempts === 4);

      // Verify OTP with correct code -> 200 with JWT token, sessionId, and user
      const reqCorrect: any = { body: { phone: '0912345678', otp: '123456', displayName: 'Tester E2E' } };
      const resCorrect = makeRes();
      await AuthController.verifyOtp(reqCorrect, resCorrect);
      assert('verifyOtp with correct OTP returns 200', resCorrect._status === 200 && resCorrect._json.success === true);
      assert('verifyOtp returns JWT token', typeof resCorrect._json.token === 'string' && resCorrect._json.token.length > 20);
      assert('verifyOtp returns sessionId', typeof resCorrect._json.sessionId === 'string');
      assert('verifyOtp returns user object with quota', resCorrect._json.user && resCorrect._json.user.phoneNumber === '+84912345678');
    }

    // ── TC-AUTH-07: Production Mode Security & SMS Provider Check ──────────────
    section('TC-AUTH-07: Production Mode Security & SMS Provider Check');
    {
      await OtpService.clearStore();
      const phone = '+84909999005';

      // Switch to strict production mode WITHOUT SMS provider
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_TEST_OTP;
      delete process.env.TEST_AUTH_MODE;
      delete process.env.SMS_PROVIDER;

      // 1. In production without SMS provider -> Returns 503 SMS_NOT_CONFIGURED
      const reqProdNoSms: any = { body: { phone } };
      const resProdNoSms = makeRes();
      await AuthController.requestOtp(reqProdNoSms, resProdNoSms);
      assert('Production without SMS provider returns 503', resProdNoSms._status === 503);
      assert('Error indicates SMS_NOT_CONFIGURED', resProdNoSms._json.code === 'SMS_NOT_CONFIGURED');
      assert('No devOtp or otp leaked in production', resProdNoSms._json.devOtp === undefined && resProdNoSms._json.otp === undefined);

      // 2. In production WITH SMS provider (e.g. mock provider)
      process.env.SMS_PROVIDER = 'mock';
      const reqProdWithSms: any = { body: { phone } };
      const resProdWithSms = makeRes();
      await AuthController.requestOtp(reqProdWithSms, resProdWithSms);
      assert('Production with SMS provider returns 200', resProdWithSms._status === 200 && resProdWithSms._json.success === true);
      assert('Production response NEVER exposes devOtp or otp', resProdWithSms._json.devOtp === undefined && resProdWithSms._json.otp === undefined);

      // 3. Static '123456' MUST FAIL in production (random CSPRNG OTP generated)
      const verifyStaticProd: any = { body: { phone, otp: '123456' } };
      const resStaticProd = makeRes();
      await AuthController.verifyOtp(verifyStaticProd, resStaticProd);
      assert('Static 123456 fails in production (random OTP enforced)', resStaticProd._status === 400);
    }

    // ── TC-AUTH-08: Test Auth Mode Override in Production ─────────────────────
    section('TC-AUTH-08: Test Auth Mode Override in Production (ENABLE_TEST_OTP=true)');
    {
      await OtpService.clearStore();
      const phone = '+84909999006';

      // Set production environment BUT with ENABLE_TEST_OTP=true (for Railway Staging/QA)
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_TEST_OTP = 'true';
      delete process.env.SMS_PROVIDER;

      const reqOverride: any = { body: { phone } };
      const resOverride = makeRes();
      await AuthController.requestOtp(reqOverride, resOverride);
      assert('Production with ENABLE_TEST_OTP=true returns 200', resOverride._status === 200 && resOverride._json.success === true);
      assert('Production with ENABLE_TEST_OTP=true safely exposes devOtp', resOverride._json.devOtp === '123456');

      const verifyOverride: any = { body: { phone, otp: '123456' } };
      const resVerifyOverride = makeRes();
      await AuthController.verifyOtp(verifyOverride, resVerifyOverride);
      assert('Verify with devOtp succeeds under test auth override', resVerifyOverride._status === 200 && resVerifyOverride._json.success === true);
    }
  } finally {
    // Restore environment
    process.env.NODE_ENV = origNodeEnv;
    if (origEnableTestOtp !== undefined) process.env.ENABLE_TEST_OTP = origEnableTestOtp; else delete process.env.ENABLE_TEST_OTP;
    if (origTestAuthMode !== undefined) process.env.TEST_AUTH_MODE = origTestAuthMode; else delete process.env.TEST_AUTH_MODE;
    if (origSmsProvider !== undefined) process.env.SMS_PROVIDER = origSmsProvider; else delete process.env.SMS_PROVIDER;
    if (origDevOtp !== undefined) process.env.DEV_OTP = origDevOtp; else delete process.env.DEV_OTP;
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return fail === 0;
}

if (require.main === module) {
  runAuthTests().then((ok) => process.exit(ok ? 0 : 1));
}

