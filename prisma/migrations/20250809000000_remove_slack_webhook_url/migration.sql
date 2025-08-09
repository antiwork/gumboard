/*
  Remove slackWebhookUrl column from organizations table
  as we're moving to Slack API-only integration
*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "slackWebhookUrl";
