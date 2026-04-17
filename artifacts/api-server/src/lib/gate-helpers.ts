import { Response, NextFunction } from 'express';
import { eq, and, ne, count } from 'drizzle-orm';
import { db, projectsTable } from '@workspace/db';
import type { AuthRequest } from './auth.js';
import { PLAN_LIMITS, FEATURE_PLAN_REQUIREMENTS, type PlanTier } from './plan-gates.js';

export function featureGate(feature: keyof typeof PLAN_LIMITS.free) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const plan = (req.user?.organizationPlan ?? 'free') as PlanTier;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    if (!limits[feature]) {
      res.status(403).json({
        error: 'plan_required',
        feature,
        currentPlan: plan,
        requiredPlan: FEATURE_PLAN_REQUIREMENTS[feature] ?? 'pro',
        upgradeUrl: '/pricing',
      });
      return;
    }
    next();
  };
}

export async function checkProjectLimit(req: AuthRequest, res: Response): Promise<boolean> {
  const user = req.user!;
  const plan = (user.organizationPlan ?? 'free') as PlanTier;
  const limit = PLAN_LIMITS[plan]?.maxActiveProjects ?? 0;

  if (limit === 0) {
    res.status(403).json({
      error: 'plan_required',
      feature: 'maxActiveProjects',
      currentPlan: plan,
      requiredPlan: 'starter',
      upgradeUrl: '/pricing',
    });
    return false;
  }

  if (!isFinite(limit)) return true;

  const [result] = await db
    .select({ value: count() })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.builderId, user.id),
        ne(projectsTable.status, 'completed'),
        ne(projectsTable.status, 'cancelled'),
      )
    );

  if ((result?.value ?? 0) >= limit) {
    res.status(403).json({
      error: 'plan_required',
      feature: 'maxActiveProjects',
      currentPlan: plan,
      requiredPlan: 'pro',
      upgradeUrl: '/pricing',
    });
    return false;
  }

  return true;
}
