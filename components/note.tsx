"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  ChecklistItem as ChecklistItemComponent,
  ChecklistItem,
} from "@/components/checklist-item";
import { DraggableRoot, DraggableContainer, DraggableItem } from "@/components/ui/draggable";
import { cn } from "@/lib/utils";
import { Trash2, Archive, ArchiveRestore, Calendar, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Core domain types
export interface User {
  id: string;
  name: string | null;
  image?: string | null;
  email: string;
  isAdmin?: boolean;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
}

export interface Note {
  id: string;
  color: string;
  archivedAt?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  checklistItems?: ChecklistItem[];
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  board?: {
    id: string;
    name: string;
  };
  boardId: string;
  // Optional positioning properties for board layout
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface NoteProps {
  note: Note;
  syncDB?: boolean;
  currentUser?: User;
  onUpdate?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  onUnarchive?: (noteId: string) => void;
  readonly?: boolean;
  showBoardName?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Note({
  note,
  currentUser,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
  readonly = false,
  showBoardName = false,
  className,
  syncDB = true,
  style,
}: NoteProps) {
  const { resolvedTheme } = useTheme();

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [newItemContent, setNewItemContent] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const canEdit = !readonly && (currentUser?.id === note.user.id || currentUser?.isAdmin);

  const isPastDue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    try {
      if (!note.checklistItems) return;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );

      const sortedItems = updatedItems.sort((a, b) => a.order - b.order);

      const optimisticNote = {
        ...note,
        checklistItems: sortedItems,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: sortedItems,
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error("Server error, reverting optimistic update");
              onUpdate?.(note);
            } else {
              const { note: updatedNote } = await response.json();
              onUpdate?.(updatedNote);
            }
          })
          .catch((error) => {
            console.error("Error toggling checklist item:", error);
            onUpdate?.(note);
          });
      }
    } catch (error) {
      console.error("Error toggling checklist item:", error);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      if (!note.checklistItems) return;
      const updatedItems = note.checklistItems.filter((item) => item.id !== itemId);

      const optimisticNote = {
        ...note,
        checklistItems: updatedItems,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
          }),
        });

        if (response.ok) {
          const { note: updatedNote } = await response.json();
          onUpdate?.(updatedNote);
        } else {
          onUpdate?.(note);
        }
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const handleEditChecklistItem = async (itemId: string, content: string) => {
    try {
      if (!note.checklistItems) return;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, content } : item
      );

      const optimisticNote = {
        ...note,
        checklistItems: updatedItems,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
          }),
        });

        if (response.ok) {
          const { note: updatedNote } = await response.json();
          onUpdate?.(updatedNote);
        } else {
          onUpdate?.(note);
        }
      }
    } catch (error) {
      console.error("Error editing checklist item:", error);
    }
  };

  const handleReorderChecklistItems = async (noteId: string, newItems: ChecklistItem[]) => {
    try {
      if (!note.checklistItems) return;
      const allItemsChecked = newItems.every((item) => item.checked);
      // Disallow unchecked items to be after checked items
      const firstCheckedIndex = newItems.findIndex((element) => element.checked);
      const lastUncheckedIndex = newItems.map((element) => element.checked).lastIndexOf(false);
      if (
        firstCheckedIndex !== -1 &&
        lastUncheckedIndex !== -1 &&
        lastUncheckedIndex > firstCheckedIndex
      ) {
        return;
      }

      const updatedItems = newItems.map((item, index) => ({ ...item, order: index }));

      const optimisticNote = {
        ...note,
        checklistItems: updatedItems,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(`/api/boards/${note.boardId}/notes/${noteId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
            archivedAt: allItemsChecked ? new Date().toISOString() : null,
          }),
        });

        if (response.ok) {
          const { note: updatedNote } = await response.json();
          onUpdate?.(updatedNote);
        } else {
          onUpdate?.(note);
        }
      }
    } catch (error) {
      console.error("Failed to reorder checklist item:", error);
    }
  };

  const handleAddChecklistItem = async (content: string) => {
    try {
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        checked: false,
        order: note.checklistItems?.length ?? 0,
      };

      const allItemsChecked = [...(note.checklistItems || []), newItem].every(
        (item) => item.checked
      );

      const optimisticNote = {
        ...note,
        checklistItems: [...(note.checklistItems || []), newItem],
        archivedAt: allItemsChecked ? new Date().toISOString() : null,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: [...(note.checklistItems || []), newItem],
          }),
        });

        if (response.ok) {
          const { note: updatedNote } = await response.json();
          onUpdate?.(updatedNote);
        } else {
          onUpdate?.(note);
        }
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
    }
  };

  const handleStartEditItem = (itemId: string) => {
    const item = note.checklistItems?.find((i) => i.id === itemId);
    if (item && canEdit) {
      setEditingItem(itemId);
      setEditingItemContent(item.content);
    }
  };

  const handleStopEditItem = () => {
    setEditingItem(null);
    setEditingItemContent("");
  };

  const handleEditItem = (itemId: string, content: string) => {
    handleEditChecklistItem(itemId, content);
    handleStopEditItem();
  };

  const handleDeleteItem = (itemId: string) => {
    handleDeleteChecklistItem(itemId);
    handleStopEditItem();
  };

  const handleCreateNewItem = (content: string) => {
    if (content.trim()) {
      handleAddChecklistItem(content.trim());
      setNewItemContent("");
    }
  };

  const handleDueDateChange = async (date: Date | undefined) => {
    try {
      const optimisticNote = {
        ...note,
        dueDate: date ? date.toISOString() : null,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dueDate: date ? date.toISOString() : null,
          }),
        });

        if (response.ok) {
          const { note: updatedNote } = await response.json();
          onUpdate?.(updatedNote);
        } else {
          onUpdate?.(note);
        }
      }
      setIsDatePickerOpen(false);
    } catch (error) {
      console.error("Error updating due date:", error);
      onUpdate?.(note);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border",
        className
      )}
      data-testid="note-card"
      style={{
        backgroundColor: resolvedTheme === "dark" ? "#18181B" : note.color,
        ...style,
      }}
    >
      <div className="flex items-start justify-between mb-2 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-800">
            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-semibold">
              {note.user.name
                ? note.user.name.charAt(0).toUpperCase()
                : note.user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
            <AvatarImage
              src={note.user.image ? note.user.image : undefined}
              alt={note.user.name || ""}
            />
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 dark:text-zinc-100 truncate max-w-20">
              {note.user.name ? note.user.name.split(" ")[0] : note.user.email.split("@")[0]}
            </span>
            <div className="flex flex-col">
              {showBoardName && note.board && (
                <Link
                  href={`/boards/${note.board.id}`}
                  className="text-xs text-blue-600 dark:text-blue-400 opacity-80 font-medium truncate max-w-20 hover:opacity-100 transition-opacity"
                >
                  {note.board.name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canEdit && (
            <div className="flex space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={`Delete Note ${note.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(note.id);
                    }}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete note</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {canEdit && (
            <div className="flex items-center">
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        aria-label="Set due date"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDatePickerOpen(!isDatePickerOpen);
                        }}
                        className={cn(
                          "p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded",
                          note.dueDate && "text-blue-600 dark:text-blue-400"
                        )}
                        variant="ghost"
                        size="icon"
                      >
                        <Calendar className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{note.dueDate ? "Change due date" : "Set due date"}</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-0 text-muted-foreground dark:text-zinc-200">
                  <CalendarComponent
                    mode="single"
                    selected={note.dueDate ? new Date(note.dueDate) : undefined}
                    onSelect={(date) => {
                      // Only update if a different date is selected
                      // Don't allow deselecting by clicking the same date
                      if (date && (!note.dueDate || date.toISOString().split('T')[0] !== note.dueDate.split('T')[0])) {
                        handleDueDateChange(date);
                      }
                    }}
                    initialFocus
                    modifiersClassNames={{
                      outside: "text-gray-400 opacity-50 pointer-events-none",
                    }}
                    classNames={{
                      day: "hover:bg-sky-500 transition-colors duration-200 rounded",
                      disabled: "opacity-50 cursor-not-allowed hover:bg-transparent",
                      selected: "bg-sky-500 text-white hover:bg-sky-600",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          {canEdit && onArchive && (
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(note.id);
                    }}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                    variant="ghost"
                    size="icon"
                    aria-label="Archive note"
                  >
                    <Archive className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Archive note</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          {canEdit && onUnarchive && (
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnarchive(note.id);
                    }}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded"
                    variant="ghost"
                    size="icon"
                    aria-label="Unarchive note"
                  >
                    <ArchiveRestore className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Unarchive note</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
      {note.dueDate && (
        <div className="flex items-center space-x-2 mb-2 px-2 group">
          <Calendar className={cn(
            "w-3 h-3",
            isPastDue(note.dueDate) 
              ? "text-red-600 dark:text-red-400" 
              : "text-blue-600 dark:text-blue-400"
          )} />
          <span className={cn(
            "text-xs font-medium",
            isPastDue(note.dueDate)
              ? "text-red-600 dark:text-red-400"
              : "text-blue-600 dark:text-blue-400"
          )}>
            {isPastDue(note.dueDate) ? "Past Due: " : "Due: "}
            {format(new Date(note.dueDate), "MMM d, yyyy")}
          </span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "p-0.5 h-auto w-auto transition-colors opacity-0 group-hover:opacity-100",
                  isPastDue(note.dueDate)
                    ? "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    : "text-blue-600 dark:text-blue-400 hover:text-red-600 dark:hover:text-red-400"
                )}
                variant="ghost"
                size="icon"
                aria-label="Remove due date"
              >
                <X className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground dark:text-zinc-100">
                  Remove Due Date
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
                  Are you sure you want to remove the due date from this note? You can always add it back later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-300 dark:border-zinc-700 hover:bg-zinc-100 hover:text-foreground hover:border-gray-200 dark:hover:bg-zinc-800">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDueDateChange(undefined)}
                  className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
                >
                  Remove Due Date
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <div className="flex flex-col">
        <div className="overflow-y-auto space-y-1">
          {/* Checklist Items */}
          <DraggableRoot
            items={note.checklistItems ?? []}
            onItemsChange={(newItems) => {
              if (canEdit) {
                handleReorderChecklistItems(note.id, newItems);
              }
            }}
          >
            <DraggableContainer className="space-y-1">
              {note.checklistItems?.map((item) => (
                <DraggableItem key={item.id} id={item.id} disabled={!canEdit}>
                  <ChecklistItemComponent
                    item={item}
                    onToggle={handleToggleChecklistItem}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    isEditing={editingItem === item.id}
                    editContent={editingItem === item.id ? editingItemContent : undefined}
                    onEditContentChange={setEditingItemContent}
                    onStartEdit={handleStartEditItem}
                    onStopEdit={handleStopEditItem}
                    readonly={readonly}
                    showDeleteButton={canEdit}
                  />
                </DraggableItem>
              ))}
            </DraggableContainer>

            {/* Always-available New Item Input */}
            {canEdit && (
              <ChecklistItemComponent
                item={{
                  id: "new-item",
                  content: newItemContent,
                  checked: false,
                  order: 0,
                }}
                onEdit={() => {}}
                onDelete={() => {
                  setNewItemContent("");
                }}
                isEditing={true}
                editContent={newItemContent}
                onEditContentChange={setNewItemContent}
                onStopEdit={() => {
                  if (!newItemContent.trim()) {
                    setNewItemContent("");
                  }
                }}
                isNewItem={true}
                onCreateItem={handleCreateNewItem}
                readonly={false}
                showDeleteButton={false}
                className="gap-3"
              />
            )}
          </DraggableRoot>
        </div>
      </div>
    </div>
  );
}
