"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useRef } from "react";
import { Textarea } from "./ui/textarea";

export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle?: (itemId: string) => void;
  onEdit?: (itemId: string, content: string) => void;
  onDelete?: (itemId: string) => void;
  onSplit?: (itemId: string, content: string, cursorPosition: number) => void;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onStartEdit?: (itemId: string) => void;
  onStopEdit?: () => void;
  readonly?: boolean;
  showDeleteButton?: boolean;
  className?: string;
}

export function ChecklistItem({
  item,
  onToggle,
  onEdit,
  onDelete,
  onSplit,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onStopEdit,
  readonly = false,
  showDeleteButton = true,
  className,
}: ChecklistItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (editContent === item.content) {
        onStopEdit?.();
        return;
      }

      // If content has changed, save the edit
      if (onEdit && editContent !== undefined) {
        onEdit(item.id, editContent);
        onStopEdit?.();
        return;
      }

      // Only split if explicitly requested and content is different
      const target = e.target as HTMLTextAreaElement;
      const cursorPosition = target.selectionStart || 0;
      if (onSplit && editContent !== undefined && editContent !== item.content) {
        onSplit(item.id, editContent, cursorPosition);
        onStopEdit?.();
      }
    }
    if (e.key === "Escape") {
      onStopEdit?.();
    }
    if (e.key === "Backspace" && editContent?.trim() === "") {
      e.preventDefault();
      onDelete?.(item.id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onEditContentChange?.(e.target.value);
    autoResizeTextarea(e.target);
  };

  const handleBlur = () => {
    if (isEditing && editContent !== undefined && onEdit) {
      onEdit(item.id, editContent);
    }
    onStopEdit?.();
  };

  return (
    <div
      className={cn(
        "flex items-start group/item rounded gap-3 transition-all duration-200 min-w-0",
        className
      )}
      // To avoid flaky test locators
      data-testid={process.env.NODE_ENV !== "production" ? item.id : undefined}
      data-testorder={process.env.NODE_ENV !== "production" ? item.order : undefined}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => !readonly && onToggle?.(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600 mt-1 flex-shrink-0"
        disabled={readonly}
      />

      {isEditing && !readonly ? (
        <Textarea
          ref={textareaRef}
          value={editContent ?? item.content}
          onChange={handleChange}
          className={cn(
            "h-auto flex-1 border-none whitespace-pre-wrap break-words bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none min-h-[20px] min-w-0",
            item.checked && "text-slate-500 dark:text-zinc-500 line-through"
          )}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={1}
          placeholder="Start typing..."
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm leading-6 cursor-pointer whitespace-pre-wrap break-words select-none min-w-0",
            item.checked
              ? "line-through text-gray-500 dark:text-gray-400"
              : "text-gray-900 dark:text-gray-100",
            !readonly && "rounded px-1 py-0.5"
          )}
          onClick={() => !readonly && onStartEdit?.(item.id)}
        >
          {item.content}
        </span>
      )}

      {showDeleteButton && !readonly && (
        <div className="flex-shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-50 md:opacity-0 md:group-hover/item:opacity-50 md:hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
            onClick={() => onDelete?.(item.id)}
          >
            <Trash2 className="h-3 w-3" />
            <span className="sr-only">Delete item</span>
          </Button>
        </div>
      )}
    </div>
  );
}
