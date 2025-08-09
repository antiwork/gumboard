"use client";

import * as React from "react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, Trash2 } from "lucide-react";
import { Comment, User } from "@/components/note";

interface CommentsProps {
  comments: Comment[];
  currentUser?: User;
  onAddComment?: (content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  readonly?: boolean;
  className?: string;
}

// simple date formatting function
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return "just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 30) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export function Comments({
  comments,
  currentUser,
  onAddComment,
  onDeleteComment,
  readonly = false,
  className = "",
}: CommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }
    }
  };

  const canDeleteComment = (comment: Comment) => {
    return !readonly && currentUser && (
      currentUser.id === comment.createdBy || 
      currentUser.isAdmin
    );
  };

  const canAddComment = !readonly && currentUser && onAddComment;

  return (
    <div className="flex flex-col space-y-7">
      <div className={`space-y-4 ${className} max-h-[400px] overflow-y-auto px-4`}>
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No comments yet. {canAddComment ? "Be the first to comment!" : ""}
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold">
                    {comment.user.name
                      ? comment.user.name.charAt(0).toUpperCase()
                      : comment.user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {comment.user.name || comment.user.email.split("@")[0]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(new Date(comment.createdAt))}
                      </span>
                    </div>
                    {canDeleteComment(comment) && (
                      <Button
                        onClick={() => onDeleteComment?.(comment.id)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className={`space-y-4 ${className}`}>
        {canAddComment && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex space-x-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold">
                  {currentUser.name
                    ? currentUser.name.charAt(0).toUpperCase()
                    : currentUser.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment..."
                  className="w-full min-h-[80px] px-3 py-2 text-sm bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-md resize-none focus:outline-none focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Press Ctrl+Enter to submit
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() || isSubmitting}
                    className="h-8"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    {isSubmitting ? "Posting..." : "Comment"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}