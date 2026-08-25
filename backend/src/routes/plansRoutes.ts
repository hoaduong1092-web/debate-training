/**
 * Dynamic Plans catalogue route.
 * Mounted at /api/v1/plans
 * Authority: Master Blueprint V15.0 (docs/03_DATABASE_SPEC.md & docs/16_PLAN_QUOTA_BUSINESS_SPEC.md)
 */

import { Router, RequestHandler } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { getSubscriptionPlans } from '../controllers/userController';

const router = Router();

// GET /api/v1/plans
// Returns dynamic subscription tier catalogue read directly from Database (SubscriptionPlan model).
// Public endpoint — zero LLM calls, zero sensitive data.
router.get('/', (req, res) => getSubscriptionPlans(req as unknown as AuthRequest, res));

export default router;
