-- AlterTable
ALTER TABLE "boards" ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "idx_board_org_activity" ON "boards"("organizationId", "lastActivityAt");
