import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
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
