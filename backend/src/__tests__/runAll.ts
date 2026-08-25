/**
 * Test runner: executes all test suites and prints a consolidated summary.
 * Usage: npx tsx src/__tests__/runAll.ts
 */
import { execSync } from 'child_process';
import path from 'path';

// ROOT is the backend directory (d:\...\backend)
const BACKEND_ROOT = path.resolve(__dirname, '../..');

interface SuiteResult {
  name: string;
  file: string;
  passed: boolean;
  output: string;
}

const suites = [
  { name: 'Text Debate Suite', file: 'src/__tests__/textDebate.test.ts' },
  { name: 'Voice Debate Suite', file: 'src/__tests__/voiceDebate.test.ts' },
  { name: 'Voice DSP Suite', file: 'src/__tests__/voiceDsp.test.ts' },
  { name: 'Logic Coach Parser', file: 'src/logicCoachParser.test.ts' },
  { name: 'Assistant Domain Suite', file: 'src/__tests__/assistantDomain.test.ts' },
  { name: 'Plaza Domain Suite', file: 'src/__tests__/plaza.test.ts' },
  { name: 'Profile Domain Suite', file: 'src/__tests__/profile.test.ts' },
  { name: 'Profile Analytics & Skill Tree Suite', file: 'src/__tests__/profileAnalytics.test.ts' },
  { name: 'Bulk Delete Suite', file: 'src/__tests__/bulkDelete.test.ts' },
  { name: 'Payment Gateways & IPN Suite', file: 'src/__tests__/payment_gateways.test.ts' },
  { name: 'Auth & SMS OTP Suite', file: 'src/__tests__/auth.test.ts' },
  { name: 'Session Eviction Suite', file: 'src/__tests__/sessionEviction.test.ts' },
  { name: 'Debate Rules & POI Suite', file: 'src/__tests__/debateRules.test.ts' },
  { name: 'Full Integration E2E Suite', file: 'src/__tests__/fullE2ESuite.test.ts' },
  { name: 'Team Pass & Bundles Suite', file: 'src/__tests__/team.test.ts' },
  { name: 'Voice Session Lifecycle & Decoupling Suite', file: 'src/__tests__/voiceSessionLifecycle.test.ts' },
  { name: 'Voice Atomic Billing & Quantum Suite', file: 'src/__tests__/voiceAtomicBillingB4.test.ts' },
  { name: 'Voice Server-Side 15-Minute Cap & Boundary Suite', file: 'src/__tests__/voiceServerCapB5.test.ts' },
  { name: 'Voice Entitlement & Precedence Suite', file: 'src/__tests__/voiceEntitlementB6.test.ts' },
  { name: 'Credit Pack FEFO & Extended Catalog Suite', file: 'src/__tests__/creditPackB7.test.ts' },
  { name: 'Payment Provisioning & Webhooks B8 Suite', file: 'src/__tests__/paymentProvisioningB8.test.ts' },
  { name: 'Frontend UI Precision & Entitlement B9 Suite', file: 'src/__tests__/phaseB9FrontendContract.test.ts' },
  { name: 'Final Acceptance & E2E B10 Suite', file: 'src/__tests__/phaseB10FinalAcceptance.test.ts' },
  { name: 'Phase C1 Commercial & Transaction Portal Suite', file: 'src/__tests__/phaseC1Commercial.test.ts' },
  { name: 'Voice Real Quota & End Session E2E Suite', file: 'src/__tests__/voiceRealQuotaE2E.test.ts' },
];

const results: SuiteResult[] = [];

for (const suite of suites) {
  console.log('\n' + String.fromCharCode(9608).repeat(60));
  console.log('RUNNING: ' + suite.name);
  console.log(String.fromCharCode(9608).repeat(60));
  try {
    const output = execSync(
      `npx tsx ${suite.file}`,
      { cwd: BACKEND_ROOT, encoding: 'utf8', stdio: 'pipe' },
    );
    console.log(output);
    results.push({ name: suite.name, file: suite.file, passed: true, output });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    const out = (e.stdout ?? '') + (e.stderr ?? '');
    console.log(out);
    results.push({ name: suite.name, file: suite.file, passed: false, output: out });
  }
}

// ─── Consolidated Report ──────────────────────────────────────────────────────

console.log('\n');
console.log('='.repeat(60));
console.log('  DEBATE ARENA TEST SUITE — CONSOLIDATED REPORT');
console.log('='.repeat(60));

let allPassed = true;
for (const r of results) {
  const icon = r.passed ? '\u2705' : '\u274c';
  console.log('  ' + icon + ' ' + r.name + ': ' + (r.passed ? 'PASS' : 'FAIL'));
  if (!r.passed) allPassed = false;
}

console.log('='.repeat(60));
console.log('  Final Status:', allPassed ? 'ALL TESTS GREEN \u2705' : 'SOME TESTS FAILED \u274c');
console.log('='.repeat(60));

if (!allPassed) process.exit(1);

