/**
 * Single-shot live E2E: EXACTLY ONE AI request. Do NOT retry.
 * Verifies the HTTP envelope against the verbatim frontend guard.
 */
import path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEMO_USER_ID = '22222222-2222-2222-2222-222222222222';
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4000';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCoachFeedback(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  if (typeof v.score !== 'number') {
    return false;
  }
  const cre = v.cre_analysis;
  if (!cre || typeof cre !== 'object') {
    return false;
  }
  const c = cre as Record<string, unknown>;
  return (
    typeof c.claim === 'string' &&
    typeof c.reasoning === 'string' &&
    typeof c.evidence === 'string' &&
    isStringArray(v.fallacies_detected) &&
    isStringArray(v.strengths) &&
    isStringArray(v.weaknesses) &&
    isStringArray(v.actionable_suggestions)
  );
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const quotaBefore = await prisma.userQuota.findUnique({
      where: { userId: DEMO_USER_ID },
    });
    const before = quotaBefore?.textTurnsRemaining ?? null;
    console.log(`QUOTA_BEFORE=${before}`);

    const sessionId = randomUUID();
    const body = {
      userId: DEMO_USER_ID,
      content:
        'Học sinh dưới 15 tuổi không nên dùng mạng xã hội vì các nền tfangs thiết kế gây nghiện làm tổn hại khả năng tập trung học tập của các em.',
      stance: 'AFFIRMATIVE',
      history: [],
      coachHistory: [],
    };

    console.log('Sending single-shot POST request to:', `${BASE_URL}/api/v1/arena/sessions/${sessionId}/message`);
    const res = await fetch(`${BASE_URL}/api/v1/arena/sessions/${sessionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const status = res.status;
    const json = await res.json() as any;
    console.log(`HTTP_STATUS=${status}`);
    console.log('RESPONSE_BODY=', JSON.stringify(json, null, 2));

    const coachValid = isCoachFeedback(json?.data?.coach_feedback);
    console.log(`IS_COACH_FEEDBACK_VALID=${coachValid}`);

    const quotaAfter = await prisma.userQuota.findUnique({
      where: { userId: DEMO_USER_ID },
    });
    const after = quotaAfter?.textTurnsRemaining ?? null;
    console.log(`QUOTA_AFTER=${after}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error in testOneShot:', err);
  process.exit(1);
});
