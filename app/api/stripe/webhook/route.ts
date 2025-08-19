import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { $Enums } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeSubLite = { id: string; status: string; customer: string | { id: string }; current_period_end?: number };

async function upsertOrgFromSubscription(sub: StripeSubLite) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const org = await db.organization.findFirst({
    where: { OR: [{ stripeCustomerId: customerId }, { stripeSubscriptionId: sub.id }] },
  });
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  if (org) {
    await db.organization.update({
      where: { id: org.id },
      data: {
        plan: "TEAM",
        subscriptionStatus: sub.status as $Enums.SubscriptionStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd,
      },
    });
    return org.id;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const sig = (await headers()).get("stripe-signature")!;
    const body = await req.text(); // raw body
    const event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET as string);

    // Idempotency: insert event.id into StripeEvent, if conflict → return 200 early
    try {
      await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          subscription?: string;
          customer?: string;
          metadata?: { orgId?: string };
          client_reference_id?: string;
        };
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const orgId = session.metadata?.orgId || session.client_reference_id;

        if (orgId && customerId) {
          await db.organization.update({
            where: { id: orgId },
            data: { stripeCustomerId: customerId },
          }).catch(() => null);
        }
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertOrgFromSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object as StripeSubLite;
        const orgId = await upsertOrgFromSubscription(sub);
        if (orgId && (sub.status === "canceled" || sub.status === "unpaid")) {
          // If period has ended already, deactivate invites
          const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
          if (!periodEnd || periodEnd <= new Date()) {
            await db.organizationSelfServeInvite.updateMany({
              where: { organizationId: orgId, isActive: true },
              data: { isActive: false },
            });
          }
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


