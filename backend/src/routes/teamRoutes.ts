/**
 * Team Pass & School Bundles Routes (Spec 16 v1.2.0 Phase 2)
 *
 * Endpoints:
 *   POST /api/v1/teams/redeem   — Redeem invitation code
 *   GET  /api/v1/teams/my-teams — Get user team groups & rosters
 *
 * Zero Live AI calls.
 */

import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth';
import {
  redeemTeamInvitationHandler,
  getMyTeamsHandler,
} from '../controllers/teamController';

const router = Router();

router.post('/redeem', authenticate, redeemTeamInvitationHandler as unknown as RequestHandler);
router.get('/my-teams', authenticate, getMyTeamsHandler as unknown as RequestHandler);

export default router;