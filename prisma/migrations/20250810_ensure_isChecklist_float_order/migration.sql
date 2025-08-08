-- Enable UUID function if not present
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add isChecklist on notes if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='notes' AND column_name='isChecklist'
  ) THEN
    ALTER TABLE "notes" ADD COLUMN "isChecklist" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END$$;

-- Convert checklist_items.order to double precision (supports fractional reorder)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='checklist_items' AND column_name='order' AND data_type <> 'double precision'
  ) THEN
    ALTER TABLE "checklist_items"
    ALTER COLUMN "order" TYPE DOUBLE PRECISION
    USING "order"::DOUBLE PRECISION;
  END IF;
END$$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_checklist_items_noteId ON "checklist_items"("noteId");
