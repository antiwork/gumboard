import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { isBillingAdmin, isOrgPaid } from "@/lib/billing";
import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get orgId from body, but it's optional since org is inferred from session
    const { orgId } = await request.json().catch(() => ({ orgId: null }));

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });
    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    // Only validate orgId if it was provided in the request
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
        return_url: `${getBaseUrl(request)}/settings/organization#billing`,
      });
      return NextResponse.json({ url: portalSession.url, portal: true });
    }

    const baseUrl = getBaseUrl(request);
    const successUrl = `${baseUrl}/settings/organization?session_id={CHECKOUT_SESSION_ID}#billing`;
    const cancelUrl = `${baseUrl}/settings/organization?canceled=1#billing`;

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: env.STRIPE_PRICE_ID
        ? [
            {
              price: env.STRIPE_PRICE_ID,
              quantity: 1,
            },
          ]
        : [
            {
              price_data: {
                currency: "usd",
                unit_amount: 900,
                recurring: { interval: "month" },
                product_data: { name: "Gumboard Team Plan" },
              },
              quantity: 1,
            },
          ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.organizationId,
      metadata: { orgId: user.organizationId },
      automatic_tax: { enabled: false },
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


