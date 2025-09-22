import { WebClient } from "@slack/web-api";
import { extractIntentAndData } from "./ai";
import { db } from "@/lib/db";
import { executeCommand } from "./commands";
import { getSlackClient } from "./slack-client";
import { SlackEvent } from "./types";

export async function handleSlackEvent(event: SlackEvent) {
  console.log("Event received:", event);

  // Skip bot messages to avoid loops
  if (event.subtype === "bot_message" || event.bot_id) {
    console.log("Skipping bot message");
    return;
  }

  const client = await getSlackClient(event.team);

  // Handle app mentions
  if (event.type === "app_mention") {
    await handleMention(event, client);
  }
  // Handle direct messages
  else if (event.type === "message" && event.channel_type === "im") {
    await handleDirectMessage(event, client);
  }
}

async function handleMention(event: SlackEvent, client: WebClient) {
  try {
    // Clean the message text (remove bot mentions)
    let userMessage = event.text || "";
    userMessage = userMessage.replace(/<@[^>]+>/g, "").trim();

    console.log("Processing mention:", userMessage);
    console.log("User:", event.user);
    console.log("Channel:", event.channel);

    if (!userMessage) {
      userMessage = "Hello! How can I help you?";
    }

    // Get user info and link account
    const user = await linkSlackUser(event.user, client);
    if (!user) {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Sorry <@${event.user}>, I couldn't find your account. Please ask the admin to add you!`,
        thread_ts: event.ts,
      });
      return;
    }

    // Process the command
    const { intent, board, data } = await extractIntentAndData(userMessage);
    console.log("Intent:", intent);
    console.log("Data:", data);
    console.log("Board:", board);

    await executeCommand(intent, board, data, user, event, client);
  } catch (error) {
    console.error("Error handling mention:", error);

    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Sorry <@${event.user}>, I encountered an error. Please try again.`,
        thread_ts: event.ts,
      });
    } catch (secondError) {
      console.error("Error sending error message:", secondError);
    }
  }
}

async function handleDirectMessage(event: SlackEvent, client: WebClient) {
  try {
    // Clean the message text
    let userMessage = event.text || "";
    userMessage = userMessage.replace(/<@[^>]+>/g, "").trim();

    console.log("Processing DM:", userMessage);
    console.log("User:", event.user);
    console.log("Channel:", event.channel);

    if (!userMessage) {
      userMessage = "Hello! How can I help you?";
    }

    // Get user info and link account
    const user = await linkSlackUser(event.user, client);
    if (!user) {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Sorry, I couldn't find your account. Ask admin for the invite!`,
      });
      return;
    }

    // Process the command
    const { intent, board, data } = await extractIntentAndData(userMessage);
    console.log("Intent:", intent);
    console.log("Data:", data);
    console.log("Board:", board);

    await executeCommand(intent, board, data, user, event, client);
  } catch (error) {
    console.error("Error handling DM:", error);

    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: `Sorry, I encountered an error. Please try again.`,
      });
    } catch (secondError) {
      console.error("Error sending error message:", secondError);
    }
  }
}

async function linkSlackUser(slackUserId: string, client: WebClient) {
  try {
    // Fetch Slack profile
    const result = await client.users.info({ user: slackUserId });
    const slackEmail = result.user?.profile?.email;

    if (!slackEmail) {
      console.warn(`Slack user ${slackUserId} has no email`);
      return null;
    }

    // Find user by email
    let user = await db.user.findUnique({
      where: { email: slackEmail },
      include: { organization: true },
    });
    if (!user) {
      console.warn(`No existing user with email ${slackEmail}`);
      return null;
    }

    // Update user with Slack ID if not already linked
    if (!user.slackUserId) {
      user = await db.user.update({
        where: { id: user.id },
        data: { slackUserId: slackUserId },
        include: { organization: true },
      });
      console.log(`Linked Slack user ${slackUserId} to ${slackEmail}`);
    }

    return user;
  } catch (err) {
    console.error("Error linking Slack user:", err);
    return null;
  }
}
