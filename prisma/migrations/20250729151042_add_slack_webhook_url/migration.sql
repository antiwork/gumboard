-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "slackMessageId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "slackWebhookUrl" TEXT;
