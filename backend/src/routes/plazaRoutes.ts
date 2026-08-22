/**
 * Plaza Domain Routes
 *
 * Mounts endpoints as specified in Master Blueprint v16.x & PLAZA_PHASE1_IMPLEMENTATION_TASK.md:
 *   GET    /api/v1/plaza/feed                         — Plaza Feed (public showcase)
 *   GET    /api/v1/plaza/sessions/:sessionId          — Public Debate Detail (Static Read)
 *   POST   /api/v1/plaza/sessions/:sessionId/like     — Add Like
 *   DELETE /api/v1/plaza/sessions/:sessionId/like     — Remove Like
 *   POST   /api/v1/plaza/sessions/:sessionId/favorite — Add Favorite Bookmark
 *   DELETE /api/v1/plaza/sessions/:sessionId/favorite — Remove Favorite Bookmark
 *   POST   /api/v1/plaza/sessions/:sessionId/view     — Record View Count
 *
 * STRICT ZERO-LLM & ZERO-QUOTA INVARIANT:
 *   Zero LLM calls and zero quota deduction for all Plaza endpoints.
 *   Feed and Detail routes are static read.
 *   Like, Favorite, and View are lightweight persisted writes.
 *
 * Spec: Master Blueprint v16.x, PLAZA_PHASE1_IMPLEMENTATION_TASK.md
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPlazaFeed,
  getPublicDebateDetail,
  addLike,
  removeLike,
  addFavorite,
  removeFavorite,
  recordView,
} from '../controllers/plazaController';

const router = Router();

// GET /api/v1/plaza/feed
// Returns curated public showcase debates with sorting (latest/popular) and keyword search.
router.get('/feed', authenticate, getPlazaFeed);

// GET /api/v1/plaza/sessions/:sessionId
// Returns complete static transcript, C-R-E analysis, and Logic Coach feedback.
router.get('/sessions/:sessionId', authenticate, getPublicDebateDetail);

// POST /api/v1/plaza/sessions/:sessionId/like
// Add like for the authenticated user on a public debate session.
router.post('/sessions/:sessionId/like', authenticate, addLike);

// DELETE /api/v1/plaza/sessions/:sessionId/like
// Remove like for the authenticated user on a public debate session.
router.delete('/sessions/:sessionId/like', authenticate, removeLike);

// POST /api/v1/plaza/sessions/:sessionId/favorite
// Add favorite bookmark for the authenticated user.
router.post('/sessions/:sessionId/favorite', authenticate, addFavorite);

// DELETE /api/v1/plaza/sessions/:sessionId/favorite
// Remove favorite bookmark for the authenticated user.
router.delete('/sessions/:sessionId/favorite', authenticate, removeFavorite);

// POST /api/v1/plaza/sessions/:sessionId/view
// Record view count for a public debate session.
router.post('/sessions/:sessionId/view', recordView);

export default router;
