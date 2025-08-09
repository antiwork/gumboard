"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, MessageSquare } from "lucide-react";

export interface Comment {
  id: string;
  content: string;
}

export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
  comments?: Comment[];
}

interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  onClick?: (itemId: string) => void;
  readonly?: boolean;
  showDeleteButton?: boolean;
  className?: string;
}

export function ChecklistItem({
  item,
  onToggle,
  onDelete,
  onClick,
  readonly = false,
  showDeleteButton = true,
  className,
}: ChecklistItemProps) {
  return (
    <div
      className={cn(
        "flex items-center group/item rounded gap-3 transition-all duration-200",
        className
      )}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => !readonly && onToggle?.(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
        disabled={readonly}
      />

      <span
        className={cn(
          "flex-1 text-sm leading-6 cursor-pointer select-none",
          item.checked
            ? "line-through text-gray-500 dark:text-gray-400"
            : "text-gray-900 dark:text-gray-100",
          !readonly && "hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1 py-0.5"
        )}
        onClick={() => !readonly && onClick?.(item.id)}
      >
        {item.content}
      </span>

      {item.comments && item.comments.length > 0 && (
        <button
          onClick={() => !readonly && onClick?.(item.id)}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <MessageSquare className="h-3 w-3" />
          <span className="text-xs">{item.comments.length}</span>
        </button>
      )}

      {showDeleteButton && !readonly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 md:opacity-0 md:group-hover/item:opacity-50 md:hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
          onClick={() => onDelete?.(item.id)}
        >
          <Trash2 className="h-3 w-3" />
          <span className="sr-only">Delete item</span>
        </Button>
      )}
    </div>
  );
}