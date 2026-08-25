/**
 * Assistant Domain Routes
 *
 * Mounts endpoints as specified in docs/04_API_SPEC.md §5:
 *   POST /api/v1/speeches/draft  — Speech Draft generation
 *   POST /api/v1/reports/analyze — Motion Analysis Report generation
 *   POST /api/v1/arguments/refine — AI Argument Refinement (V1)
 *
 * All routes require strict authentication (authenticateToken middleware).
 * userId is extracted exclusively from verified auth context — never from request body/query.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createSpeechDraft, createMotionAnalysis, refineArgument } from '../controllers/assistantController';
import type { AuthRequest } from '../middleware/auth';
import type { Response } from 'express';

const router = Router();

// POST /api/v1/speeches/draft
// Spec: 04_API_SPEC.md §5, Task §1.A
router.post(
  '/speeches/draft',
  authenticate,
  (req, res) => createSpeechDraft(req as AuthRequest, res as Response),
);

// POST /api/v1/reports/analyze
// Spec: 04_API_SPEC.md §5, Task §1.B
router.post(
  '/reports/analyze',
  authenticate,
  (req, res) => createMotionAnalysis(req as AuthRequest, res as Response),
);

// POST /api/v1/arguments/refine
// Spec: AI_ARGUMENT_REFINEMENT_SPEC.md §11
// AI Argument Refinement — refine raw user idea into structured C-R-E format.
// Consumes 1 Assistant Credit on success (post-validate semantics).
router.post(
  '/arguments/refine',
  authenticate,
  (req, res) => refineArgument(req as AuthRequest, res as Response),
);

export default router;

