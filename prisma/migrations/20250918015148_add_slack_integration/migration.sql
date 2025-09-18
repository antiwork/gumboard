/*
  Warnings:

  - Added the required column `channelId` to the `boards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `boards` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `boards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "channelId" TEXT NOT NULL,
ADD COLUMN     "conversationData" JSONB,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lastAction" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "slackUserId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "slackBotToken" TEXT,
ADD COLUMN     "slackChannelId" TEXT,
ADD COLUMN     "slackEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slackTeamId" TEXT;

-- CreateTable
CREATE TABLE "slack_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lastAction" TEXT,
    "conversationData" JSONB,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slack_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slack_sessions_userId_channelId_key" ON "slack_sessions"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "slack_sessions" ADD CONSTRAINT "slack_sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
