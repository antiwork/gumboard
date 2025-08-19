// app/api/stripe/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { SubscriptionStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const sig = (await headers()).get("stripe-signature")!;
    const body = await req.text(); // RAW body only
    const event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET as string);

    // idempotency: insert-first, early return on conflict
    try {
      await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as {
          customer?: string;
          subscription?: string;
          metadata?: { orgId?: string };
        };
        const customer = s.customer || null;
        const subId = s.subscription || null;
        const orgByCustomer = customer
          ? await db.organization.findFirst({ where: { stripeCustomerId: customer } })
          : null;
        const orgId = orgByCustomer?.id ?? s.metadata?.orgId;
        if (!orgId || !subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const subData = sub as { current_period_end?: number };
        await db.organization.update({
          where: { id: orgId },
          data: {
            plan: "TEAM",
            subscriptionStatus: sub.status as SubscriptionStatus,
            stripeCustomerId: customer || orgByCustomer?.stripeCustomerId || undefined,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: subData.current_period_end
              ? new Date(subData.current_period_end * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as {
          id: string;
          status: string;
          current_period_end?: number;
          cancel_at_period_end?: boolean;
        };
        const org = await db.organization.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (!org) break;

        await db.organization.update({
          where: { id: org.id },
          data: {
            subscriptionStatus: sub.status as SubscriptionStatus,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : org.currentPeriodEnd,
          },
        });

        // if ended and period passed → deactivate self-serve links (optional lazy check)
        const ended =
          ["canceled", "unpaid"].includes(sub.status) &&
          (!sub.cancel_at_period_end ||
            (sub.current_period_end && Date.now() / 1000 >= sub.current_period_end));
        if (ended) {
          await db.organizationSelfServeInvite.updateMany({
            where: { organizationId: org.id, isActive: true },
            data: { isActive: false },
          });
        }
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("Invalid webhook", { status: 400 });
  }
}
