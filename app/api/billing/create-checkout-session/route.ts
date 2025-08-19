import { auth } from "@/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { isBillingAdmin, isOrgPaid } from "@/lib/billing";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = await request.json().catch(() => ({ orgId: null }));

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });
    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    if (orgId && orgId !== user.organizationId) {
      return NextResponse.json({ error: "Invalid organization" }, { status: 403 });
    }
    if (!isBillingAdmin(user)) {
      return NextResponse.json({ error: "Only admins can manage billing" }, { status: 403 });
    }

    // Duplicate subscription guard
    if (isOrgPaid(user.organization)) {
      if (!user.organization.stripeCustomerId) {
        return NextResponse.json({ error: "Already subscribed, but no customer found" }, { status: 400 });
      }
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.organization.stripeCustomerId,
        return_url: `${env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || ""}/settings/organization#billing`,
      });
      return NextResponse.json({ url: portalSession.url, portal: true });
    }

    const successUrl = `${env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || ""}/settings/organization#billing`;
    const cancelUrl = successUrl;

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: env.STRIPE_PRICE_TEAM_MONTHLY, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.organizationId,
      metadata: { orgId: user.organizationId },
      ...(user.organization.stripeCustomerId
        ? { customer: user.organization.stripeCustomerId }
        : { customer_email: user.email }),
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


