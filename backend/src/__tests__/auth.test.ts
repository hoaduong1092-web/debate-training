/**
 * TC-AUTH: Authentication & SMS OTP Security Test Suite (v15.0.0)
 *
 * Covers:
 *   TC-AUTH-01: E.164 Phone Normalization & Validation
 *   TC-AUTH-02: HMAC-SHA256 OTP Generation & Verification
 *   TC-AUTH-03: 60s Request Cooldown
 *   TC-AUTH-04: Max 5 Incorrect Attempts Lockout
 *   TC-AUTH-05: Max 5 Daily OTP Cap
 *   TC-AUTH-06: AuthController requestOtp & verifyOtp HTTP Handlers
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

  // ── TC-AUTH-01: Phone Normalizer ───────────────────────────────────────────
  section('TC-AUTH-01: E.164 Phone Normalization & Validation');
  {
    assert('Normalize 0901234567 to +84901234567', PhoneValidator.normalizeE164('0901234567') === '+84901234567');
    assert('Normalize 84901234567 to +84901234567', PhoneValidator.normalizeE164('84901234567') === '+84901234567');
    assert('Normalize +84901234567 to +84901234567', PhoneValidator.normalizeE164('+84901234567') === '+84901234567');
    assert('Normalize formatted phone (090) 123-4567 to +84901234567', PhoneValidator.normalizeE164('(090) 123-4567') === '+84901234567');
    assert('Normalize international US +14155552671', PhoneValidator.normalizeE164('+14155552671') === '+14155552671');
    assert('Reject invalid string', PhoneValidator.normalizeE164('invalid-phone') === null);
    assert('Reject empty string', PhoneValidator.normalizeE164('') === null);
  }

  // ── TC-AUTH-02: OTP Generation & Verification ──────────────────────────────
  section('TC-AUTH-02: HMAC-SHA256 OTP Generation & Verification');
  {
    await OtpService.clearStore();
    const phone = '+84909999001';

    const gen = await OtpService.generateOtp(phone);
    assert('Generate OTP succeeds', gen.success === true && !!gen.otp);

    const wrongVerify = await OtpService.verifyOtp(phone, '000000');
    assert('Verify with wrong OTP fails', wrongVerify.success === false);

    const correctVerify = await OtpService.verifyOtp(phone, gen.otp || '123456');
    assert('Verify with correct OTP succeeds', correctVerify.success === true);

    const reuseVerify = await OtpService.verifyOtp(phone, gen.otp || '123456');
    assert('Re-verifying consumed OTP fails (single use)', reuseVerify.success === false);
  }

  // ── TC-AUTH-03: 60s Request Cooldown ───────────────────────────────────────
  section('TC-AUTH-03: 60-Second Request Cooldown');
  {
    await OtpService.clearStore();
    const phone = '+84909999002';

    const gen1 = await OtpService.generateOtp(phone);
    assert('First OTP request succeeds', gen1.success === true);

    const gen2 = await OtpService.generateOtp(phone);
    assert('Immediate second request fails with cooldown', gen2.success === false && (gen2.cooldownRemaining ?? 0) > 0);
  }

  // ── TC-AUTH-04: Max 5 Incorrect Attempts Lockout ───────────────────────────
  section('TC-AUTH-04: Max 5 Incorrect Attempts Lockout');
  {
    await OtpService.clearStore();
    const phone = '+84909999003';

    const gen = await OtpService.generateOtp(phone);
    assert('Generate OTP succeeds', gen.success === true);

    for (let i = 1; i <= 5; i++) {
      await OtpService.verifyOtp(phone, `99999${i}`);
    }

    const verifyAfterLockout = await OtpService.verifyOtp(phone, gen.otp || '123456');
    assert('Correct OTP rejected after 5 failed attempts', verifyAfterLockout.success === false);
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
    assert('6th request blocked by daily cap', r6.success === false && r6.message.includes('5 mã OTP'));
  }

  // ── TC-AUTH-06: AuthController HTTP Handlers ───────────────────────────────
  section('TC-AUTH-06: AuthController HTTP Handlers');
  {
    await OtpService.clearStore();

    // Invalid phone
    const req1: any = { body: { phone: 'abc' } };
    const res1 = makeRes();
    await AuthController.requestOtp(req1, res1);
    assert('requestOtp with invalid phone returns 400', res1._status === 400);

    // Valid phone
    const req2: any = { body: { phone: '0908888777' } };
    const res2 = makeRes();
    await AuthController.requestOtp(req2, res2);
    assert('requestOtp with valid phone returns 200', res2._status === 200 && res2._json.success === true);

    // Immediate re-request
    const req3: any = { body: { phone: '0908888777' } };
    const res3 = makeRes();
    await AuthController.requestOtp(req3, res3);
    assert('Immediate re-request returns 429 cooldown', res3._status === 429);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return fail === 0;
}

if (require.main === module) {
  runAuthTests().then((ok) => process.exit(ok ? 0 : 1));
}
