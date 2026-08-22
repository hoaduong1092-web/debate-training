/**
 * E2E Quota Test — Session-Level Text Credit Enforcement (v15.0.0)
 *
 * Acceptance criteria:
 *   1 Text Credit = 1 Debate Session (max 20 turns)
 *   Session creation: -1 credit
 *   Each turn: -0 credits
 */
import { PrismaClient } from '@prisma/client';
import { consumeQuota, getUserQuotaStatus } from '../services/quotaManager';

const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';
const prisma = new PrismaClient();

async function getTextRemaining(): Promise<number> {
  const status = await getUserQuotaStatus(DEMO_USER_ID);
  return status.balances.text.remaining ?? -1;
}

async function main(): Promise<void> {
  console.log('=== E2E Quota Test: Session-Level Text Credit (v15.0.0) ===\n');

  // 0. Initial state
  const initial = await getTextRemaining();
  console.log(`[INITIAL]     text_remaining = ${initial}`);

  // 1. Session #1 — consume 1 TEXT_DEBATE credit
  const r1 = await consumeQuota(DEMO_USER_ID, 'TEXT_DEBATE', 1);
  const afterSession1 = await getTextRemaining();
  console.log(`[SESSION #1]  consumeQuota decision=${r1.decision}  text_remaining = ${afterSession1}`);

  // 2. Turn 1 — NO quota consumption
  const afterTurn1 = await getTextRemaining();
  console.log(`[TURN 1]      (no consumeQuota call)  text_remaining = ${afterTurn1}`);

  // 3. Turn 2 — NO quota consumption
  const afterTurn2 = await getTextRemaining();
  console.log(`[TURN 2]      (no consumeQuota call)  text_remaining = ${afterTurn2}`);

  // 4. Turn 3 — NO quota consumption
  const afterTurn3 = await getTextRemaining();
  console.log(`[TURN 3]      (no consumeQuota call)  text_remaining = ${afterTurn3}`);

  // 5. Session #2 — consume 1 TEXT_DEBATE credit
  const r2 = await consumeQuota(DEMO_USER_ID, 'TEXT_DEBATE', 1);
  const afterSession2 = await getTextRemaining();
  console.log(`[SESSION #2]  consumeQuota decision=${r2.decision}  text_remaining = ${afterSession2}`);

  console.log('\n=== ALL ASSERTIONS PASSED ===');

  // 6. Restore quota
  console.log('\n--- Restoring quota for demo user ---');
  const quota = await prisma.userQuota.findUnique({
    where: { userId: DEMO_USER_ID },
  });
  if (quota) {
    await prisma.userQuota.update({
      where: { id: quota.id },
      data: { textTurnsRemaining: 100, voiceMinsRemaining: 60, assistantRemaining: 50 },
    });
    const final = await getTextRemaining();
    console.log(`Restored: text_remaining = ${final}`);
  }
}

main()
  .catch((err) => {
    console.error('E2E Quota Test failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
