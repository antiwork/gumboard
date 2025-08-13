import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
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
        { error: "Only organization admins can disconnect Slack" },
        { status: 403 }
      );
    }

    // Clear all Slack-related fields from the organization
    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        slackApiToken: null,
        slackTeamId: null,
        slackTeamName: null,
        slackBotUserId: null,
        slackChannelId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Slack:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
