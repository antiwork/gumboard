import { Organization, SubscriptionStatus } from "@prisma/client";

// Free plan member limit constant
export const FREE_CAP = 3;

export function isOrgPaid(
  org: Pick<Organization, "subscriptionStatus" | "currentPeriodEnd" | "plan">
): boolean {
  const status = org.subscriptionStatus as SubscriptionStatus | null;
  const withinPeriod = !org.currentPeriodEnd || org.currentPeriodEnd > new Date();
  // Only allow "active" or "trialing" status for paid plans
  return org.plan === "TEAM" && (status === "active" || status === "trialing") && withinPeriod;
}

export function isBillingAdmin(user: { role?: string | null; isAdmin?: boolean | null }): boolean {
  // Back-compat: allow either role OWNER/ADMIN or legacy isAdmin flag
  return user.role === "OWNER" || user.role === "ADMIN" || !!user.isAdmin;
}

export class PaywallError extends Error {
  public status = 402;
  public payload = {
    code: "PAYWALL" as const,
    upgradeUrl: "/settings/organization#billing",
    message: "Upgrade to Team to invite more than 2 teammates.",
  };
  constructor(message?: string) {
    super(message || "Paywalled feature");
  }
}
