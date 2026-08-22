/**
 * Profile Analytics & Skill Tree Domain Routes (v15.0.0)
 *
 * Source of Truth: 06_SKILL_TREE_SPEC.md, 07_SCORING_SPEC.md & Blueprint V15.0
 *
 * Mounts:
 *   GET /api/v1/profile/analytics   — Thinking Radar, Fallacy Diagnostics, WPM History & Voice Telemetry
 *   GET /api/v1/profile/skill-tree  — 7-Level Mastery Progression, 90.00% Unlock Gate, L3 Socratic Mode
 *
 * Strict JWT auth required (IDOR-safe). Zero LLM calls. Pure derived views.
 */

import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProfileAnalytics,
  getSkillTreeProgress,
} from '../controllers/profileController';

const router = Router();

// GET /api/v1/profile/analytics
// Returns 4-axis Thinking Radar, Fallacy counts/tips, WPM History, and Period Confidence.
router.get('/analytics', authenticate, getProfileAnalytics as unknown as RequestHandler);

// GET /api/v1/profile/skill-tree
// Returns 7-Level Pedagogical Skill Tree with sequential 90% unlock and L3 Socratic flag.
router.get('/skill-tree', authenticate, getSkillTreeProgress as unknown as RequestHandler);

export default router;
