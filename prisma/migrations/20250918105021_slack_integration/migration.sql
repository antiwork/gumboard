-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "slackAppId" TEXT,
ADD COLUMN     "slackBotToken" TEXT,
ADD COLUMN     "slackChannelId" TEXT,
ADD COLUMN     "slackChannelName" TEXT,
ADD COLUMN     "slackTeamId" TEXT,
ADD COLUMN     "slackTeamName" TEXT;
