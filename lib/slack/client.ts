import { WebClient } from "@slack/web-api";
import { NextRequest } from "next/server";
import crypto from "crypto";

// Define proper types instead of any
interface SlackMessageOptions {
  thread_ts?: string;
  blocks?: unknown[];
  attachments?: unknown[];
}

export class SlackClient {
  private client: WebClient;
  private signingSecret: string;

  constructor(token?: string) {
    this.client = new WebClient(token || process.env.SLACK_BOT_TOKEN);
    this.signingSecret = process.env.SLACK_SIGNING_SECRET!;
  }

  // Verify Slack request signature
  verifySlackRequest(request: NextRequest, body: string): boolean {
    const timestamp = request.headers.get("x-slack-request-timestamp");
    const signature = request.headers.get("x-slack-signature");

    if (!timestamp || !signature) return false;

    // Check timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    // Verify signature
    const baseString = `v0:${timestamp}:${body}`;
    const hmac = crypto.createHmac("sha256", this.signingSecret);
    const expectedSignature = `v0=${hmac.update(baseString).digest("hex")}`;

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  // Send message to Slack
  async sendMessage(channel: string, text: string, options?: SlackMessageOptions) {
    try {
      return await this.client.chat.postMessage({
        channel,
        text,
        ...options,
      });
    } catch (error) {
      console.error("Error sending Slack message:", error);
      throw error;
    }
  }

  // Get user info
  async getUserInfo(userId: string) {
    try {
      const result = await this.client.users.info({ user: userId });
      return result.user;
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  }

  // OAuth access
  async exchangeOAuthCode(code: string, redirectUri: string) {
    try {
      return await this.client.oauth.v2.access({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
      });
    } catch (error) {
      console.error("OAuth error:", error);
      throw error;
    }
  }
}

export const slackClient = new SlackClient();
