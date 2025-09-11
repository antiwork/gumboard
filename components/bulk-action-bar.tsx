import {  Trash2, Archive, ArchiveRestore, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function BulkActionBar({ boardId, selectedNotes,handleBulkDelete, handleBulkArchive, handleBulkUnarchive, handleSelectAll, handleClearSelection}: {boardId : string, selectedNotes: string[], clearSelection: () => void, handleBulkDelete : () => void, handleBulkArchive : () => void, handleBulkUnarchive : () => void, handleSelectAll : () => void, handleClearSelection : () => void }) {
  if (selectedNotes.length === 0) return null;

  return (
    <div className="fixed bottom-2 md:top-2 left-1/2 -translate-x-1/2 z-50 ">
      <Card className="flex items-center flex-row gap-1 px-3 py-3 shadow-sm rounded-lg border">
        {selectedNotes.length > 0 ? (
        <div className="flex items-center justify-center gap-2 ">
          <div className="text-sm text-muted-foreground px-3 py-1 border rounded-lg border-dashed border-gray-300 min-w-24 text-center">
            {selectedNotes.length} selected
          </div>
          <div className="flex gap-1 items-center ">
        <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={selectedNotes.length === 0}
            aria-label="Bulk delete notes"
            className=" hover:bg-zinc-100 text-foreground dark:text-zinc-100"
          >
            <Trash2 className="size-4" />
          </Button>
          {boardId !== "archive" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkArchive}
              disabled={selectedNotes.length === 0}
              aria-label="Bulk archive notes"
              className=" hover:bg-zinc-100 text-foreground dark:text-zinc-100 border-0"
            >
              <Archive className="size-4" />
            </Button>
          )}
          {boardId === "archive" && (
            <Button
              variant="outline"
              onClick={handleBulkUnarchive}
              disabled={selectedNotes.length === 0}
              aria-label="Bulk unarchive notes"
            >
              <ArchiveRestore className="size-4" />
              
            </Button>
          )}
          </div>
       
          <Button variant="ghost" size='sm' onClick={handleSelectAll} aria-label="Select all notes" className="text-sm">
           Select all
          </Button>
          <Button  size='sm' onClick={handleClearSelection} aria-label="Clear selection" className="text-sm">
            <XIcon className="size-4"/>
          </Button>
        </div>
      ): null
    }
      </Card>
    </div>
  )
}
