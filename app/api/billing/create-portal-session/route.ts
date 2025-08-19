import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { isBillingAdmin } from "@/lib/billing";
import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
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

    const baseUrl = getBaseUrl(request);
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.organization.stripeCustomerId,
      return_url: `${baseUrl}/settings/organization#billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("Portal error:", error);
    
    // Check if it's a portal configuration error
    if (error instanceof Error && error.message.includes("configuration")) {
      return NextResponse.json({ 
        error: "Stripe Customer Portal not configured (Dashboard → Billing → Customer portal)" 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


