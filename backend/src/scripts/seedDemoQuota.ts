/**
 * Idempotent demo user + STANDARD Baseline v15.0.0 quota seeder.
 *
 * Demo userId matches frontend DEMO_USER_ID:
 *   22222222-2222-2222-2222-222222222222
 *
 * Run:
 *   npx tsx src/scripts/seedDemoQuota.ts
 */
import { PrismaClient } from '@prisma/client';

const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';
const PLAN_ID = 'PLAN_STD_129K';
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + PERIOD_MS);

  console.log('=== seedDemoQuota (idempotent v15.0.0) ===');
  console.log(`userId: ${DEMO_USER_ID}`);

  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      phoneNumber: '+84900000000',
      displayName: 'Demo Arena User',
    },
    create: {
      id: DEMO_USER_ID,
      phoneNumber: '+84900000000',
      displayName: 'Demo Arena User',
    },
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: PLAN_ID },
    update: {},
    create: {
      id: PLAN_ID,
      name: 'Gói Tiêu Chuẩn (Rèn Luyện)',
      priceVnd: 129000.0,
      textTurnsQuota: 100,
      voiceMinsQuota: 60,
      assistantQuota: 50,
      isActive: true,
    },
  });

  const subscription = await prisma.userSubscription.upsert({
    where: { userId: DEMO_USER_ID },
    update: {
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: now,
      expiresAt: periodEnd,
    },
    create: {
      userId: DEMO_USER_ID,
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: now,
      expiresAt: periodEnd,
    },
  });

  const quota = await prisma.userQuota.upsert({
    where: { userId: DEMO_USER_ID },
    update: {
      textTurnsRemaining: plan.textTurnsQuota,
      voiceMinsRemaining: plan.voiceMinsQuota,
      assistantRemaining: plan.assistantQuota,
      lastResetAt: now,
    },
    create: {
      userId: DEMO_USER_ID,
      textTurnsRemaining: plan.textTurnsQuota,
      voiceMinsRemaining: plan.voiceMinsQuota,
      assistantRemaining: plan.assistantQuota,
      lastResetAt: now,
    },
  });

  console.log('[SEED] Demo user seeded successfully:', { user, subscription, quota });
}

main()
  .catch((err) => {
    console.error('seedDemoQuota failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
