/*
  Warnings:

  - You are about to drop the column `slackWebhookUrl` on the `organizations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "slackWebhookUrl",
ADD COLUMN     "slackBotUserId" TEXT,
ADD COLUMN     "slackTeamId" TEXT,
ADD COLUMN     "slackTeamName" TEXT;
