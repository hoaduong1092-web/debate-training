/**
 * Voice Session REST Controller.
 * Spec: docs/VOICE_QUOTA_CONTRACT_v1.0.md
 * Phase: B3 — Voice Session Domain Engine & Decoupling
 */

import { Request, Response } from 'express';
import { VoiceSessionService } from '../services/voiceSessionService';
import { VoiceSessionDomainError } from '../errors/voiceSessionErrors';

export async function createVoiceSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const authUserId = (req as any).userId;
    const { userId = authUserId, debateSessionId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'Missing required field: userId' });
      return;
    }

    const session = await VoiceSessionService.createVoiceSession({
      userId,
      debateSessionId,
    });

    res.status(201).json({
      success: true,
      voice_session: session,
    });
  } catch (err: any) {
    handleControllerError(res, err);
  }
}

export async function getVoiceSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || '').trim();
    const authUserId = (req as any).userId;

    if (!id) {
      res.status(400).json({ error: 'Missing session id' });
      return;
    }

    const session = await VoiceSessionService.getVoiceSession(id, authUserId);
    res.json({
      success: true,
      voice_session: session,
    });
  } catch (err: any) {
    handleControllerError(res, err);
  }
}

export async function finalizeVoiceSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || '').trim();
    const authUserId = (req as any).userId;
    const userId = authUserId || req.body.userId;
    const { actualDurationMs, reason } = req.body;

    if (!id || !userId) {
      res.status(400).json({ error: 'Missing required fields: id, userId' });
      return;
    }

    const result = await VoiceSessionService.finalizeVoiceSession({
      voiceSessionId: id,
      userId,
      actualDurationMs,
      reason,
    });

    res.json({
      success: true,
      already_finalized: result.alreadyFinalized,
      voice_session: result.session,
    });
  } catch (err: any) {
    handleControllerError(res, err);
  }
}

export async function abortVoiceSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || '').trim();
    const authUserId = (req as any).userId;
    const { userId = authUserId, reason } = req.body;

    if (!id || !userId) {
      res.status(400).json({ error: 'Missing required fields: id, userId' });
      return;
    }

    const result = await VoiceSessionService.abortVoiceSession({
      voiceSessionId: id,
      userId,
      reason,
    });

    res.json({
      success: true,
      already_finalized: result.alreadyFinalized,
      voice_session: result.session,
    });
  } catch (err: any) {
    handleControllerError(res, err);
  }
}

export async function getVoiceEntitlementHandler(req: Request, res: Response): Promise<void> {
  try {
    const authUserId = (req as any).userId;
    const queryUserId = String(req.query.userId || authUserId || '');

    if (!queryUserId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    const entitlement = await VoiceSessionService.resolveVoiceEntitlement(queryUserId);
    res.json({
      success: true,
      entitlement,
    });
  } catch (err: any) {
    handleControllerError(res, err);
  }
}

function handleControllerError(res: Response, err: any): void {
  if (err instanceof VoiceSessionDomainError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
      details: err.details,
    });
    return;
  }

  console.error('[VOICE_SESSION_CONTROLLER_ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.',
  });
}
