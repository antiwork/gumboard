-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "idx_board_org_archived" ON "boards"("organizationId", "archivedAt");
