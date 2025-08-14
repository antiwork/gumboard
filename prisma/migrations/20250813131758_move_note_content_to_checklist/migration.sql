/*
  Warnings:

  - You are about to drop the column `content` on the `notes` table. All the data in the column will be lost.

*/

-- Create checklist items from existing note content
-- Only create checklist items for notes that have non-empty content and don't already have checklist items
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, content, "createdAt", "updatedAt"
    FROM notes
    WHERE content IS NOT NULL
      AND TRIM(content) != ''
      AND id NOT IN (SELECT DISTINCT "noteId" FROM checklist_items)
  LOOP
    INSERT INTO "checklist_items" ("id", "content", "checked", "order", "noteId", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::TEXT,
      r.content,
      FALSE,
      0,
      r.id,
      r."createdAt",
      r."updatedAt"
    );
  END LOOP;
END$$;

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "content";
