import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  // If Stripe is disabled or no secret key, do nothing (CI-safe)
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ ok: true });

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    const orgId = (s.client_reference_id || s.metadata?.organizationId) as string | undefined;
    const subId = s.subscription as string | undefined;

    if (!orgId || !subId) {
      return NextResponse.json({ error: "Session missing orgId/subscription" }, { status: 400 });
    }

    await db.organization.update({
      where: { id: orgId },
      data: {
        plan: "PRO",
        stripeCustomerId: (s.customer as string) ?? undefined,
        stripeSubscriptionId: subId,
        stripeStatus: "active",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
