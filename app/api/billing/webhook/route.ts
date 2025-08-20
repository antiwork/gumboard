import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

export const runtime = "nodejs"; // ensure Node for raw body

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const raw = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = (s.client_reference_id || s.metadata?.organizationId) as string | undefined;
      const subId = s.subscription as string | undefined;
      if (orgId && subId) {
        await prisma.organization.update({
          where: { id: orgId },
          data: { plan: "PRO", stripeSubscriptionId: subId, stripeStatus: "active" },
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status; // active | past_due | canceled | ...
      await prisma.organization.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: status === "active" ? "PRO" : "FREE", stripeStatus: status },
      });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
