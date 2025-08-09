"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Pencil, Check } from "lucide-react";
import { ChecklistItem, Comment } from "@/components/checklist-item";
import { nanoid } from "nanoid";

interface ChecklistItemModalProps {
  item: ChecklistItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string, comments: Comment[]) => void;
}

export function ChecklistItemModal({
  item,
  open,
  onOpenChange,
  onSave,
}: ChecklistItemModalProps) {
  const [content, setContent] = useState(item.content);
  const [comments, setComments] = useState<Comment[]>(item.comments || []);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setContent(item.content);
    setComments(item.comments || []);
  }, [item]);

  const handleAddComment = () => {
    const text = newComment.trim();
    if (!text) return;
    setComments([...comments, { id: nanoid(), content: text }]);
    setNewComment("");
  };

  const handleEditComment = (id: string, value: string) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, content: value } : c)));
  };

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter((c) => c.id !== id));
  };

  const handleSave = () => {
    onSave(content.trim(), comments);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Todo</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Todo title"
          />
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="group flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">U</AvatarFallback>
                </Avatar>
                {editingId === c.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={c.content}
                      onChange={(e) => handleEditComment(c.id, e.target.value)}
                      className="h-8 flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setEditingId(null);
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      onClick={() => setEditingId(null)}
                    >
                      <Check className="h-4 w-4" />
                      <span className="sr-only">Save comment</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {c.content}
                  </div>
                )}
                {editingId !== c.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      onClick={() => setEditingId(c.id)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit comment</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete comment</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">U</AvatarFallback>
              </Avatar>
              <Input
                placeholder="Add comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
                className="flex-1 h-8"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                onClick={handleAddComment}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add comment</span>
              </Button>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
