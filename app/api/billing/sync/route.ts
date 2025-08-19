import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { isBillingAdmin } from "@/lib/billing";
import { NextRequest, NextResponse } from "next/server";
import { $Enums } from "@prisma/client";

export async function POST(request: NextRequest) {
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
    const body: { sessionId?: string } = await request
      .json()
      .catch(() => ({}) as { sessionId?: string });
    const sessionId: string | undefined = body?.sessionId;

    // If we have a Checkout session id, use it to bind customer/subscription to this org
    if (sessionId) {
      const checkout = await stripe.checkout.sessions.retrieve(sessionId);
      const customerId = (checkout.customer as string) || undefined;
      const subscriptionId = (checkout.subscription as string) || undefined;
      if (customerId) {
        await db.organization.update({
          where: { id: user.organizationId },
          data: { stripeCustomerId: customerId },
        });
      }
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const unixEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
        await db.organization.update({
          where: { id: user.organizationId },
          data: {
            plan: "TEAM",
            subscriptionStatus: (sub.status as unknown as $Enums.SubscriptionStatus) ?? null,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: typeof unixEnd === "number" ? new Date(unixEnd * 1000) : null,
          },
        });
      }
    }

    if (!user.organization.stripeCustomerId && !sessionId) {
      return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
    }

    // Find active subscription for the customer
    const subs = await stripe.subscriptions.list({
      customer: user.organization.stripeCustomerId!,
      status: "all",
      limit: 1,
    });
    const sub = subs.data[0] || null;

    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        plan: sub ? "TEAM" : "FREE",
        subscriptionStatus: (sub?.status as unknown as $Enums.SubscriptionStatus) ?? null,
        stripeCustomerId: user.organization.stripeCustomerId,
        stripeSubscriptionId: sub?.id ?? null,
        currentPeriodEnd:
          sub &&
          typeof (sub as unknown as { current_period_end?: number }).current_period_end === "number"
            ? new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000)
            : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
