import { NextRequest, NextResponse } from "next/server";
import { slackClient } from "@/lib/slack/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.redirect("/auth/signin");
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    // Remove unused state variable
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`/settings/slack?error=${error}`);
    }

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    // Exchange code for access token
    const result = await slackClient.exchangeOAuthCode(
      code,
      `${process.env.NEXTAUTH_URL}/api/slack/auth`
    );

    if (!result.ok) {
      throw new Error("OAuth exchange failed");
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organization) {
      return NextResponse.redirect("/settings/slack?error=no_organization");
    }

    // Update organization with Slack credentials
    await prisma.organization.update({
      where: { id: user.organization.id },
      data: {
        slackTeamId: result.team?.id,
        slackBotToken: result.access_token,
        slackChannelId: result.incoming_webhook?.channel_id,
        slackEnabled: true,
      },
    });

    return NextResponse.redirect("/settings/slack?success=true");
  } catch (error) {
    console.error("Slack OAuth error:", error);
    return NextResponse.redirect("/settings/slack?error=oauth_failed");
  }
}
