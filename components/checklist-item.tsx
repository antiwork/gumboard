"use client";

import * as React from "react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, MessageSquare } from "lucide-react";
import { Comments } from "@/components/comments";
import { Comment, User } from "@/components/note";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
  comments?: Comment[];
}

interface ChecklistItemProps {
  item: ChecklistItem;
  noteId: string; // Need noteId for comment API calls
  currentUser?: User;
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
  noteId,
  currentUser,
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
  // Comments state
  const [comments, setComments] = useState<Comment[]>(item.comments || []);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const canEdit = !readonly && currentUser;

  // Load comments when dialog opens
  React.useEffect(() => {
    if (commentsOpen && !loadingComments) {
      loadComments();
    }
  }, [commentsOpen]);

  const loadComments = async () => {
    if (!noteId || !item.id) return;
    
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/checklist-items/${item.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (content: string) => {
    if (!noteId || !item.id) return;
    
    try {
      const response = await fetch(`/api/notes/${noteId}/checklist-items/${item.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!noteId || !item.id) return;
    
    try {
      const response = await fetch(`/api/notes/${noteId}/checklist-items/${item.id}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onEdit && editContent && onStopEdit) {
        onEdit(item.id, editContent);
        onStopEdit();
      }
    }
    if (e.key === "Escape") {
      onStopEdit?.();
    }
  };

  const handleSplitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSplit && editContent) {
      e.preventDefault();
      const cursorPosition = e.currentTarget.selectionStart || 0;
      onSplit(item.id, editContent, cursorPosition);
      onStopEdit?.();
    }
  };

  return (
    <div className={cn("flex items-center gap-3 group", className)}>
      <Checkbox
        id={`checklist-${item.id}`}
        checked={item.checked}
        onCheckedChange={() => onToggle?.(item.id)}
        disabled={readonly}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
      />
      
      {isEditing ? (
        <Input
          type="text"
          value={editContent || ""}
          onChange={(e) => onEditContentChange?.(e.target.value)}
          className="h-auto flex-1 border-none bg-transparent px-1 py-0.5 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0"
          onBlur={() => {
            if (onEdit && editContent) {
              onEdit(item.id, editContent);
            }
            onStopEdit?.();
          }}
          onKeyDown={(e) => {
            handleKeyDown(e);
            handleSplitKeyDown(e);
          }}
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm cursor-pointer text-zinc-900 dark:text-zinc-100",
            item.checked && "line-through text-zinc-500 dark:text-zinc-400"
          )}
          onClick={() => onStartEdit?.(item.id)}
        >
          {item.content}
        </span>
      )}
      
      {/* Comments Button */}
      {canEdit && (
        <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 relative"
            >
              <MessageSquare className="h-3 w-3" />
              {/* {comments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-3 w-3 flex items-center justify-center text-[8px]">
                  {comments.length}
                </span>
              )} */}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col border-slate-500 dark:border-zinc-600">
            <DialogHeader>
              <DialogTitle>Comments</DialogTitle>
              <DialogDescription>
                Discuss this checklist item with your team.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Loading comments...</div>
                </div>
              ) : (
                <Comments
                  comments={comments}
                  currentUser={currentUser}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  readonly={readonly}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Button */}
      {showDeleteButton && !readonly && (
        <Button
          onClick={() => onDelete?.(item.id)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}