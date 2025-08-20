import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/paymets/stripe";

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!;
const stripe = getStripe();

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Billing is disabled" }, { status: 501 });

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  switch (event.type) {
    // This user just subscribed / purchased.
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.client_reference_id || undefined;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      await db.organization.update({
        where: { id: orgId },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "checkout",
        },
      });
      break;
    }
    // A payment charged successfully.
    case "invoice.payment_succeeded": {
      console.log("a payment succeeded");

      const invoice = event.data.object;
      const stripeCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      await db.organization.update({
        where: { stripeCustomerId: stripeCustomerId },
        data: {
          subscriptionStatus: "active",
        },
      });
      break;
    }

    // A payment failed charged
    case "invoice.payment_failed": {
      console.log("a payment failed");

      const invoice = event.data.object;
      const stripeCustomerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      await db.organization.update({
        where: { stripeCustomerId: stripeCustomerId },
        data: {
          subscriptionStatus: "failed",
        },
      });
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
