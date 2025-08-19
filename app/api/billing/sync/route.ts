import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { isBillingAdmin } from "@/lib/billing";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });
    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    if (!isBillingAdmin(user)) {
      return NextResponse.json({ error: "Only admins can manage billing" }, { status: 403 });
    }
    if (!user.organization.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
    }

    // Find active subscription for the customer
    const subs = await stripe.subscriptions.list({
      customer: user.organization.stripeCustomerId,
      status: "all",
      limit: 1,
    });
    const sub = subs.data[0] || null;

    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        plan: sub ? "TEAM" : "FREE",
        subscriptionStatus: (sub?.status as any) ?? null,
        stripeCustomerId: user.organization.stripeCustomerId,
        stripeSubscriptionId: sub?.id ?? null,
        currentPeriodEnd: sub ? new Date((sub as any).current_period_end * 1000) : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


