"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { Checklist } from "./checklist";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChecklistItemData {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

interface NoteData {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  checklistItems?: ChecklistItemData[];
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  board?: {
    id: string;
    name: string;
  };
}

interface NoteProps {
  noteId: string;
  boardId: string;
  initialData?: NoteData;
  currentUserId?: string;
  isAdmin?: boolean;
  showBoardName?: boolean;
  onDelete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Note({
  noteId,
  boardId,
  initialData,
  currentUserId,
  isAdmin = false,
  showBoardName = false,
  onDelete,
  className,
  style,
}: NoteProps) {
  const [note, setNote] = useState<NoteData | null>(initialData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialData?.content || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(!initialData);

  const canEdit = currentUserId === note?.user.id || isAdmin;

  // Fetch note data on mount if not provided
  useEffect(() => {
    if (!initialData) {
      fetchNote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, boardId]);

  const fetchNote = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`);
      if (response.ok) {
        const { note } = await response.json();
        setNote(note);
        setEditContent(note.content);
      }
    } catch (error) {
      console.error("Error fetching note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!note || editContent === note.content) {
      setIsEditing(false);
      return;
    }

    try {
      // Optimistic update
      setNote(prev => prev ? { ...prev, content: editContent } : null);
      setIsEditing(false);

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (response.ok) {
        const { note: updatedNote } = await response.json();
        setNote(updatedNote);
      } else {
        // Revert on error
        setNote(prev => prev ? { ...prev, content: note.content } : null);
        setEditContent(note.content);
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error updating note:", error);
      setNote(prev => prev ? { ...prev, content: note.content } : null);
      setEditContent(note.content);
      setIsEditing(true);
    }
  };

  const handleToggleAllItems = async () => {
    if (!note?.checklistItems) return;

    try {
      const allChecked = note.checklistItems.every((item) => item.checked);
      const updatedItems = note.checklistItems.map((item) => ({
        ...item,
        checked: !allChecked,
      }));

      const sortedItems = [
        ...updatedItems
          .filter((item) => !item.checked)
          .sort((a, b) => a.order - b.order),
        ...updatedItems
          .filter((item) => item.checked)
          .sort((a, b) => a.order - b.order),
      ];

      const noteIsDone = !allChecked;

      // Optimistic update
      setNote(prev => prev ? { ...prev, checklistItems: sortedItems, done: noteIsDone } : null);

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: sortedItems,
          done: noteIsDone,
        }),
      });

      if (response.ok) {
        const { note: updatedNote } = await response.json();
        setNote(updatedNote);
      } else {
        // Revert on error
        fetchNote();
      }
    } catch (error) {
      console.error("Error toggling all checklist items:", error);
      fetchNote();
    }
  };

  const handleChecklistUpdate = (items: ChecklistItemData[], done: boolean) => {
    setNote(prev => prev ? { ...prev, checklistItems: items, done } : null);
  };

  const confirmDeleteNote = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete?.();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
    setDeleteDialogOpen(false);
  };

  if (loading || !note) {
    return (
      <div
        className={cn("rounded-lg shadow-lg animate-pulse", className)}
        style={style}
      >
        <div className="h-full bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  const backgroundColor = 
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? `${note.color}20`
      : note.color;

  return (
    <>
      <div
        className={cn(
          "rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border",
          note.done && "opacity-80",
          className
        )}
        style={{
          backgroundColor,
          ...style,
        }}
      >
        {/* User Info Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-800">
              <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-semibold">
                {note.user.name
                  ? note.user.name.charAt(0).toUpperCase()
                  : note.user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-20">
                {note.user.name
                  ? note.user.name.split(" ")[0]
                  : note.user.email.split("@")[0]}
              </span>
              <div className="flex flex-col">
                {showBoardName && note.board && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 opacity-80 font-medium truncate max-w-20">
                    {note.board.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {canEdit && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
            {canEdit && note.checklistItems && note.checklistItems.length > 0 && (
              <div className="flex items-center">
                <Checkbox
                  checked={note.done}
                  onCheckedChange={handleToggleAllItems}
                  className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                  title={
                    note.done
                      ? "Uncheck all items"
                      : "Check all items"
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="flex-1 min-h-0">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7 text-gray-800 dark:text-gray-200"
              placeholder="Enter note content..."
              onBlur={handleUpdateNote}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleUpdateNote();
                }
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditContent(note.content);
                }
                if (e.key === "Backspace" && editContent.trim() === "") {
                  setDeleteDialogOpen(true);
                }
              }}
              autoFocus
            />
          </div>
        ) : (
          <Checklist
            noteId={noteId}
            boardId={boardId}
            items={note.checklistItems || []}
            canEdit={canEdit}
            onItemsUpdate={handleChecklistUpdate}
            onContentEdit={() => {
              setIsEditing(true);
            }}
          />
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete note
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete this note? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNote}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}