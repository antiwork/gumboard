/*
  Warnings:

  - A unique constraint covering the columns `[slackTeamId]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slackUserId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."notes" ADD COLUMN     "isSlackDefault" BOOLEAN;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "slackBotToken" TEXT,
ADD COLUMN     "slackSigningSecret" TEXT,
ADD COLUMN     "slackTeamId" TEXT;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "slackUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slackTeamId_key" ON "public"."organizations"("slackTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "users_slackUserId_key" ON "public"."users"("slackUserId");
