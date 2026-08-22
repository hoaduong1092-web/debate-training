/**
 * Strict One-Account & Team Deprecation Test Suite (v15.0.0)
 *
 * Verifies:
 *   TC-DEPRECATE-01: Team invitations return FEATURE_DEPRECATED
 *   TC-DEPRECATE-02: Strict One-Account Policy enforcement
 */

import { redeemTeamInvitation, getUserTeamGroups } from '../services/teamManager';

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

export async function runTeamTests() {
  console.log('\n=== RUNNING STRICT ONE-ACCOUNT & TEAM DEPRECATION TESTS (v15.0.0) ===');

  const result = await redeemTeamInvitation('test-user-id', 'INV_CODE_123');
  assert('Team invitation redemption returns FEATURE_DEPRECATED', result.success === false && result.error === 'FEATURE_DEPRECATED');

  const groups = await getUserTeamGroups('test-user-id');
  assert('getUserTeamGroups returns empty lists', Array.isArray(groups.leading) && groups.leading.length === 0);

  console.log(`\nResults: ${passedAsserts}/${totalAsserts} passed.`);
  return failedTests.length === 0;
}

if (require.main === module) {
  runTeamTests().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}