"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const autoResize = React.useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  React.useEffect(() => {
    if (isEditing) {
      autoResize();
    }
  }, [isEditing, editContent, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLTextAreaElement;
      const cursorPosition = target.selectionStart || 0;
      if (onSplit && editContent !== undefined) {
        onSplit(item.id, editContent, cursorPosition);
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

  const handleBlur = () => {
    if (isEditing && editContent !== undefined && onEdit) {
      onEdit(item.id, editContent);
    }
    onStopEdit?.();
  };

  return (
    <div
      className={cn(
        "flex items-start group/item rounded gap-3 transition-all duration-200 w-full",
        className
      )}
      // To avoid flaky test locators
      data-testid={process.env.NODE_ENV !== "production" ? item.id : undefined}
      data-testorder={process.env.NODE_ENV !== "production" ? item.order : undefined}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => !readonly && onToggle?.(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600 mt-1"
        disabled={readonly}
      />

      {isEditing && !readonly ? (
        <Textarea
          ref={textareaRef}
          value={editContent ?? item.content}
          onChange={(e) => {
            onEditContentChange?.(e.target.value);
          }}
          onInput={autoResize}
          className={cn(
            "min-h-6 h-auto flex-1 min-w-0 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-hidden whitespace-pre-wrap",
            item.checked && "text-slate-500 dark:text-zinc-500 line-through"
          )}
          style={{
            wordWrap: "break-word",
            overflowWrap: "break-word",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
            maxWidth: "100%",
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={1}
        />
      ) : (
        <span
          className={cn(
            "flex-1 min-w-0 text-sm leading-6 cursor-pointer select-none break-words whitespace-pre-wrap",
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
