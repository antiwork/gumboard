"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

interface Comment {
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

interface CommentThreadProps {
  comments: Comment[];
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

interface CommentItemProps {
  comment: Comment;
  onUpdate?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  currentUser?: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  canEdit?: boolean;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onStartEdit?: () => void;
  onStopEdit?: () => void;
}

function CommentItem({
  comment,
  onUpdate,
  onDelete,
  currentUser,
  canEdit,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onStopEdit,
}: CommentItemProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [relativeTime, setRelativeTime] = React.useState(getRelativeTime(comment.createdAt));
  const deletingRef = React.useRef<boolean>(false);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  React.useEffect(() => {
    const updateTime = () => {
      setRelativeTime(getRelativeTime(comment.createdAt));
    };
    const interval = setInterval(updateTime, 60000);
    updateTime();
    return () => clearInterval(interval);
  }, [comment.createdAt]);

  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [isEditing, editContent]);

  React.useEffect(() => {
    if (!isEditing && textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [comment.content, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      target.blur();
    }
    if (e.key === "Enter" && e.shiftKey) {
      const target = e.target as HTMLTextAreaElement;
      setTimeout(() => adjustTextareaHeight(target), 0);
    }
    if (e.key === "Escape") {
      onStopEdit?.();
    }
    if (e.key === "Backspace" && editContent?.trim() === "") {
      e.preventDefault();
      onDelete?.(comment.id);
    }
  };

  const handleBlur = () => {
    if (deletingRef.current) {
      deletingRef.current = false;
      return;
    }
    if (isEditing && editContent !== undefined && onUpdate) {
      if (editContent !== comment.content) {
        onUpdate(comment.id, editContent);
      }
    }
    onStopEdit?.();
  };

  const canEditThis = canEdit && currentUser?.id === comment.authorId;
  const authorName = comment.author.name?.split(" ")[0] || comment.author.email.split("@")[0];
  const isOwnComment = currentUser?.id === comment.authorId;

  return (
    <div className="flex items-start group/comment gap-2 transition-all duration-200 relative">
      {/* Connection dot */}
      <div className="absolute left-[-13px] top-3 w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full" />

      <Avatar className="w-6 h-6 mt-0.5">
        <AvatarImage src={comment.author.image || undefined} />
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium">
          {authorName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{authorName}</span>
          {isOwnComment && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-medium">
              You
            </span>
          )}
          <span
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-help transition-colors"
            title={new Date(comment.createdAt).toLocaleString()}
          >
            {relativeTime}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={editContent ?? comment.content}
          onChange={(e) => onEditContentChange?.(e.target.value)}
          disabled={!canEditThis}
          className={cn(
            "w-full border-none bg-transparent px-1 py-1 text-sm text-zinc-900 dark:text-zinc-100 resize-none overflow-hidden outline-none",
            !canEditThis && "cursor-default",
            canEditThis &&
              !isEditing &&
              "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded cursor-text"
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

            if (!isEditing && canEditThis) {
              onStartEdit?.();
            }
          }}
          rows={1}
          style={{ height: "auto" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            adjustTextareaHeight(target);
          }}
        />
      </div>

      {canEditThis && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 rounded-sm hover:bg-white/20 group-hover/comment:opacity-50 hover:opacity-100 text-zinc-500 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          onMouseDown={() => {
            deletingRef.current = true;
          }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(comment.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
          <span className="sr-only">Delete comment</span>
        </Button>
      )}
    </div>
  );
}

export function CommentThread({
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  currentUser,
  canEdit = true,
}: CommentThreadProps) {
  const [newComment, setNewComment] = React.useState("");
  const [editingComment, setEditingComment] = React.useState<string | null>(null);
  const [editingContent, setEditingContent] = React.useState("");
  const [isAddingComment, setIsAddingComment] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  };

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment.trim());
      setNewComment("");
      setIsAddingComment(false);
    }
  };

  const handleStartEdit = (commentId: string, content: string) => {
    setEditingComment(commentId);
    setEditingContent(content);
  };

  const handleStopEdit = () => {
    setEditingComment(null);
    setEditingContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
    if (e.key === "Enter" && e.shiftKey) {
      const target = e.target as HTMLTextAreaElement;
      setTimeout(() => adjustTextareaHeight(target), 0);
    }
    if (e.key === "Escape") {
      setNewComment("");
      setIsAddingComment(false);
    }
  };

  const handleFocus = () => {
    setIsAddingComment(true);
  };

  const handleBlur = () => {
    if (newComment.trim()) {
      handleAddComment();
    } else {
      setIsAddingComment(false);
    }
  };

  React.useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [newComment]);

  const currentUserName =
    currentUser?.name?.split(" ")[0] || currentUser?.email?.split("@")[0] || "You";

  return (
    <div className="space-y-2">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onUpdate={onUpdateComment}
          onDelete={onDeleteComment}
          currentUser={currentUser}
          canEdit={canEdit}
          isEditing={editingComment === comment.id}
          editContent={editingComment === comment.id ? editingContent : undefined}
          onEditContentChange={setEditingContent}
          onStartEdit={() => handleStartEdit(comment.id, comment.content)}
          onStopEdit={handleStopEdit}
        />
      ))}

      {/* Add new comment */}
      {canEdit && currentUser && (
        <div className="flex items-start gap-2 relative">
          {/* Connection dot for new comment */}
          <div className="absolute left-[-13px] top-3 w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full" />

          <Avatar className="w-6 h-6 mt-0.5">
            <AvatarImage src={currentUser.image || undefined} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-green-400 to-blue-500 text-white font-medium">
              {currentUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {isAddingComment && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {currentUserName}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded font-medium">
                  You
                </span>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isAddingComment ? "Write a comment..." : "Add a comment..."}
              className={cn(
                "w-full border-none bg-transparent px-1 py-1 text-sm text-zinc-900 dark:text-zinc-100 resize-none overflow-hidden outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
                !isAddingComment && "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded cursor-text"
              )}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              rows={1}
              style={{ height: "auto" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                adjustTextareaHeight(target);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
