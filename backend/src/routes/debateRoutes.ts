import { Router } from 'express';
import {
  createDebateSession,
  handleDebateMessage,
  listUserSessions,
  getSessionDetail,
  deleteSession,
  completeSession,
  handleBulkDeleteSessions,
} from '../controllers/debateController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes use authenticate — falls back to demo mode when no token is supplied.
// Session creation — consumes quota ONCE per session.
router.post('/debates', authenticate, createDebateSession);

// Turn message — does NOT consume quota.
router.post('/sessions/:sessionId/message', authenticate, handleDebateMessage);

// ── History endpoints ──────────────────────────────────────────────────────
router.get('/sessions', authenticate, listUserSessions);
router.get('/sessions/:sessionId', authenticate, getSessionDetail);

// Bulk delete (no :id param — must be registered BEFORE the parameterized delete)
router.delete('/sessions', authenticate, handleBulkDeleteSessions as unknown as import('express').RequestHandler);

// Single-session delete
router.delete('/sessions/:sessionId', authenticate, deleteSession);

// ── Session lifecycle ──────────────────────────────────────────────────────
// PUT /api/v1/arena/sessions/:sessionId/complete — Mark session as COMPLETED.
// Zero LLM calls. Zero quota deduction. Idempotent.
router.put('/sessions/:sessionId/complete', authenticate, completeSession);

export default router;

