import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

export type PlanTier = 'free' | 'starter' | 'pro' | 'business';

export const PLAN_LIMITS: Record<PlanTier, {
  maxActiveProjects: number;
  aiFeatures: boolean;
  clientPortal: boolean;
  digitalSignatures: boolean;
  changeOrders: boolean;
  rfqsPerMonth: number;
  maxTeamMembers: number;
}> = {
  free: {
    maxActiveProjects: 0,
    aiFeatures: false,
    clientPortal: false,
    digitalSignatures: false,
    changeOrders: false,
    rfqsPerMonth: 5,
    maxTeamMembers: 1,
  },
  starter: {
    maxActiveProjects: 3,
    aiFeatures: false,
    clientPortal: false,
    digitalSignatures: true,
    changeOrders: false,
    rfqsPerMonth: 10,
    maxTeamMembers: 2,
  },
  pro: {
    maxActiveProjects: Infinity,
    aiFeatures: true,
    clientPortal: true,
    digitalSignatures: true,
    changeOrders: true,
    rfqsPerMonth: Infinity,
    maxTeamMembers: 5,
  },
  business: {
    maxActiveProjects: Infinity,
    aiFeatures: true,
    clientPortal: true,
    digitalSignatures: true,
    changeOrders: true,
    rfqsPerMonth: Infinity,
    maxTeamMembers: Infinity,
  },
};

export const FEATURE_PLAN_REQUIREMENTS: Record<string, PlanTier> = {
  aiFeatures:         'pro',
  clientPortal:       'pro',
  changeOrders:       'pro',
  digitalSignatures:  'starter',
  unlimitedProjects:  'pro',
};

export function requireFeature(feature: keyof typeof PLAN_LIMITS.pro) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const plan = (req.user?.organizationPlan ?? 'free') as PlanTier;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    if (!limits[feature]) {
      res.status(403).json({
        error: 'plan_required',
        requiredPlan: FEATURE_PLAN_REQUIREMENTS[feature] ?? 'pro',
        message: 'Tu plan actual no incluye esta función.',
      });
      return;
    }
    next();
  };
}
