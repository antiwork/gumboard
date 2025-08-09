-- Add Slack API support for message editing
ALTER TABLE "organizations" ADD COLUMN "slackApiToken" TEXT;
ALTER TABLE "organizations" ADD COLUMN "slackChannelId" TEXT;
