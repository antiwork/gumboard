"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/checklist";

export interface SortableChecklistItemProps {
  noteId: string;
  note: { checklistItems?: ChecklistItem[] };
  item: ChecklistItem;
  canEdit: boolean;
  animating: boolean;
  editingChecklistItem: { noteId: string; itemId: string } | null;
  editingChecklistItemContent: string;
  setEditingChecklistItem: React.Dispatch<
    React.SetStateAction<{ noteId: string; itemId: string } | null>
  >;
  setEditingChecklistItemContent: React.Dispatch<React.SetStateAction<string>>;
  debouncedEditChecklistItem: (
    noteId: string,
    itemId: string,
    content: string
  ) => void;
  handleEditChecklistItem: (
    noteId: string,
    itemId: string,
    content: string
  ) => Promise<void>;
  handleSplitChecklistItem: (
    noteId: string,
    itemId: string,
    content: string,
    cursorPosition: number
  ) => Promise<void>;
  handleDeleteChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  handleToggleChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  cancelPendingEdit: (noteId: string, itemId: string) => void;
}

export function SortableChecklistItem(props: SortableChecklistItemProps) {
  const {
    noteId,
    note,
    item,
    canEdit,
    animating,
    editingChecklistItem,
    editingChecklistItemContent,
    setEditingChecklistItem,
    setEditingChecklistItemContent,
    debouncedEditChecklistItem,
    handleEditChecklistItem,
    handleSplitChecklistItem,
    handleDeleteChecklistItem,
    handleToggleChecklistItem,
    cancelPendingEdit,
  } = props;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !canEdit });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    willChange: "transform",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center group/item rounded gap-2 sm:gap-3 transform-gpu ${
        animating ? "animate-pulse" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => handleToggleChecklistItem(noteId, item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600 cursor-pointer"
      />

      {editingChecklistItem?.noteId === noteId &&
      editingChecklistItem?.itemId === item.id ? (
        <Input
          type="text"
          value={editingChecklistItemContent}
          onChange={(e) => {
            setEditingChecklistItemContent(e.target.value);
            debouncedEditChecklistItem(noteId, item.id, e.target.value);
          }}
          className={cn(
            "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0",
            item.checked && "text-slate-500 dark:text-zinc-500 line-through"
          )}
          onBlur={() => {
            cancelPendingEdit(noteId, item.id);
            handleEditChecklistItem(noteId, item.id, editingChecklistItemContent);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const target = e.target as HTMLInputElement;
              const cursorPosition = target.selectionStart || 0;
              handleSplitChecklistItem(
                noteId,
                item.id,
                editingChecklistItemContent,
                cursorPosition
              );
            }
            if (e.key === "Escape") {
              setEditingChecklistItem(null);
              setEditingChecklistItemContent("");
            }
            if (e.key === "Backspace" && editingChecklistItemContent.trim() === "") {
              e.preventDefault();
              const sortedItems = [...(note.checklistItems || [])].sort(
                (a, b) => a.order - b.order
              );
              const currentIndex = sortedItems.findIndex((i) => i.id === item.id);
              if (currentIndex > 0) {
                const previousItem = sortedItems[currentIndex - 1];
                handleDeleteChecklistItem(noteId, item.id);
                setTimeout(() => {
                  setEditingChecklistItem({ noteId, itemId: previousItem.id });
                  setEditingChecklistItemContent(previousItem.content);
                }, 0);
              } else {
                handleDeleteChecklistItem(noteId, item.id);
              }
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm leading-6 cursor-pointer transition-all duration-200",
            item.checked
              ? "text-slate-500 dark:text-zinc-500 line-through"
              : "text-gray-800 dark:text-gray-200"
          )}
          onClick={() => {
            if (canEdit) {
              setEditingChecklistItem({ noteId, itemId: item.id });
              setEditingChecklistItemContent(item.content);
            }
          }}
        >
          {item.content}
        </span>
      )}

      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
          onClick={() => handleDeleteChecklistItem(noteId, item.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

export default SortableChecklistItem;


