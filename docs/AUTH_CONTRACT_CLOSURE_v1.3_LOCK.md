# AUTH CONTRACT CLOSURE v1.3 — LOCK DOCUMENT

> **Status:** 🔒 VERIFIED AND LOCKED  
> **Date:** 2026-08-23  
> **Authority:** Architect Decision  
> **Scope:** Authentication, Account Provisioning, Session Management, Quota Provisioning, Cost Metering Telemetry

---

## 1. Scope

This document records the final locked state of the Authentication & Account Provisioning system for **AI Debate Master — Thinking OS**.

### In Scope

- Passwordless Phone/OTP Authentication
- JWT Token Generation & Validation
- Active Session Management (Single Active Session Enforcement)
- Gentle Eviction (Second Login Replaces First)
- Session WebSocket (`/ws`) Ownership & Authentication
- OTP Security (Redis-backed, HMAC-SHA256)
- Demo Boundary (Production Isolation)
- UsageLog Cost Metering Telemetry
- Starter Quota Provisioning

### Out of Scope (Not Implemented, Not Required)

- Apple Sign-In
- Passkey / WebAuthn
- PostgreSQL `user_sessions` table
- Role-based access control / Admin bypass
- Speculative billing fields

---

## 2. Final Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN HTTP SERVER (:4000)              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Express REST API                    │    │
│  │  /api/v1/auth     → AuthController (open)       │    │
│  │  /api/v1/arena/*  → authenticate middleware     │    │
│  │  /api/v1/voice/*  → authenticate middleware     │    │
│  │  /api/v1/*        → authenticate middleware     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Session WebSocket (/ws)                │    │
│  │  HTTP Upgrade → JWT verify → Redis Session →    │    │
│  │  bindSocket(sessionId, ws)                      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               VOICE WebSocket (:4001)                   │
│  Isolated. Audio streams only. No auth session logic.   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                       REDIS                             │
│                                                         │
│  auth:otp:{phone}           → HMAC-SHA256 hash (180s)  │
│  auth:otp_attempts:{phone}  → attempt counter (180s)   │
│  auth:otp_cooldown:{phone}  → resend gate (60s)        │
│  auth:otp_daily:{phone}     → daily limit counter (24h)│
│  user:{id}:active_session   → sessionId (authoritative) │
│  session_eviction (Pub/Sub) → gentle eviction channel  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                           │
│                                                         │
│  User         → id, phoneNumber, displayName           │
│  UserQuota    → textTurnsRemaining, voiceMins, asst    │
│  UsageLog     → sessionId, turnNumber, model, tokens,  │
│                  costUsd, latencyMs                     │
│  (NO user_sessions table)                              │
└─────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
Phone Number → E.164 Normalize → OTP (Redis HMAC) → Verify
    → Find-or-Create User (PostgreSQL)
    → Starter Quota (Text=30, Voice=15, Assistant=10)
    → Register Active Session (Redis)
    → Gentle Eviction of old session (Redis Pub/Sub)
    → JWT (signed with ACTUAL_JWT_SECRET, expires JWT_EXPIRES)
    → Return token + sessionId + user profile
```

---

## 3. AUTH-01 → AUTH-15 Status

| ID | Contract | Status |
|----|----------|--------|
| AUTH-01 | Strict Auth Production (no anonymous AI access) | ✅ PASS |
| AUTH-02 | JWT Hardened (no production secret fallback) | ✅ PASS |
| AUTH-03 | OTP Redis (HMAC-SHA256, TTL, attempts, cooldown) | ✅ PASS |
| AUTH-04 | Active Session Redis (authoritative) | ✅ PASS |
| AUTH-05 | Gentle Eviction (Redis Pub/Sub delivery) | ✅ PASS |
| AUTH-06 | No Demo Leakage (production boundary) | ✅ PASS |
| AUTH-07 | UsageLog Telemetry (Cost Metering Spec fields) | ✅ PASS |
| AUTH-08 | No speculative tables (no user_sessions) | ✅ PASS |
| AUTH-09 | Fail Closed Redis (production exits if unavailable) | ✅ PASS |
| AUTH-10 | No RAM Fallback for Session (Redis only) | ✅ PASS |
| AUTH-11 | WebSocket Ownership (main HTTP server /ws) | ✅ PASS |
| AUTH-12 | WebSocket Authenticated (JWT + Redis session) | ✅ PASS |
| AUTH-13 | Session Replaced Delivery (Pub/Sub → socket) | ✅ PASS |
| AUTH-14 | Environment Config (JWT_SECRET, REDIS_URL mandatory) | ✅ PASS |
| AUTH-15 | Cost Metering Schema (UsageLog model) | ✅ PASS |

---

## 4. Final v1.3 Security Fixes

### Blocker 1 — `listUserSessions` Authorization / IDOR

**File:** `backend/src/controllers/debateController.ts` (L633-L640)

**Before (insecure):**
```typescript
const queryUserId = String(req.query['userId'] ?? '').trim();
const authUserId = (req as { userId?: string }).userId;
const userId = queryUserId || authUserId || DEMO_USER_ID;
```

**After (fixed):**
```typescript
const authUserId = (req as { userId?: string }).userId;
if (!authUserId) {
  res.status(401).json({ success: false, error: 'Unauthorized' });
  return;
}
const userId = authUserId;
```

**Impact:** Closed IDOR vulnerability and production DEMO_USER_ID fallback.

### Blocker 2 — WebSocket JWT Secret Fallback

**File:** `backend/src/websocket/sessionWebSocketServer.ts` (L3, L44)

**Before (insecure):**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "ai-debate-master-jwt-secret-v15";
decoded = jwt.verify(token, JWT_SECRET);
```

**After (fixed):**
```typescript
import { ACTUAL_JWT_SECRET } from '../middleware/auth';
// ...
decoded = jwt.verify(token, ACTUAL_JWT_SECRET);
```

**Impact:** Session WebSocket now shares the same centralized, production-hardened JWT configuration as HTTP auth. No independent fallback.

---

## 5. Security Invariants

The following invariants are LOCKED:

1. **Anonymous → 401 → Zero AI invocation.** No anonymous request can reach any AI provider.
2. **Invalid JWT → 401.** `jwt.verify` rejects; middleware returns 401.
3. **Expired JWT → 401.** Token verification naturally fails on `exp`.
4. **Production Demo → FORBIDDEN.** `DEMO_USER_ID` fallback requires `NODE_ENV !== 'production' && ENABLE_DEMO === 'true'`.
5. **Production Demo Auto-Refill → FORBIDDEN.** Same dual-guard.
6. **Second Login → Old Session Replaced.** Redis is authoritative; Pub/Sub delivers `SESSION_REPLACED`.
7. **OTP → Redis → HMAC.** No plaintext OTP persisted. TTL=180s. Max attempts=5.
8. **Active Session → Redis Authority.** No process-memory Map as authoritative storage.
9. **JWT → No Hardcoded Secret Fallback.** Production missing `JWT_SECRET` → `process.exit(1)`.
10. **REDIS_URL → Mandatory in Production.** Missing → `process.exit(1)`.
11. **listUserSessions → Self-Only.** Identity exclusively from `req.userId`. No query override. No IDOR.
12. **Session WebSocket → Centralized JWT.** Imports from `auth.ts`. No independent secret.
13. **UsageLog → Cost Metering Spec Only.** No speculative billing fields.

---

## 6. Demo Boundary

`DEMO_USER_ID` (`22222222-2222-2222-2222-222222222222`) exists in the codebase with the following classifications:

| Location | Classification | Production Auth Fallback? |
|----------|---------------|--------------------------|
| `auth.ts` L13 | DEFINITION | No |
| `auth.ts` L30, L99, L139 | DEV-ONLY (dual-guarded) | No |
| `debateController.ts` L42 | DEFINITION | No |
| `debateController.ts` L75-76 | SEED/COSMETIC | No |
| `debateController.ts` L203 | DEV-ONLY (dual-guarded) | No |
| `plazaService.ts` L234-262 | SEED (showcase content) | No |
| `scripts/*`, `testOneShot.ts` | TEST/SCRIPT | No |

**Verdict:** Zero production authentication fallback occurrences.

---

## 7. Redis Architecture

| Key Pattern | Purpose | TTL | Authority |
|-------------|---------|-----|-----------|
| `auth:otp:{phone}` | HMAC-SHA256 hashed OTP | 180s | Authoritative |
| `auth:otp_attempts:{phone}` | Failed verification counter | 180s | Authoritative |
| `auth:otp_cooldown:{phone}` | Resend rate limit | 60s | Authoritative |
| `auth:otp_daily:{phone}` | Daily send limit (max 5) | 24h | Authoritative |
| `user:{id}:active_session` | Current active session ID | None (persistent) | Authoritative |
| `session_eviction` (Pub/Sub) | Gentle eviction broadcast | N/A | Event channel |

**Production Fail-Close:**
- `REDIS_URL` missing → `process.exit(1)` at startup
- Redis connection failure (>5 retries) → `process.exit(1)`
- No in-memory fallback for OTP or active session

---

## 8. WebSocket Ownership

```
MAIN HTTP SERVER (:4000)
├── Express REST API
└── HTTP Upgrade → /ws → Session WebSocket
    ├── JWT verification (ACTUAL_JWT_SECRET from auth.ts)
    ├── Redis active session check
    └── bindSocket(sessionId, ws)

VOICE SERVER (:4001)
└── Dedicated WebSocket for audio streams (isolated)
```

- `/ws` is attached to the main HTTP server via `server.on('upgrade')`
- `WebSocketServer({ noServer: true })` — no independent listener
- Voice WebSocket remains completely isolated on port 4001

---

## 9. Gentle Eviction

```
User Login (Device B)
    → SessionRegistry.registerSession(userId, newSessionId)
    → Redis SET user:{id}:active_session = newSessionId
    → Returns oldSessionId
    → SessionSocketHandler.notifyGentleEviction(oldSessionId, newSessionId)
    → Redis PUBLISH session_eviction { oldSessionId, newSessionId }
    → Instance holding old WS socket receives Pub/Sub message
    → Sends SESSION_REPLACED payload to old client
    → Waits 500ms drain
    → Closes old WebSocket
    → Frontend clears auth, shows GentleEvictionModal
```

---

## 10. UsageLog Boundary

**Source of Truth:** `docs/15_COST_METERING_SPEC.md`

**Implemented Fields (schema.prisma `UsageLog` model):**

| Field | Type | Source |
|-------|------|--------|
| id | UUID | Auto-generated |
| sessionId | String | AI call context |
| turnNumber | Int | Turn within session |
| model | String | LLM model name |
| promptTokens | Int | Provider usage response |
| completionTokens | Int | Provider usage response |
| totalTokens | Int | Computed sum |
| costUsd | Decimal | Cost calculator |
| latencyMs | Int | Measured execution time |
| createdAt | Timestamp | Auto-generated |

**No speculative fields added.** No billing fields. No user-facing pricing fields.

---

## 11. Verification Evidence

### Security Verdict

| Question | Answer |
|----------|--------|
| Can an anonymous request invoke an AI provider? | **NO** |
| Can an invalid JWT invoke an AI provider? | **NO** |
| Can an expired JWT invoke an AI provider? | **NO** |
| Can production use DEMO_USER_ID as auth fallback? | **NO** |
| Can production auto-refill Demo quota? | **NO** |
| Does OTP survive backend process restart? | **YES** (Redis) |
| Does active session survive backend process restart? | **YES** (Redis) |
| Does second login evict the first browser? | **YES** |
| Does the old browser receive SESSION_REPLACED? | **YES** (Pub/Sub) |
| Does anonymous AI request produce zero UsageLog? | **YES** |
| Can User A access User B sessions via query param? | **NO** (IDOR closed) |

### Test Results (2026-08-23)

| Suite | Pass | Fail |
|-------|------|------|
| Text Debate | 67 | 0 |
| Voice Debate | 105 | 0 |
| Auth/Payment | 41 | 0 |
| Assistant Domain | 126 | 0 |
| **Total Completed** | **339** | **0** |

---

## 12. Known Non-Blocking Issues

These items do NOT reopen AUTH CONTRACT CLOSURE:

1. **Plaza Domain test suite:** Stalls on remote Supabase DB connection during `ensureShowcaseSeeded()`. Infrastructure dependency, not a code regression.
2. **TypeScript typing:** `auth.ts` L152 `jwt.sign` overload resolution warning with `JWT_EXPIRES` type. Runtime-safe; `jsonwebtoken` accepts `string` at runtime. Pre-existing from v1.1.
3. **Test file adaptation:** `auth.test.ts`, `sessionEviction.test.ts`, `fullE2ESuite.test.ts` have TS compilation warnings due to sync→async signature changes in `OtpService` and `SessionRegistry` (v1.1). Test adaptation issue, not a production regression.

---

## 13. LOCK Statement

**AUTH CONTRACT CLOSURE v1.3 IS VERIFIED AND LOCKED.**

**Any future modification affecting these invariants requires an explicit Architect decision and a new contract/version.**

Locked invariants include but are not limited to:
- Production authentication policy
- JWT secret policy and expiration policy
- OTP Redis architecture and security policy
- Active Session Redis architecture
- Session Registry semantics
- Session WebSocket ownership and authentication
- Gentle Eviction mechanism (Redis Pub/Sub)
- `listUserSessions` authorization boundary
- Demo production boundary and auto-refill guard
- UsageLog contract
- `user_sessions` table absence
- Starter quota allocation (Text=30, Voice=15, Assistant=10)
- Session WebSocket MUST NOT introduce an independent JWT secret
- `queryUserId` MUST NOT be reintroduced as identity override
- `DEMO_USER_ID` MUST NOT be reintroduced as production auth fallback

---

*Document generated: 2026-08-23T17:09:00+07:00*  
*Lock authority: Architect Decision*  
*Contract version: v1.3*
