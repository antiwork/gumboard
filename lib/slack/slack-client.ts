import { WebClient } from "@slack/web-api";
import { db } from "@/lib/db";

export async function getSlackClient(teamId: string): Promise<WebClient> {
  const org = await db.organization.findFirst({
    where: { slackTeamId: teamId },
  });

  if (!org?.slackBotToken) {
    throw new Error(`No Slack bot token found for team ${teamId}`);
  }

  return new WebClient(org.slackBotToken);
}
