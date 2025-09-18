import { NextRequest, NextResponse } from "next/server";
import { slackClient } from "@/lib/slack/client";
import { messageHandler } from "@/lib/slack/handlers";

// Define proper interfaces for Slack payloads
interface SlackEvent {
  type: string;
  user: string;
  text: string;
  channel: string;
  channel_type?: string;
  bot_id?: string;
}

interface SlackPayload {
  type: string;
  challenge?: string;
  team_id: string;
  event: SlackEvent;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const payload = JSON.parse(body) as SlackPayload;

    // Handle Slack URL verification challenge
    if (payload.type === "url_verification") {
      return NextResponse.json({
        challenge: payload.challenge,
      });
    }

    // Verify Slack request signature for actual events
    if (!slackClient.verifySlackRequest(request, body)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Handle different event types
    if (payload.type === "event_callback") {
      const event = payload.event;

      switch (event.type) {
        case "app_mention":
          await handleAppMention(event, payload.team_id);
          break;
        case "message":
          // Only handle DMs (no channel_type or channel_type is 'im')
          if (event.channel_type === "im" || !event.channel_type) {
            await handleDirectMessage(event, payload.team_id);
          }
          break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Slack events error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleAppMention(event: SlackEvent, teamId: string) {
  try {
    console.log("App mention received:", event.text);

    // Remove bot mention from text
    const text = event.text.replace(/<@[UW][A-Z0-9]+>/g, "").trim();

    const response = await messageHandler.handleMessage(text, event.user, event.channel, teamId);

    // Send response back to Slack
    await slackClient.sendMessage(event.channel, response);
  } catch (error) {
    console.error("Error handling app mention:", error);
  }
}

async function handleDirectMessage(event: SlackEvent, teamId: string) {
  try {
    console.log("Direct message received:", event.text);

    // Skip bot messages
    if (event.bot_id) return;

    const response = await messageHandler.handleMessage(
      event.text,
      event.user,
      event.channel,
      teamId
    );

    // Send response back to Slack
    await slackClient.sendMessage(event.channel, response);
  } catch (error) {
    console.error("Error handling direct message:", error);
  }
}
