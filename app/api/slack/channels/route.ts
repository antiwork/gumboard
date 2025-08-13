import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_member: boolean;
}

interface SlackChannelsResponse {
  ok: boolean;
  channels?: SlackChannel[];
  error?: string;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin and get organization Slack token
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isAdmin: true,
        organizationId: true,
        organization: {
          select: {
            slackApiToken: true,
          },
        },
      },
    });

    if (!user?.organizationId || !user.isAdmin) {
      return NextResponse.json(
        { error: "Only organization admins can fetch channels" },
        { status: 403 }
      );
    }

    if (!user.organization?.slackApiToken) {
      return NextResponse.json({ error: "Slack is not connected" }, { status: 400 });
    }

    // Fetch public channels
    const channelsResponse = await fetch("https://slack.com/api/conversations.list", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${user.organization.slackApiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!channelsResponse.ok) {
      console.error("Failed to fetch Slack channels:", channelsResponse.statusText);
      return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
    }

    const channelsData: SlackChannelsResponse = await channelsResponse.json();

    if (!channelsData.ok) {
      console.error("Slack API error:", channelsData.error);
      return NextResponse.json(
        { error: channelsData.error || "Failed to fetch channels" },
        { status: 500 }
      );
    }

    // Filter and format channels
    const availableChannels = (channelsData.channels || [])
      .filter(
        (channel) =>
          !channel.is_archived &&
          (channel.is_member || !channel.is_private) &&
          (channel.is_channel || channel.is_group)
      )
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.is_private ? "private" : "public",
        isMember: channel.is_member,
      }))
      .sort((a, b) => {
        // Sort by membership first, then alphabetically
        if (a.isMember && !b.isMember) return -1;
        if (!a.isMember && b.isMember) return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ channels: availableChannels });
  } catch (error) {
    console.error("Error fetching Slack channels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
