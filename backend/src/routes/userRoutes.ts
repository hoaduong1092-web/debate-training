/**
 * Profile & Subscription Domain Routes
 *
 * Mounts endpoints as specified in docs/02_DOMAIN_SPEC.md §9:
 *   GET /api/v1/users/profile  — Full profile + real-time quota + stats
 *   PUT /api/v1/users/profile  — Update display name / language preference
 *   GET /api/v1/plans          — Subscription tier catalogue
 *
 * STRICT NO-LLM & COST SAFETY:
 *   Zero LLM calls and zero quota deduction for all Profile endpoints.
 *   All operations are pure DB reads or lightweight writes.
 *
 * Spec: docs/02_DOMAIN_SPEC.md §9, docs/16_PLAN_QUOTA_BUSINESS_SPEC.md
 */

import { Router, RequestHandler } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getUserProfile,
  updateUserProfile,
  getSubscriptionPlans,
} from '../controllers/userController';

const router = Router();

// GET /api/v1/users/profile
// Returns user identity, real-time quota balances, and session statistics.
router.get('/profile', authenticate, getUserProfile as unknown as RequestHandler);

// PUT /api/v1/users/profile
// Updates full_name and/or language_preference.
router.put('/profile', authenticate, updateUserProfile as unknown as RequestHandler);

export default router;

// Note: /api/v1/plans is mounted separately in index.ts via plansRouter
// to keep routing concerns clean (user-resource vs product-catalogue).
