"use client"

import * as React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { ChecklistItem } from "./checklist-item"
import type { ChecklistItemModel, NoteModel } from "@/lib/types/note"
import { cn } from "@/lib/utils"

export type NoteCardProps = {
  note: NoteModel
  onChange: (updated: NoteModel) => void
  onDelete: (noteId: string) => void
}

const taskItemVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.2 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
}

export function NoteCard({ note, onChange, onDelete }: NoteCardProps) {
  const handleToggle = (itemId: string) => {
    const updated = note.checklistItems.map((it) =>
      it.id === itemId ? { ...it, checked: !it.checked } : it
    )
    onChange({ ...note, checklistItems: updated })
  }

  const handleContent = (itemId: string, content: string) => {
    const updated = note.checklistItems.map((it) =>
      it.id === itemId ? { ...it, content } as ChecklistItemModel : it
    )
    onChange({ ...note, checklistItems: updated })
  }

  const handleDeleteItem = (itemId: string) => {
    const updated = note.checklistItems.filter((it) => it.id !== itemId)
    onChange({ ...note, checklistItems: updated })
  }

  const handleAddItem = () => {
    const nowId = String(Date.now())
    const newItem: ChecklistItemModel = {
      id: nowId,
      content: "New task",
      checked: false,
      order: (note.checklistItems?.length ?? 0) + 1,
    }
    onChange({ ...note, checklistItems: [...(note.checklistItems ?? []), newItem] })
  }

  const authorInitial = note.author.initial ?? note.author.name?.[0] ?? "?"

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl p-4 transition-all",
        "bg-white dark:bg-zinc-900",
        note.color
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-800">
            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
              {authorInitial}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {note.author.name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
          onClick={() => onDelete(note.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete note</span>
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {note.checklistItems.map((it) => (
            <motion.div
              key={it.id}
              className="flex items-center gap-3"
              variants={taskItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <ChecklistItem
                item={it}
                onToggle={handleToggle}
                onChangeContent={handleContent}
                onDelete={handleDeleteItem}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAddItem}
        className="mt-1 justify-start text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add task
      </Button>
    </div>
  )
}


