/**
 * Plaza Domain Controller
 *
 * Handles:
 *   GET    /api/v1/plaza/feed                         — Plaza Feed (public showcase sessions)
 *   GET    /api/v1/plaza/sessions/:sessionId          — Public Debate Detail (Static Read)
 *   POST   /api/v1/plaza/sessions/:sessionId/like     — Add Like
 *   DELETE /api/v1/plaza/sessions/:sessionId/like     — Remove Like
 *   POST   /api/v1/plaza/sessions/:sessionId/favorite — Add Favorite Bookmark
 *   DELETE /api/v1/plaza/sessions/:sessionId/favorite — Remove Favorite Bookmark
 *   POST   /api/v1/plaza/sessions/:sessionId/view     — Record View Count
 *
 * STRICT ZERO-LLM & ZERO-QUOTA INVARIANT:
 *   Zero LLM API calls. Zero quota deduction.
 *   All operations read persisted learning artifacts and perform lightweight DB writes.
 *
 * Spec: Master Blueprint v16.x, PLAZA_PHASE1_IMPLEMENTATION_TASK.md
 */

import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { PlazaService } from '../services/plazaService';

export { PlazaService };

/**
 * GET /api/v1/plaza/feed
 *
 * Returns paginated, filterable list of public showcase debate sessions.
 *
 * Query params:
 *   sort   = "latest" (default) | "popular"
 *   query  = keyword search string
 *   limit  = number (default: 20, max: 50)
 *   offset = number (default: 0)
 *
 * Zero LLM calls. Zero quota deduction.
 */
export async function getPlazaFeed(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId ?? 'anonymous';
    const sort = String(req.query['sort'] ?? 'latest').toLowerCase() as 'latest' | 'popular';
    const query = String(req.query['query'] ?? '');
    const rawLimit = parseInt(String(req.query['limit'] ?? '20'), 10);
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 20 : rawLimit, 50));

    let offset = 0;
    if (req.query['offset'] !== undefined) {
      const parsedOffset = parseInt(String(req.query['offset']), 10);
      offset = isNaN(parsedOffset) ? 0 : Math.max(0, parsedOffset);
    } else if (req.query['page'] !== undefined) {
      const parsedPage = parseInt(String(req.query['page']), 10);
      const page = isNaN(parsedPage) ? 1 : Math.max(1, parsedPage);
      offset = (page - 1) * limit;
    }
    const currentPage = Math.floor(offset / limit) + 1;

    const result = await PlazaService.getFeed({
      sort,
      query,
      limit,
      offset,
      userId,
    });

    res.json({
      success: true,
      total: result.total,
      sort: result.sort,
      page: currentPage,
      limit: result.limit,
      offset: result.offset,
      items: result.items,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_FEED_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * GET /api/v1/plaza/sessions/:sessionId
 *
 * Returns the complete static transcript, C-R-E analysis, and Logic Coach
 * feedback for a public Plaza debate.
 *
 * STRICT STATIC READ: Zero LLM calls, zero quota deduction.
 */
export async function getPublicDebateDetail(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId ?? 'anonymous';
    const sessionId = String(req.params['sessionId'] ?? '').trim();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const detail = await PlazaService.getSessionDetail(sessionId, userId);
    if (!detail) {
      res.status(404).json({ error: 'Plaza session not found' });
      return;
    }

    res.json({
      success: true,
      session: detail.session,
      turns: detail.turns,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_DETAIL_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * POST /api/v1/plaza/sessions/:sessionId/like
 *
 * Adds like state for the current user on the given session.
 * Atomic DB duplicate prevention via UNIQUE constraint.
 *
 * Zero LLM calls. Zero quota deduction.
 */
export async function addLike(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId ?? 'anonymous';
    const sessionId = String(req.params['sessionId'] ?? '').trim();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const result = await PlazaService.addLike(sessionId, userId);
    if (!result) {
      res.status(404).json({ error: 'Plaza session not found' });
      return;
    }

    res.json({
      success: true,
      session_id: sessionId,
      is_liked: true,
      like_count: result.like_count,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_ADD_LIKE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * DELETE /api/v1/plaza/sessions/:sessionId/like
 *
 * Removes like state for the current user on the given session.
 * Atomic DB removal.
 *
 * Zero LLM calls. Zero quota deduction.
 */
export async function removeLike(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId ?? 'anonymous';
    const sessionId = String(req.params['sessionId'] ?? '').trim();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const result = await PlazaService.removeLike(sessionId, userId);
    if (!result) {
      res.status(404).json({ error: 'Plaza session not found' });
      return;
    }

    res.json({
      success: true,
      session_id: sessionId,
      is_liked: false,
      like_count: result.like_count,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_REMOVE_LIKE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * POST /api/v1/plaza/sessions/:sessionId/favorite
 *
 * Adds bookmark for the current user.
 * User-specific bookmark state in database.
 *
 * Zero LLM calls. Zero quota deduction.
 */
export async function addFavorite(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId ?? 'anonymous';
    const sessionId = String(req.params['sessionId'] ?? '').trim();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const result = await PlazaService.addFavorite(sessionId, userId);
    if (!result) {
      res.status(404).json({ error: 'Plaza session not found' });
      return;
    }

    res.json({
      success: true,
      session_id: sessionId,
      is_favorited: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_ADD_FAVORITE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * DELETE /api/v1/plaza/sessions/:sessionId/favorite
 *
 * Removes bookmark for the current user.
 *
 * Zero LLM calls. Zero quota deduction.
 */
export async function removeFavorite(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as AuthRequest).userId ?? 'anonymous';
    const sessionId = String(req.params['sessionId'] ?? '').trim();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const result = await PlazaService.removeFavorite(sessionId, userId);
    if (!result) {
      res.status(404).json({ error: 'Plaza session not found' });
      return;
    }

    res.json({
      success: true,
      session_id: sessionId,
      is_favorited: false,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_REMOVE_FAVORITE_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}

/**
 * POST /api/v1/plaza/sessions/:sessionId/view
 *
 * Increments view count for the public debate session via atomic DB increment.
 *
 * Zero LLM calls. Zero quota deduction.
 */
export async function recordView(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = String(req.params['sessionId'] ?? '').trim();

    if (!sessionId) {
      res.status(400).json({ error: 'Missing sessionId' });
      return;
    }

    const result = await PlazaService.recordView(sessionId);
    if (!result) {
      res.status(404).json({ error: 'Plaza session not found' });
      return;
    }

    res.json({
      success: true,
      session_id: sessionId,
      view_count: result.view_count,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[PLAZA_VIEW_ERROR]', error);
    res.status(500).json({ error: msg });
  }
}
