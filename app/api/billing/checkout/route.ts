import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { organizationId, returnUrl } = await req.json();

  // Stripe must be enabled + have a secret key
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing disabled" }, { status: 501 });
  }

  // Require a price id to create the subscription
  const priceId = process.env.STRIPE_PRICE_TEAM_PRO_MONTHLY;
  if (!priceId) {
    return NextResponse.json({ error: "Missing STRIPE_PRICE_TEAM_PRO_MONTHLY" }, { status: 500 });
  }

  // Validate org
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // Ensure/attach a Stripe customer
  let customerId = org.stripeCustomerId ?? undefined;
  if (!customerId) {
    const c = await stripe.customers.create({
      name: org.name ?? undefined,
      metadata: { organizationId },
    });
    customerId = c.id;

    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: organizationId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?upgrade=cancel`,
    metadata: { organizationId },
  });

  return NextResponse.json({ url: session.url });
}
