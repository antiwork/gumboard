-- This migration only existed to drop a possibly-misnamed index.
-- Make it safe:
DROP INDEX IF EXISTS "idx_checklist_items_noteid";
