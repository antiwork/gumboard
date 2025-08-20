import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const raw = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event | Record<string, unknown>;

  try {
    const sig = req.headers.get("stripe-signature");

    if (stripe && process.env.STRIPE_WEBHOOK_SECRET && sig) {
      // Verify when billing is enabled and signature is present
      event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // CI/disabled-billing fallback: accept payload without verification
      event = JSON.parse(raw.toString() || "{}");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = (event as Stripe.Event).data.object as Stripe.Checkout.Session;
      const orgId = (s.client_reference_id || s.metadata?.organizationId) as string | undefined;
      const subId = s.subscription as string | undefined;

      if (orgId && subId) {
        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan: "PRO",
            stripeSubscriptionId: subId,
            stripeStatus: "active",
          },
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = (event as Stripe.Event).data.object as Stripe.Subscription;
      const status = sub.status; // active | past_due | canceled | ...
      await prisma.organization.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          plan: status === "active" ? "PRO" : "FREE",
          stripeStatus: status,
        },
      });
      break;
    }

    default:
      // no-op for other events
      break;
  }

  return NextResponse.json({ ok: true });
}