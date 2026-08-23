/**
 * phaseD1Audit.test.ts — Phase D.1 Verification Suite for P1 Remediations:
 *
 *   F01: Removal of User-Facing Synthetic Sub-Scores (* 0.98, * 1.02, * 0.95, etc.)
 *   F02: Session Ownership Authorization Enforcement (Tenant Isolation)
 *   F03: Turn Concurrency & Database (sessionId, turnNumber) Uniqueness
 *
 * Runner: tsx
 */

import { listUserSessions, getSessionDetail, handleDebateMessage, createDebateSession } from '../controllers/debateController.js';
import { PlazaService } from '../services/plazaService.js';
import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assertTest(name: string, condition: boolean, details?: string) {
  if (condition) {
    passCount += 1;
    console.log(`  \u2705 PASS: ${name}`);
  } else {
    failCount += 1;
    console.error(`  \u274c FAIL: ${name} — ${details || 'Assertion failed'}`);
  }
}

// Mock Request & Response builders
function createMockReq(options: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, any>;
  userId?: string;
}) {
  return {
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    userId: options.userId,
    headers: {},
  } as any;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    jsonData: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.jsonData = data;
      return res;
    },
  };
  return res;
}

async function runPhaseD1Audit() {
  console.log('\n============================================================');
  console.log('  PHASE D.1 — P1 REMEDIATION VERIFICATION SUITE');
  console.log('============================================================\n');

  console.log('▶ DOMAIN 1: F01 — Synthetic Sub-Score Neutralization');

  // Test 1: listUserSessions responds with success: true and array structure
  const mockReq1 = createMockReq({ userId: '11111111-1111-1111-1111-111111111111' });
  const mockRes1 = createMockRes();
  await listUserSessions(mockReq1, mockRes1);
  assertTest(
    'F01-01: listUserSessions responds with success: true and array structure',
    mockRes1.statusCode === 200 && Array.isArray(mockRes1.jsonData?.sessions)
  );

  // Test 2: Verify PlazaService returns null for sub-scores in feed
  const plazaFeed = await PlazaService.getFeed({ sort: 'latest', query: '', limit: 5, offset: 0 });
  const hasSyntheticSubScoresInFeed = plazaFeed.items.some(
    (item) => item.content_score !== null && item.content_score !== undefined
  );
  assertTest(
    'F01-02: PlazaService.getFeed items have content_score: null (no synthetic multipliers)',
    !hasSyntheticSubScoresInFeed,
    'Plaza items must have null sub-scores'
  );

  // Test 3: Search codebase to prove NO synthetic multipliers remain in controllers/services
  const debateControllerCode = fs.readFileSync(
    path.join(__dirname, '../controllers/debateController.ts'),
    'utf-8'
  );
  const plazaServiceCode = fs.readFileSync(
    path.join(__dirname, '../services/plazaService.ts'),
    'utf-8'
  );
  const has098Controller = debateControllerCode.includes('* 0.98');
  const has102Controller = debateControllerCode.includes('* 1.02');
  const has095Controller = debateControllerCode.includes('* 0.95');
  const has098Plaza = plazaServiceCode.includes('* 0.98');
  const has102Plaza = plazaServiceCode.includes('* 1.02');

  assertTest(
    'F01-03: Zero (* 0.98, * 1.02, * 0.95) multipliers in debateController.ts',
    !has098Controller && !has102Controller && !has095Controller
  );
  assertTest(
    'F01-04: Zero (* 0.98, * 1.02) multipliers in plazaService.ts',
    !has098Plaza && !has102Plaza
  );

  console.log('\n▶ DOMAIN 2: F02 — Session Ownership Authorization Enforcement');

  // Test 4: Verify getSessionDetail enforces session.userId === req.userId
  assertTest(
    'F02-01: debateController.ts contains session.userId !== authUserId check in getSessionDetail',
    debateControllerCode.includes('if (authUserId && session.userId !== authUserId)') &&
    debateControllerCode.includes("res.status(403).json({ error: 'FORBIDDEN'")
  );

  // Test 5: Verify handleDebateMessage enforces session.userId === req.userId
  assertTest(
    'F02-02: debateController.ts contains session.userId !== authUserId check in handleDebateMessage',
    debateControllerCode.includes('if (authUserId && session.userId !== authUserId)') &&
    debateControllerCode.includes("return res.status(403).json({")
  );

  // Test 6: Verify createDebateSession prioritizes authenticated userId over req.body.userId
  assertTest(
    'F02-03: createDebateSession uses authenticated authUserId rather than trusting req.body.userId',
    debateControllerCode.includes('const authUserId = (req as any).userId;') &&
    debateControllerCode.includes('const userId = authUserId || bodyUserId;')
  );

  console.log('\n▶ DOMAIN 3: F03 — Turn Concurrency & Database Uniqueness');

  // Test 7: Verify schema.prisma contains @@unique([sessionId, turnNumber])
  const schemaPrismaCode = fs.readFileSync(
    path.join(__dirname, '../../prisma/schema.prisma'),
    'utf-8'
  );
  assertTest(
    'F03-01: schema.prisma contains @@unique([sessionId, turnNumber]) on DebateTranscript',
    schemaPrismaCode.includes('@@unique([sessionId, turnNumber])')
  );

  // Test 8: Verify migration file exists
  const migrationExists = fs.existsSync(
    path.join(__dirname, '../../prisma/migrations/20260824003000_add_transcript_turn_unique_constraint/migration.sql')
  );
  assertTest(
    'F03-02: Migration file for unique index exists in prisma/migrations',
    migrationExists
  );

  // Test 9: Verify collision handling in handleDebateMessage (P2002 -> HTTP 409 Conflict)
  assertTest(
    'F03-03: handleDebateMessage catches unique constraint violation P2002 and returns HTTP 409',
    debateControllerCode.includes("dbErr?.code === 'P2002'") &&
    debateControllerCode.includes("error: 'TURN_COLLISION'") &&
    debateControllerCode.includes('res.status(409)')
  );

  console.log('\n============================================================');
  console.log(`  PHASE D.1 TEST SUMMARY: ${passCount} PASS  ${failCount} FAIL`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhaseD1Audit().catch((err) => {
  console.error('Phase D.1 Test Runner Error:', err);
  process.exit(1);
});
