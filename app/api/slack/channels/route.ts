import { auth } from "@/auth";
import { db } from "@/lib/db";
import { joinChannel } from "@/lib/slack";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!orgId?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const org = await db.organization.findUnique({
      where: { id: orgId.organizationId },
      select: { slackBotToken: true },
    });

    if (!org?.slackBotToken) {
      return NextResponse.json({ error: "Slack not configured" }, { status: 400 });
    }

    const res = await fetch("https://slack.com/api/conversations.list", {
      headers: { Authorization: `Bearer ${org.slackBotToken}` },
    });

    const data = await res.json();

    console.log("Slack channels data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, channelName } = await req.json();

    if (!channelId || !channelName) {
      return NextResponse.json({ error: "Channel ID and name are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
        isAdmin: true,
      },
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update organization settings" },
        { status: 403 }
      );
    }

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        slackBotToken: true,
        slackChannelId: true,
      },
    });

    if (!org?.slackBotToken) {
      return NextResponse.json({ error: "Slack bot not connected" }, { status: 400 });
    }

    if (org.slackChannelId === channelId) {
      return NextResponse.json({ message: "Channel already set" });
    }

    const joined = await joinChannel(org.slackBotToken, channelId);
    if (!joined) {
      return NextResponse.json(
        { error: "Failed to join channel. If private, invite the bot manually." },
        { status: 400 }
      );
    }

    const organization = await db.organization.update({
      where: { id: user.organizationId },
      data: {
        slackChannelId: channelId,
        slackChannelName: channelName,
      },
    });

    return NextResponse.json({ organization });
  } catch (error) {
    console.error("Error updating Slack channel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
