"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItemProps {
  content: string;
  checked: boolean;
  isEditing?: boolean;
  canEdit?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  onEdit?: (content: string) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  onSplit?: (content: string, cursorPosition: number) => void;
  isAnimating?: boolean;
}

export function ChecklistItem({
  content,
  checked,
  isEditing = false,
  canEdit = false,
  onToggle,
  onDelete,
  onEdit,
  onEditStart,
  onEditEnd,
  onSplit,
  isAnimating = false,
}: ChecklistItemProps) {
  const [editContent, setEditContent] = useState(content);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onSplit) {
        const target = e.target as HTMLInputElement;
        const cursorPosition = target.selectionStart || 0;
        onSplit(editContent, cursorPosition);
      }
    }
    if (e.key === "Escape") {
      setEditContent(content);
      onEditEnd?.();
    }
    if (e.key === "Backspace" && editContent.trim() === "") {
      e.preventDefault();
      onDelete?.();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center group/item rounded gap-3 transition-all duration-200",
        isAnimating && "animate-pulse"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
      />

      {isEditing ? (
        <Input
          type="text"
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value);
            onEdit?.(e.target.value);
          }}
          className={cn(
            "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0",
            checked && "text-slate-500 dark:text-zinc-500 line-through"
          )}
          onBlur={() => {
            onEdit?.(editContent);
            onEditEnd?.();
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm leading-6 cursor-pointer transition-all duration-200",
            checked
              ? "text-slate-500 dark:text-zinc-500 line-through"
              : "text-gray-800 dark:text-gray-200"
          )}
          onClick={() => {
            if (canEdit) {
              setEditContent(content);
              onEditStart?.();
            }
          }}
        >
          {content}
        </span>
      )}

      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}