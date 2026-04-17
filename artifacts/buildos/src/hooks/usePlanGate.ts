interface PlanGateResult {
  isPlanError: boolean;
  feature: string;
  currentPlan: string;
  requiredPlan: string;
}

export function usePlanGate(error: unknown): PlanGateResult {
  if (!error) return { isPlanError: false, feature: '', currentPlan: '', requiredPlan: '' };

  const apiError = error as { status?: number; data?: unknown };
  if (apiError?.status === 403) {
    const data = apiError.data as Record<string, string> | null;
    if (data?.error === 'plan_required') {
      return {
        isPlanError:  true,
        feature:      data.feature      ?? '',
        currentPlan:  data.currentPlan  ?? 'free',
        requiredPlan: data.requiredPlan ?? 'pro',
      };
    }
  }
  return { isPlanError: false, feature: '', currentPlan: '', requiredPlan: '' };
}

export function getJwtPlan(): string {
  const token = localStorage.getItem('slably_token');
  if (!token) return 'free';
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.organizationPlan ?? 'free';
  } catch {
    return 'free';
  }
}

export function getJwtStatus(): string {
  const token = localStorage.getItem('slably_token');
  if (!token) return '';
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.stripeSubscriptionStatus ?? '';
  } catch {
    return '';
  }
}
