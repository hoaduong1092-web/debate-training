/**
 * TC-SESS: Single Active Session & Gentle Eviction Test Suite (v15.0.0)
 *
 * Covers:
 *   TC-SESS-01: Single Active Session registration & lookup
 *   TC-SESS-02: Gentle Eviction triggering on second device login
 *   TC-SESS-03: WebSocket SESSION_REPLACED payload and gentle close dispatch
 *   TC-SESS-04: API Middleware blocks revoked session token with HTTP 401 (SESSION_REVOKED)
 *   TC-SESS-05: API Middleware allows new active session token
 *   TC-SESS-06: Session removal on logout
 *
 * Zero Live AI calls. Pure offline logic.
 */

import jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
import { SessionRegistry } from '../services/sessionRegistry';
import { SessionSocketHandler } from '../websocket/sessionSocketHandler';
import { authenticateToken } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-debate-master-jwt-secret-v15';

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

export async function runSessionEvictionTests(): Promise<boolean> {
  console.log('============================================================');
  console.log('  SINGLE SESSION & GENTLE EVICTION TEST SUITE (v15.0.0)');
  console.log('============================================================\n');

  const userId = '11111111-1111-4111-a111-111111111111';
  const sessionA = 'session-device-A-12345';
  const sessionB = 'session-device-B-67890';

  // ── TC-SESS-01: Single Active Session Registration ─────────────────────────
  section('TC-SESS-01: Register & Query Active Session');
  {
    await SessionRegistry.clear();
    const old1 = await SessionRegistry.registerSession(userId, sessionA);
    assert('First session registration returns null oldSession', old1 === null);
    assert('Session A is active', (await SessionRegistry.isActiveSession(userId, sessionA)) === true);
    assert('Active session ID matches Session A', (await SessionRegistry.getActiveSessionId(userId)) === sessionA);
  }

  // ── TC-SESS-02: Gentle Eviction on Second Device Login ──────────────────────
  section('TC-SESS-02: Gentle Eviction on Second Device Login');
  {
    const old2 = await SessionRegistry.registerSession(userId, sessionB);
    assert('Second session registration returns oldSession with session A', old2 !== null && old2.sessionId === sessionA);
    assert('Session A is no longer active', (await SessionRegistry.isActiveSession(userId, sessionA)) === false);
    assert('Session B is now active', (await SessionRegistry.isActiveSession(userId, sessionB)) === true);
    assert('Active session ID matches Session B', (await SessionRegistry.getActiveSessionId(userId)) === sessionB);
  }

  // ── TC-SESS-03: WebSocket Notification Dispatch ────────────────────────────
  section('TC-SESS-03: WebSocket SESSION_REPLACED Notification');
  {
    let sentMessage: string | null = null;
    let closedWithCode: number | null = null;
    let closedWithReason: string | null = null;

    const mockSocket = {
      readyState: WebSocket.OPEN,
      send(data: string) {
        sentMessage = data;
      },
      close(code: number, reason: string) {
        closedWithCode = code;
        closedWithReason = reason;
      },
    } as unknown as WebSocket;

    SessionRegistry.bindSocket(sessionA, mockSocket);

    const oldSessionWithSocket = {
      userId,
      sessionId: sessionA,
      socket: mockSocket,
      updatedAt: Date.now(),
    };

    SessionSocketHandler.notifyGentleEviction(oldSessionWithSocket, sessionB);

    assert('Eviction message was sent to socket', sentMessage !== null);
    if (sentMessage) {
      const parsed = JSON.parse(sentMessage);
      assert('Event type is SESSION_REPLACED', parsed.type === 'SESSION_REPLACED');
      assert('Event is GENTLE_EVICTION', parsed.event === 'GENTLE_EVICTION');
      assert('Replaced by session B', parsed.replacedBySessionId === sessionB);
    }

    // Wait for gentle drain delay (550ms)
    await new Promise((r) => setTimeout(r, 600));
    assert('Socket closed with code 4001', closedWithCode === 4001);
    assert('Socket closed with reason SESSION_REPLACED', closedWithReason === 'SESSION_REPLACED');
  }

  // ── TC-SESS-04: API Middleware Revocation Check ────────────────────────────
  section('TC-SESS-04: API Middleware Blocks Revoked Session Token');
  {
    await SessionRegistry.clear();
    await SessionRegistry.registerSession(userId, sessionB); // Only Session B is active

    const tokenA = jwt.sign({ userId, phoneNumber: '+84901111222', sessionId: sessionA }, JWT_SECRET);

    const reqA: any = {
      headers: { authorization: `Bearer ${tokenA}` },
    };
    const resA = makeRes();
    const traceA = { nextCalled: false };
    const nextA: NextFunction = () => { traceA.nextCalled = true; };

    await authenticateToken(reqA as Request, resA as unknown as Response, nextA);

    assert('Token A rejected with HTTP 401', resA._status === 401);
    assert('Error code is SESSION_REVOKED', resA._json?.code === 'SESSION_REVOKED');
    assert('Next was NOT called for revoked token', traceA.nextCalled === false);
  }

  // ── TC-SESS-05: API Middleware Accepts Active Session ──────────────────────
  section('TC-SESS-05: API Middleware Allows Active Session Token');
  {
    const tokenB = jwt.sign({ userId, phoneNumber: '+84901111222', sessionId: sessionB }, JWT_SECRET);

    const reqB: any = {
      headers: { authorization: `Bearer ${tokenB}` },
    };
    const resB = makeRes();
    const traceB = { nextCalled: false };
    const nextB: NextFunction = () => { traceB.nextCalled = true; };

    await authenticateToken(reqB as Request, resB as unknown as Response, nextB);

    assert('Next WAS called for active token B', traceB.nextCalled === true);
    assert('req.userId is populated', reqB.userId === userId);
    assert('req.sessionId is session B', reqB.sessionId === sessionB);
  }

  // ── TC-SESS-06: Session Removal on Logout ──────────────────────────────────
  section('TC-SESS-06: Session Removal on Logout');
  {
    await SessionRegistry.removeSession(userId, sessionB);
    assert('Session ID is null after removal', (await SessionRegistry.getActiveSessionId(userId)) === null);
  }

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`  Total: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
  console.log('────────────────────────────────────────────────────────────\n');

  return fail === 0;
}

if (require.main === module) {
  runSessionEvictionTests().then((ok) => process.exit(ok ? 0 : 1));
}
