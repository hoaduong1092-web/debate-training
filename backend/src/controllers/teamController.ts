/**
 * Team Pass & School Bundles Controller (Spec 16 v1.2.0 Phase 2)
 *
 * Implements:
 *   - POST /api/v1/teams/redeem   — Redeem single-use invitation code & assign seat + provision independent quota
 *   - GET  /api/v1/teams/my-teams — Get user leading & member team groups, seats roster, and invite codes
 *
 * Zero Live AI calls. 100% deterministic database mutations.
 * Spec: docs/16_PLAN_QUOTA_BUSINESS_SPEC.md (v1.2.0), docs/02_DOMAIN_SPEC.md §9
 */

import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import {
  redeemTeamInvitation,
  getTeamGroupDetails,
} from '../services/teamManager';

/**
 * POST /api/v1/teams/redeem
 * Authenticated endpoint to redeem an invitation code.
 */
export async function redeemTeamInvitationHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const userId = req.userId;
    const { invitationCode } = req.body as { invitationCode?: string };

    if (!invitationCode || typeof invitationCode !== 'string') {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Vui lòng cung cấp mã mời hợp lệ (chuỗi ký tự)',
      });
      return;
    }

    const result = await redeemTeamInvitation(userId, invitationCode);

    if (!result.success) {
      const statusCode =
        result.error === 'INVITATION_NOT_FOUND'
          ? 404
          : result.error === 'ALREADY_REDEEMED' || result.error === 'ALREADY_MEMBER'
          ? 409
          : 400;

      res.status(statusCode).json(result);
      return;
    }

    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[REDEEM_INVITATION_ERROR]', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: msg });
  }
}

/**
 * GET /api/v1/teams/my-teams
 * Authenticated endpoint returning user's active team groups, seat rosters, and invitation codes (leader only).
 */
export async function getMyTeamsHandler(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const userId = req.userId;
    const teams = await getTeamGroupDetails(userId);

    res.json({
      success: true,
      teams,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[GET_MY_TEAMS_ERROR]', error);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: msg });
  }
}