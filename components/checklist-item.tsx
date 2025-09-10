"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, MessageCircle } from "lucide-react";
import { CommentThread } from "./ui/comment-thread";

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  checklistItemId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  // Comment props
  comments?: Comment[];
  showComments?: boolean;
  onToggleComments?: () => void;
  onAddComment?: (content: string) => void;
  onUpdateComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  currentUser?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  canEdit?: boolean;
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
  // Comment props
  comments = [],
  showComments = false,
  onToggleComments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  currentUser,
  canEdit = true,
}: ChecklistItemProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const previousContentRef = React.useRef<string>("");
  const deletingRef = React.useRef<boolean>(false);
  const commentSectionRef = React.useRef<HTMLDivElement>(null);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  // Handle clicking outside to close comments
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showComments &&
        commentSectionRef.current &&
        !commentSectionRef.current.contains(event.target as Node)
      ) {
        // Check if the click is on the comment button itself
        const target = event.target as Element;
        const commentButton = target.closest('[data-comment-button="' + item.id + '"]');
        if (!commentButton) {
          onToggleComments?.();
        }
      }
    };

    if (showComments) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showComments, onToggleComments, item.id]);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
      previousContentRef.current = editContent ?? item.content;
    }
  }, [isEditing, editContent, item.content]);

  React.useEffect(() => {
    if (!isEditing && textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [item.content, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isNewItem && editContent?.trim() && onCreateItem) {
        onCreateItem(editContent.trim());
      } else {
        const target = e.target as HTMLTextAreaElement;
        target.blur();
      }
    }
    if (e.key === "Enter" && e.shiftKey) {
      const target = e.target as HTMLTextAreaElement;
      setTimeout(() => adjustTextareaHeight(target), 0);
    }
    if (e.key === "Escape") {
      onStopEdit?.();
      // Close comments on Escape if no comments exist
      if (showComments && comments.length === 0) {
        onToggleComments?.();
      }
    }
    if (e.key === "Backspace" && editContent?.trim() === "") {
      e.preventDefault();
      onDelete?.(item.id);
    }
  };

  const handleBlur = () => {
    if (deletingRef.current) {
      deletingRef.current = false;
      return;
    }
    if (isNewItem && editContent?.trim() && onCreateItem) {
      onCreateItem(editContent.trim());
    } else if (isEditing && editContent !== undefined && onEdit) {
      onEdit(item.id, editContent);
    }
    onStopEdit?.();
  };

  const commentCount = comments.length;
  const hasComments = commentCount > 0;

  return (
    <div className="space-y-1" ref={commentSectionRef}>
      <div
        className={cn(
          "flex items-start group/item rounded gap-2 transition-all duration-200",
          className
        )}
        data-testid={process.env.NODE_ENV !== "production" ? item.id : undefined}
        data-testorder={process.env.NODE_ENV !== "production" ? item.order : undefined}
      >
        <Checkbox
          checked={item.checked}
          onCheckedChange={() => !readonly && onToggle?.(item.id)}
          className="border-zinc-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600 mt-1.5 text-zinc-900 dark:text-zinc-100"
          disabled={readonly}
        />

        <textarea
          ref={textareaRef}
          value={editContent ?? item.content}
          onChange={(e) => onEditContentChange?.(e.target.value)}
          disabled={readonly}
          placeholder={isNewItem ? "Start typing…" : undefined}
          className={cn(
            "flex-1 border-none bg-transparent px-1 py-1 text-sm text-zinc-900 dark:text-zinc-100 resize-none overflow-hidden outline-none",
            item.checked && "text-zinc-500 dark:text-zinc-500 line-through"
          )}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            if (isEditing) {
              const originalScrollIntoView = e.target.scrollIntoView;
              e.target.scrollIntoView = () => {};
              setTimeout(() => {
                e.target.scrollIntoView = originalScrollIntoView;
              }, 100);
            }

            if (!isEditing && !readonly) {
              onStartEdit?.(item.id);
            }
          }}
          rows={1}
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            const currentContent = target.value;

            if (currentContent !== previousContentRef.current) {
              adjustTextareaHeight(target);
              previousContentRef.current = currentContent;
            }
          }}
        />

        <div className="flex items-center gap-1">
          {/* Comment button - only show for existing items */}
          {!isNewItem && !readonly && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleComments}
              data-comment-button={item.id}
              className={cn(
                "h-6 w-6 opacity-50 rounded-sm hover:bg-white/20 md:opacity-0 md:group-hover/item:opacity-50 md:hover:opacity-100",
                "text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
                hasComments &&
                  "opacity-100 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 md:opacity-100",
                showComments &&
                  "opacity-100 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              )}
            >
              <div className="relative">
                <MessageCircle className="h-3 w-3" />
                {commentCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-[10px] font-bold min-w-[14px] h-[14px] bg-blue-600 text-white rounded-full flex items-center justify-center">
                    {commentCount}
                  </span>
                )}
              </div>
              <span className="sr-only">
                {showComments ? "Hide comments" : "Show comments"} ({commentCount})
              </span>
            </Button>
          )}

          {showDeleteButton && !readonly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-50 rounded-sm hover:bg-white/20 md:opacity-0 md:group-hover/item:opacity-50 md:hover:opacity-100 text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
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
      </div>

      {/* Comment Thread - only show for existing items when expanded */}
      {!isNewItem && showComments && (
        <div className="ml-6 relative">
          {/* Thread line */}
          <div className="absolute left-[-13px] top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />
          <div className="space-y-1">
            <CommentThread
              comments={comments}
              onAddComment={onAddComment}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              currentUser={currentUser}
              canEdit={canEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
