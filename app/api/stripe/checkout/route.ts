import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/utils";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/paymets/stripe";

const stripe = getStripe();
export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Billing is disabled" }, { status: 501 });

  const { organizationId } = await req.json();

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
  const redirectUrl = `${getBaseUrl(await headers())}/dashboard`;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: organizationId,
    line_items: [{ price: env.STRIPE_TEAM_PLAN_PRICE_ID!, quantity: 1 }],
    success_url: redirectUrl,
    cancel_url: redirectUrl,
  });

  return NextResponse.json({ url: session.url });
}
