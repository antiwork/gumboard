
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "noteId" TEXT NOT NULL,
    "slackMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing checklist items from JSON column
DO $$
DECLARE
  r RECORD;
  itm JSONB;
  idx INT;
BEGIN
  FOR r IN SELECT id, "checklistItems" FROM notes WHERE "checklistItems" IS NOT NULL LOOP
    idx := 0;
    FOR itm IN SELECT * FROM jsonb_array_elements(r."checklistItems") LOOP
      INSERT INTO "checklist_items" ("id","content","checked","order","noteId","createdAt","updatedAt")
      VALUES (
        COALESCE(itm->>'id', gen_random_uuid()::TEXT),
        COALESCE(itm->>'content',''),
        COALESCE((itm->>'checked')::BOOLEAN, FALSE),
        COALESCE(ROUND((itm->>'order')::NUMERIC)::INTEGER, idx),
        r.id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
      idx := idx + 1;
    END LOOP;
  END LOOP;
END$$;

-- Drop the JSON column after backfill
ALTER TABLE "notes" DROP COLUMN IF EXISTS "checklistItems";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "checklist_items_noteId_idx" ON "checklist_items"("noteId");
CREATE INDEX IF NOT EXISTS "checklist_items_noteId_order_idx" ON "checklist_items"("noteId", "order");
