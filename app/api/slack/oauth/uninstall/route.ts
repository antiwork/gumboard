import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
        isAdmin: true,
      },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    await db.organization.updateMany({
      where: {
        id: user.organizationId,
      },
      data: {
        slackTeamId: null,
        slackTeamName: null,
        slackBotToken: null,
        slackAppId: null,
        slackChannelId: null,
        slackChannelName: null,
      },
    });

    return NextResponse.json({ message: "Slack uninstalled successfully" });
  } catch (error) {
    console.error("Error uninstalling Slack:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
