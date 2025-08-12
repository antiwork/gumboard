"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  multiline?: boolean;
  placeholder?: string;
}

const useAutosize = (
  enabled: boolean,
  ref: React.RefObject<HTMLTextAreaElement | null>,
  dep: string
) => {
  React.useLayoutEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;

    el.style.overflow = "hidden";
    el.style.height = "auto";

    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || 0;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const oneLine = Math.ceil(lh + pt + pb);

    const target = Math.max(oneLine, el.scrollHeight);
    el.style.height = `${target}px`;
  }, [enabled, dep]);
};

export function ChecklistItem({
  item,
  onToggle,
  onEdit,
  onDelete,
  onSplit,
  isEditing = false,
  editContent,
  onEditContentChange,
  onStartEdit,
  onStopEdit,
  readonly = false,
  showDeleteButton = true,
  className,
  multiline = false,
  placeholder = "Click to add text…",
}: ChecklistItemProps) {
  const value = editContent ?? item.content ?? "";
  const isDisplayEmpty = !item.content?.trim();

  const taRef = React.useRef<HTMLTextAreaElement>(null);
  useAutosize(isEditing && multiline, taRef, value);

  const commit = React.useCallback(() => {
    onEdit?.(item.id, value.trim());
    onStopEdit?.();
  }, [onEdit, onStopEdit, item.id, value]);

  const cancel = React.useCallback(() => onStopEdit?.(), [onStopEdit]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === "Escape") return (e.preventDefault(), cancel());
    if (e.key === "Backspace" && !value.trim())
      return (e.preventDefault(), onDelete?.(item.id));

    if (e.key === "Enter") {
      if (multiline && e.shiftKey) return;
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const pos = target.selectionStart ?? value.length;
      return onSplit ? onSplit(item.id, value, pos) : commit();
    }
  };

  const fieldBase = cn(
    "h-auto flex-1 border-none bg-transparent p-0 text-sm py-1 leading-6", // keep same line height as display
    "text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none",
    item.checked && "text-slate-500 dark:text-zinc-500 line-through"
  );

  return (
    <div
      className={cn(
        "flex items-center group/item rounded gap-3 transition-[color,background,box-shadow,transform] duration-150",
        className
      )}
      data-testid={process.env.NODE_ENV !== "production" ? item.id : undefined}
      data-testorder={
        process.env.NODE_ENV !== "production" ? item.order : undefined
      }
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => !readonly && onToggle?.(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
        disabled={readonly}
      />

      {isEditing && !readonly ? (
        multiline ? (
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onEditContentChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            autoFocus
            rows={1}
            className={cn(fieldBase, "resize-none overflow-hidden min-h-6")}
          />
        ) : (
          <Input
            type="text"
            value={value}
            onChange={(e) => onEditContentChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            autoFocus
            className={cn(fieldBase, "cursor-text")}
          />
        )
      ) : (
        <span
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (readonly) return;
            if (e.key === "Enter" || e.key === " ") onStartEdit?.(item.id);
          }}
          className={cn(
            "block flex-1 min-h-6 text-sm leading-6 cursor-text select-none py-1",
            item.checked
              ? "line-through text-gray-500 dark:text-gray-400"
              : "text-gray-900 dark:text-gray-100",
            !readonly && "hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1"
          )}
          onClick={() => !readonly && onStartEdit?.(item.id)}
          title={isDisplayEmpty ? placeholder : item.content}
          aria-label={isDisplayEmpty ? placeholder : item.content}
        >
          {isDisplayEmpty ? (
            <span className="opacity-50">{placeholder}</span>
          ) : (
            item.content
          )}
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
