import { auth } from "@/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { isBillingAdmin } from "@/lib/billing";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });
    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    if (!isBillingAdmin(user)) {
      return NextResponse.json({ error: "Only admins can manage billing" }, { status: 403 });
    }
    if (!user.organization.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.organization.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || ""}/settings/organization#billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


