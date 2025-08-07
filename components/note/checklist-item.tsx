"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { ChecklistItemModel } from "@/lib/types/note"
import { cn } from "@/lib/utils"

export type ChecklistItemProps = {
  item: ChecklistItemModel
  onToggle: (itemId: string) => void
  onChangeContent: (itemId: string, content: string) => void
  onDelete: (itemId: string) => void
}

export function ChecklistItem({ item, onToggle, onChangeContent, onDelete }: ChecklistItemProps) {
  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={`check-${item.id}`}
        checked={item.checked}
        onCheckedChange={() => onToggle(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
      />
      <Input
        type="text"
        value={item.content}
        onChange={(e) => onChangeContent(item.id, e.target.value)}
        className={cn(
          "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0",
          item.checked && "text-slate-500 dark:text-zinc-500 line-through"
        )}
        style={{ overflow: "visible" }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-50 hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-3 w-3" />
        <span className="sr-only">Delete task</span>
      </Button>
    </div>
  )
}


