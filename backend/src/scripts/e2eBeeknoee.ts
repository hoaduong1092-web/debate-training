/**
 * Live E2E Beeknoee Verification — v15.0.0
 */

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';
const BACKEND_URL = 'http://localhost:4000';

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function isCoachFeedback(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const f = v as Record<string, unknown>;
  if (typeof f.score !== 'number') return false;
  const cre = f.cre_analysis;
  if (!cre || typeof cre !== 'object') return false;
  const c = cre as Record<string, unknown>;
  return (
    typeof c.claim === 'string' &&
    typeof c.reasoning === 'string' &&
    typeof c.evidence === 'string' &&
    isStringArray(f.fallacies_detected) &&
    isStringArray(f.strengths) &&
    isStringArray(f.weaknesses) &&
    isStringArray(f.actionable_suggestions)
  );
}

async function main() {
  console.log('══════════════════════════════════════════════════════════');
  console.log('   LIVE E2E BEEKNOEE VERIFICATION — v15.0.0');
  console.log('══════════════════════════════════════════════════════════\n');

  const beforeQuotaRow = await prisma.userQuota.findUnique({
    where: { userId: DEMO_USER_ID },
  });
  const beforeQuota = beforeQuotaRow?.textTurnsRemaining ?? 'NO_QUOTA_ROW';
  console.log(`[BEFORE] text_remaining = ${beforeQuota}`);

  const session = await prisma.debateSession.findFirst({
    where: { userId: DEMO_USER_ID, status: 'IN_PROGRESS' },
    orderBy: { createdAt: 'desc' },
  });

  if (!session) {
    console.error('[FATAL] No IN_PROGRESS session found.');
    process.exitCode = 1;
    return;
  }

  console.log(`[SETUP] Using session: ${session.id}`);
  console.log(`[SETUP] Topic: "${session.topic}"`);

  console.log('\n[REQUEST] Sending ONE live message → Beeknoee gateway...');
  const t0 = Date.now();

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/v1/arena/sessions/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: DEMO_USER_ID,
        content:
          'Việc cấm học sinh sử dụng điện thoại trong lớp giúp nâng cao sự tập trung và kết quả học tập.',
        stance: 'AFFIRMATIVE',
        topic: 'Cấm học sinh sử dụng điện thoại trong giờ học',
      }),
    });
  } catch (fetchErr: any) {
    console.error('[FATAL] fetch failed:', fetchErr.message);
    process.exitCode = 1;
    return;
  }

  const latencyMs = Date.now() - t0;
  const httpOk = res.status === 200;
  console.log(`[RESPONSE] HTTP ${res.status} — ${latencyMs}ms`);

  const body = await res.json() as any;

  if (!httpOk) {
    console.error('[ERROR] Body:', JSON.stringify(body, null, 2).slice(0, 600));
  }

  const opponentText: string = body?.data?.opponent_response?.text ?? '';
  const coachFeedback = body?.data?.coach_feedback;
  const coachOk = isCoachFeedback(coachFeedback);

  if (httpOk) {
    console.log('\n─── Coach Feedback ──────────────────────────────────────────');
    console.log('  score                     :', coachFeedback?.score);
    console.log('  isCoachFeedback()         :', coachOk ? 'PASS ✓' : 'FAIL ✗');
    console.log('  turn_number               :', body?.turn_number);
    console.log('  turns_remaining           :', body?.turns_remaining);
  }

  const afterQuotaRow = await prisma.userQuota.findUnique({
    where: { userId: DEMO_USER_ID },
  });
  const afterQuota = afterQuotaRow?.textTurnsRemaining ?? 'NO_QUOTA_ROW';

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`- Response HTTP Status:             ${httpOk ? '200 OK ✓' : `${res.status} ✗`}`);
  console.log(`- C-R-E Parser Result:              ${coachOk ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`- Quota:                            Before: ${beforeQuota} → After: ${afterQuota}`);
  console.log(`- Round-trip Latency:               ${latencyMs}ms`);
  console.log('══════════════════════════════════════════════════════════');
}

main()
  .catch((err) => {
    console.error('\n[FATAL]', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
