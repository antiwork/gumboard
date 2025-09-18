/*
  Warnings:

  - You are about to drop the column `channelId` on the `boards` table. All the data in the column will be lost.
  - You are about to drop the column `conversationData` on the `boards` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `boards` table. All the data in the column will be lost.
  - You are about to drop the column `lastAction` on the `boards` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `boards` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_board_org_created";

-- AlterTable
ALTER TABLE "boards" DROP COLUMN "channelId",
DROP COLUMN "conversationData",
DROP COLUMN "expiresAt",
DROP COLUMN "lastAction",
DROP COLUMN "userId",
ALTER COLUMN "sendSlackUpdates" SET DEFAULT false;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
