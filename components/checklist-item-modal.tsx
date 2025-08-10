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
import { ChecklistItem, Comment } from "@/components/checklist-item";
import { Comments } from "@/components/comments";
import { nanoid } from "nanoid";
import { User } from "@/components/note";

interface ChecklistItemModalProps {
  item: ChecklistItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string, comments: Comment[]) => void;
  currentUser?: User;
  readonly?: boolean;
}

export function ChecklistItemModal({
  item,
  open,
  onOpenChange,
  onSave,
  currentUser,
  readonly = false,
}: ChecklistItemModalProps) {
  const [content, setContent] = useState(item.content);
  const [comments, setComments] = useState<Comment[]>(item.comments || []);

  useEffect(() => {
    setContent(item.content);
    setComments(item.comments || []);
  }, [item]);

  const handleAddComment = (content: string) => {
    const comment: Comment = {
      id: nanoid(),
      content,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id,
      user: currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          }
        : undefined,
    };
    setComments([...comments, comment]);
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
          <Comments
            comments={comments}
            currentUser={currentUser}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            readonly={readonly}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
