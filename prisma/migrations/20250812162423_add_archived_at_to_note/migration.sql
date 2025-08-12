/*
  Warnings:

  - You are about to drop the column `done` on the `notes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notes" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Set archivedAt to current timestamp for notes where done was true
UPDATE "notes" SET "archivedAt" = NOW() WHERE "done" = true;

-- Drop the done column
ALTER TABLE "notes" DROP COLUMN "done";
