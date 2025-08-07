-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "noteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing JSON checklist data to the new table
DO $$
DECLARE
    note_record RECORD;
    item JSONB;
    item_counter INT;
BEGIN
    FOR note_record IN 
        SELECT id, "checklistItems"
        FROM notes 
        WHERE "checklistItems" IS NOT NULL 
        AND jsonb_array_length("checklistItems") > 0
    LOOP
        item_counter := 0;
        
        FOR item IN SELECT * FROM jsonb_array_elements(note_record."checklistItems")
        LOOP
            INSERT INTO "checklist_items" (
                "id", 
                "content", 
                "checked", 
                "order", 
                "noteId",
                "createdAt",
                "updatedAt"
            ) VALUES (
                COALESCE(item->>'id', gen_random_uuid()::TEXT),
                COALESCE(item->>'content', ''),
                COALESCE((item->>'checked')::BOOLEAN, false),
                COALESCE((item->>'order')::INTEGER, item_counter),
                note_record.id,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            item_counter := item_counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- RemoveColumn
ALTER TABLE "notes" DROP COLUMN "checklistItems";
