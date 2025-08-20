"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { sanitizeChecklistContent } from "@/lib/sanitize";

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
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onStartEdit?: (itemId: string) => void;
  onStopEdit?: () => void;
  readonly?: boolean;
  showDeleteButton?: boolean;
  className?: string;
  isNewItem?: boolean;
  onCreateItem?: (content: string) => void;
}

export function ChecklistItem({
  item,
  onToggle,
  onEdit,
  onDelete,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onStopEdit,
  readonly = false,
  showDeleteButton = true,
  className,
  isNewItem = false,
  onCreateItem,
}: ChecklistItemProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const previousContentRef = React.useRef<string>("");
  const deletingRef = React.useRef<boolean>(false);

  const adjustContentHeight = (element: HTMLDivElement) => {
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  React.useEffect(() => {
    if (isEditing && contentRef.current) {
      adjustContentHeight(contentRef.current);
      previousContentRef.current = editContent ?? item.content;
    }
  }, [isEditing, editContent, item.content]);

  React.useEffect(() => {
    if (!isEditing && contentRef.current) {
      adjustContentHeight(contentRef.current);
    }
  }, [item.content, isEditing]);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isNewItem && editContent?.trim() && onCreateItem) {
        onCreateItem(editContent.trim());
      } else {
        const target = e.target as HTMLDivElement;
        target.blur();
      }
    }
    if (e.key === "Enter" && e.shiftKey) {
      const target = e.target as HTMLDivElement;
      setTimeout(() => adjustContentHeight(target), 0);
    }
    if (e.key === "Escape") {
      onStopEdit?.();
    }
    if (e.key === "Backspace" && editContent?.trim() === "") {
      e.preventDefault();
      onDelete?.(item.id);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text");
    const urlRegex = /^https?:\/\/.+/;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      document.execCommand("insertText", false, paste);
      return;
    }
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (urlRegex.test(paste) && selectedText) {
      const linkHtml = `<a href="${paste}">${selectedText}</a>`;
      range.deleteContents();

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = linkHtml;
      const linkNode = tempDiv.firstChild;

      if (linkNode) {
        range.insertNode(linkNode);
        range.setStartAfter(linkNode);
        range.setEndAfter(linkNode);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      setTimeout(() => {
        const target = e.target as HTMLDivElement;
        const sanitizedContent = sanitizeChecklistContent(target.innerHTML);
        onEditContentChange?.(sanitizedContent);
      }, 0);
    } else {
      document.execCommand("insertText", false, paste);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const content = target.innerHTML;
    if (content.includes("<")) {
      const sanitizedContent = sanitizeChecklistContent(content);
      onEditContentChange?.(sanitizedContent);
    } else {
      onEditContentChange?.(content);
    }
  };

  const handleBlur = () => {
    if (deletingRef.current) {
      deletingRef.current = false;
      return;
    }
    if (isNewItem && editContent?.trim() && onCreateItem) {
      onCreateItem(editContent.trim());
    } else if (isEditing && onEdit) {
      const contentToSave = editContent !== undefined ? editContent : contentRef.current?.innerHTML || '';
      const sanitizedContent = sanitizeChecklistContent(contentToSave);
      onEdit(item.id, sanitizedContent);
    }
    onStopEdit?.();
  };

  return (
    <div
      className={cn(
        "flex items-start group/item rounded gap-2 transition-all duration-200",
        className
      )}
      // To avoid flaky test locators
      data-testid={process.env.NODE_ENV !== "production" ? item.id : undefined}
      data-testorder={process.env.NODE_ENV !== "production" ? item.order : undefined}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => !readonly && onToggle?.(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600 mt-1.5 text-zinc-900 dark:text-zinc-100"
        disabled={readonly}
      />

      <div
        ref={contentRef}
        contentEditable={!readonly}
        dangerouslySetInnerHTML={{ __html: editContent ?? item.content }}
        className={cn(
          "flex-1 border-none bg-transparent px-1 py-1 text-sm text-zinc-900 dark:text-zinc-100 resize-none overflow-hidden outline-none min-h-[1.5rem]",
          item.checked && "text-slate-500 dark:text-zinc-500 line-through"
        )}
        onBlur={handleBlur}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (!isEditing && !readonly) {
            onStartEdit?.(item.id);
          }
        }}
        onClick={(event) => {
          if (!isEditing && event.target instanceof HTMLAnchorElement) {
            event.stopPropagation();
            return;
          }
          if (!isEditing && !readonly) {
            onStartEdit?.(item.id);
          }
        }}
        style={{ minHeight: "auto" }}
      />

      {showDeleteButton && !readonly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 md:opacity-0 md:group-hover/item:opacity-50 md:hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
          onMouseDown={() => {
            deletingRef.current = true;
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(item.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
          <span className="sr-only">Delete item</span>
        </Button>
      )}
    </div>
  );
}
