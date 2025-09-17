import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
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
}

async function joinChannel(token: string, channel: string): Promise<boolean> {
  const response = await fetch("https://slack.com/api/conversations.join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel }),
  });

  const data = await response.json();
  console.log("________________________JOIN__________________________ \n", data);
  if (!data.ok) {
    console.error(`Failed to join channel: ${data.error}`);
    return false;
  }

  return true;
}

export async function PUT(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { channelId, channelName } = await req.json();

  console.log("Received channelId:", channelId, "channelName:", channelName);

  if (!channelId || !channelName) {
    return NextResponse.json({ error: "Channel ID and name are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  if (!user?.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const org = await db.organization.findUnique({
    where: { id: user.organizationId },
    select: { slackBotToken: true },
  });

  if (!org?.slackBotToken) {
    return NextResponse.json({ error: "Slack bot not connected" }, { status: 400 });
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
}
