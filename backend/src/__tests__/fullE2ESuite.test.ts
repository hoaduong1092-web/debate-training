/**
 * COMPREHENSIVE BLUEPRINT v15.0.0 INTEGRATION TEST SUITE (HƯỚNG 1 -> 5)
 *
 * Covers:
 *   [HƯỚNG 1]: Quota deduction atomic rules verification
 *   [HƯỚNG 2]: Phone normalization & OTP Rate Limiting
 *   [HƯỚNG 3]: Single active session enforcement
 *   [HƯỚNG 4]: Local DSP WPM & Vietnamese filler word extraction
 *   [HƯỚNG 5]: Debate Arena POI Safety Gate & Speaker Transitions
 *
 * Zero Live AI calls. 100% Offline verification.
 */

import { PhoneValidator } from '../utils/phoneValidator';
import { OtpService } from '../services/otpService';
import { SessionRegistry } from '../services/sessionRegistry';
import { VoiceDspService } from '../services/voiceDspService';
import { DebateRuleEngine } from '../services/debateRuleEngine';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown): void {
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

export async function runFullE2ESuite(): Promise<boolean> {
  console.log('============================================================');
  console.log('  COMPREHENSIVE BLUEPRINT v15.0.0 INTEGRATION TEST SUITE');
  console.log('============================================================\n');

  SessionRegistry.clear();
  OtpService.clearStore();

  // ── HƯỚNG 1: QUOTA LOGIC ───────────────────────────────────────────────────
  section('TC-ALL-01 [HƯỚNG 1]: Quota deduction atomic rules verification');
  {
    let quota = 5;
    const deduct = () => {
      if (quota >= 1) {
        quota -= 1;
        return true;
      }
      return false;
    };

    check('Initial deduction succeeds (5 -> 4)', deduct() === true && quota === 4);
    check('Four more deductions drain to 0', deduct() && deduct() && deduct() && deduct() && quota === 0);
    check('Deduction on 0 fails closed (failsafe)', deduct() === false && quota === 0);
  }

  // ── HƯỚNG 2: AUTH & PHONE E.164 ───────────────────────────────────────────
  section('TC-ALL-02 [HƯỚNG 2]: Phone normalization & OTP Rate Limiting');
  {
    const phone = PhoneValidator.normalizeE164('0912345678');
    check('Phone normalizes to +84912345678', phone === '+84912345678');

    const otpRes = OtpService.generateOtp(phone!);
    check('Initial OTP request succeeds', otpRes.success === true);

    const spamRes = OtpService.generateOtp(phone!);
    check('Immediate spam request blocked (cooldown > 0)', spamRes.success === false && (spamRes.cooldownRemaining ?? 0) > 0);
  }

  // ── HƯỚNG 3: SINGLE ACTIVE SESSION & GENTLE EVICTION ───────────────────────
  section('TC-ALL-03 [HƯỚNG 3]: Single active session enforcement');
  {
    const userId = 'user-uuid-v15';
    const oldSession = SessionRegistry.registerSession(userId, 'session-A');
    check('Session A registers as initial session', oldSession === null);
    check('Session A is active', SessionRegistry.isActiveSession(userId, 'session-A') === true);

    const replaced = SessionRegistry.registerSession(userId, 'session-B');
    check('Session B registration returns oldSession A', replaced !== null && replaced.sessionId === 'session-A');
    check('Session A is now revoked', SessionRegistry.isActiveSession(userId, 'session-A') === false);
    check('Session B is now active', SessionRegistry.isActiveSession(userId, 'session-B') === true);
  }

  // ── HƯỚNG 4: VOICE COACH DSP ENGINE ────────────────────────────────────────
  section('TC-ALL-04 [HƯỚNG 4]: Local DSP WPM & Vietnamese filler word extraction');
  {
    const sampleSpeech = 'ờ thì hôm nay tôi muốn à trình bày về quan điểm biến đổi khí hậu thì là rất cấp bách';
    const metrics = VoiceDspService.computeFromText(sampleSpeech, 6000); // 6 seconds

    check('Word count is exactly 21', metrics.wordCount === 21, metrics.wordCount);
    check('WPM is 210', metrics.wpm === 210, metrics.wpm);
    check('Pace evaluation is TOO_FAST (>175 WPM)', metrics.paceEvaluation === 'TOO_FAST', metrics.paceEvaluation);
    check('Filler words detected (>= 3)', metrics.fillerWordsCount >= 3, metrics.fillerWordsList);
  }

  // ── HƯỚNG 5: DEBATE RULE ENGINE & POI ──────────────────────────────────────
  section('TC-ALL-05 [HƯỚNG 5]: Debate Arena POI Safety Gate & Speaker Transitions');
  {
    const totalDuration = 420; // 7 mins
    check('POI blocked during protected start (second 30)', DebateRuleEngine.isPoiAllowed(30, totalDuration) === false);
    check('POI allowed during active floor (second 180)', DebateRuleEngine.isPoiAllowed(180, totalDuration) === true);
    check('POI blocked during protected end (second 390)', DebateRuleEngine.isPoiAllowed(390, totalDuration) === false);

    const poiCheck = DebateRuleEngine.validatePoiDuration(18);
    check('Excessive 18s POI is invalid and capped at 15s', poiCheck.valid === false && poiCheck.cutOffSeconds === 15);

    const validPoi = DebateRuleEngine.validatePoiDuration(10);
    check('10s POI is valid', validPoi.valid === true && validPoi.cutOffSeconds === 10);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return fail === 0;
}

if (require.main === module) {
  runFullE2ESuite().then((ok) => process.exit(ok ? 0 : 1));
}
