import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { organizationId, returnUrl } = await req.json();

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  let customerId = org.stripeCustomerId ?? undefined;
  if (!customerId) {
    const c = await stripe.customers.create({ name: org.name, metadata: { organizationId } });
    customerId = c.id;
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: organizationId,
    line_items: [{ price: process.env.STRIPE_PRICE_TEAM_PRO_MONTHLY!, quantity: 1 }],
    success_url: `${returnUrl}?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?upgrade=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
