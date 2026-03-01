/**
 * Plan limits for CasAlert tiers.
 */

export type PlanTier = "free" | "starter" | "pro";

export const PROPERTY_LIMITS: Record<PlanTier, number> = {
  free: 1,
  starter: 5,
  pro: Infinity,
};

export function canAddProperty(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PROPERTY_LIMITS[plan];
}

export function propertyLimitLabel(plan: PlanTier): string {
  const limit = PROPERTY_LIMITS[plan];
  return limit === Infinity ? "Unlimited" : String(limit);
}
