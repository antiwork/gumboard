import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isAdmin: true,
        organizationId: true,
      },
    });

    if (!user?.organizationId || !user.isAdmin) {
      return NextResponse.json(
        { error: "Only organization admins can connect Slack" },
        { status: 403 }
      );
    }

    if (!env.SLACK_CLIENT_ID) {
      return NextResponse.json({ error: "Slack OAuth is not configured" }, { status: 500 });
    }

    // Generate CSRF state that includes user ID for verification
    const state = `${crypto.randomUUID()}-${user.id}`;

    // Store state in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("slack_oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
      domain: env.NODE_ENV === "production" ? undefined : undefined, // Let browser handle domain
    });

    // Build redirect URI
    const baseUrl = env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/slack/oauth/callback`;

    // Build Slack authorization URL
    const slackAuthUrl = new URL("https://slack.com/oauth/v2/authorize");
    slackAuthUrl.searchParams.set("client_id", env.SLACK_CLIENT_ID);
    slackAuthUrl.searchParams.set(
      "scope",
      "chat:write,chat:write.public,channels:read,groups:read"
    );
    slackAuthUrl.searchParams.set("redirect_uri", redirectUri);
    slackAuthUrl.searchParams.set("state", state);

    console.log(`[Slack OAuth] Starting OAuth flow with redirect_uri: ${redirectUri}`);
    console.log(`[Slack OAuth] Full auth URL: ${slackAuthUrl.toString()}`);

    return NextResponse.redirect(slackAuthUrl.toString());
  } catch (error) {
    console.error("Error starting Slack OAuth:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
