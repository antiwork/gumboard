export type Plan = "FREE" | "PRO";

/** Free plan allows two INVITES (owner not counted) */
export const FREE_INVITES_LIMIT = 2;

export function invitesAllowedForPlan(plan: Plan) {
  return plan === "FREE" ? FREE_INVITES_LIMIT : Number.POSITIVE_INFINITY;
}

export function totalMembersCapForPlan(plan: Plan) {
  return plan === "FREE" ? FREE_INVITES_LIMIT + 1 : Number.POSITIVE_INFINITY;
}