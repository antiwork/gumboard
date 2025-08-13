import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cookies } from "next/headers";

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    access_token?: string;
  };
  bot_user_id?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const { searchParams } = request.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/organization?slack=error&message=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/organization?slack=error&message=missing_code_or_state", baseUrl)
      );
    }

    // Verify CSRF state and extract user ID
    const cookieStore = await cookies();
    const storedState = cookieStore.get("slack_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL("/settings/organization?slack=error&message=invalid_state", baseUrl)
      );
    }

    // Extract user ID from state
    const userId = state?.split("-").pop();
    if (!userId) {
      return NextResponse.redirect(
        new URL("/settings/organization?slack=error&message=invalid_state_format", baseUrl)
      );
    }

    // Clear the state cookie
    cookieStore.delete("slack_oauth_state");

    // Verify user exists and is admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isAdmin: true,
        organizationId: true,
      },
    });

    if (!user?.organizationId || !user.isAdmin) {
      console.log(`[Slack OAuth] User not found or not admin. User: ${JSON.stringify(user)}`);
      return NextResponse.redirect(
        new URL("/settings/organization?slack=error&message=user_not_authorized", baseUrl)
      );
    }

    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/settings/organization?slack=error&message=oauth_not_configured", baseUrl)
      );
    }

    // Build redirect URI
    const redirectUri = `${baseUrl}/api/slack/oauth/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Failed to exchange Slack OAuth code:", tokenResponse.statusText);
      return NextResponse.redirect(
        new URL("/settings/organization?slack=error&message=token_exchange_failed", baseUrl)
      );
    }

    const tokenData: SlackOAuthResponse = await tokenResponse.json();
    console.log("Slack OAuth response:", JSON.stringify(tokenData, null, 2));

    if (!tokenData.ok || !tokenData.access_token) {
      console.error("Slack OAuth error:", tokenData.error || "No access token received");
      console.error("Full response:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/settings/organization?slack=error&message=${encodeURIComponent(tokenData.error || "token_exchange_failed")}`,
          baseUrl
        )
      );
    }

    // Update organization with Slack credentials
    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        slackApiToken: tokenData.access_token,
        slackTeamId: tokenData.team?.id || null,
        slackTeamName: tokenData.team?.name || null,
        slackBotUserId: tokenData.bot_user_id || null,
      },
    });

    return NextResponse.redirect(new URL("/settings/organization?slack=connected", baseUrl));
  } catch (error) {
    console.error("Error in Slack OAuth callback:", error);
    const baseUrl = env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(
      new URL("/settings/organization?slack=error&message=internal_error", baseUrl)
    );
  }
}
