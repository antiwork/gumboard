-- CreateIndex
CREATE INDEX "idx_board_org_created" ON "public"."boards"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_note_board_deleted" ON "public"."notes"("boardId", "deletedAt");

-- CreateIndex
CREATE INDEX "idx_note_board_created" ON "public"."notes"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_note_user_deleted" ON "public"."notes"("createdBy", "deletedAt");
