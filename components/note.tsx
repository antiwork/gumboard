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
import { Trash2, Archive, ArchiveRestore, Eye, EyeOff, Copy, CheckSquare } from "lucide-react";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";

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
  onDuplicate?: (noteId: string) => void;
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
  onDuplicate,
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
  const [hideCompleted, setHideCompleted] = useState(false);

  const canEdit = !readonly && (currentUser?.id === note.user.id || currentUser?.isAdmin);

  // Persist hide/show completed per note
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(`gumboard-hide-completed-${note.id}`);
      if (saved !== null) setHideCompleted(saved === "1");
    } catch (e) {
      // no-op
    }
  }, [note.id]);
  React.useEffect(() => {
    try {
      localStorage.setItem(`gumboard-hide-completed-${note.id}`, hideCompleted ? "1" : "0");
    } catch (e) {
      // no-op
    }
  }, [hideCompleted, note.id]);

  const handleToggleChecklistItem = async (itemId: string) => {
    try {
      if (!note.checklistItems) return;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );

      const sortedItems = [
        ...updatedItems.filter((item) => !item.checked).sort((a, b) => a.order - b.order),
        ...updatedItems.filter((item) => item.checked).sort((a, b) => a.order - b.order),
      ];

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
      const deletedItem = note.checklistItems.find((item) => item.id === itemId);
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

      if (deletedItem) {
        toast("Item deleted", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                const restored = [...updatedItems, deletedItem]
                  .sort((a, b) => a.order - b.order)
                  .map((it, index) => ({ ...it, order: index }));

                const optimisticRestored = {
                  ...note,
                  checklistItems: restored,
                };
                onUpdate?.(optimisticRestored);

                if (syncDB) {
                  const resp = await fetch(
                    `/api/boards/${note.boardId}/notes/${note.id}`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ checklistItems: restored }),
                    }
                  );
                  if (resp.ok) {
                    const { note: updatedNoteAfterUndo } = await resp.json();
                    onUpdate?.(updatedNoteAfterUndo);
                  } else {
                    onUpdate?.(optimisticNote);
                  }
                }
              } catch (e) {
                console.error("Failed to undo checklist delete:", e);
                onUpdate?.(optimisticNote);
              }
            },
          },
          duration: 4000,
        });
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
  const handleClearCompleted = async () => {
    try {
      const allItems = note.checklistItems || [];
      const remaining = allItems.filter((i) => !i.checked);
      if (remaining.length === allItems.length) return;

      const optimisticNote = { ...note, checklistItems: remaining } as Note;
      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklistItems: remaining }),
        });
        if (response.ok) {
          const { note: updatedNote } = await response.json();
          onUpdate?.(updatedNote);
        } else {
          onUpdate?.(note);
        }
      }

      toast("Cleared completed", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const restored = (note.checklistItems || []).slice().sort((a, b) => a.order - b.order);
              const resp = await fetch(`/api/boards/${note.boardId}/notes/${note.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checklistItems: restored }),
              });
              if (resp.ok) {
                const { note: updatedNoteAfterUndo } = await resp.json();
                onUpdate?.(updatedNoteAfterUndo);
              } else {
                onUpdate?.(note);
              }
            } catch (e) {
              console.error("Failed to undo clear completed:", e);
              onUpdate?.(note);
            }
          },
        },
        duration: 4000,
      });
    } catch (e) {
      console.error("Error clearing completed items:", e);
    }
  };

  const visibleChecklistItems = React.useMemo(() => {
    if (!note.checklistItems) return [] as ChecklistItem[];
    return hideCompleted ? note.checklistItems.filter((i) => !i.checked) : note.checklistItems;
  }, [hideCompleted, note.checklistItems]);

  const handleCreateNewItem = (content: string) => {
    if (content.trim()) {
      handleAddChecklistItem(content.trim());
      setNewItemContent("");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border",
        className
      )}
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
            <AvatarImage src={note.user.image || ""} alt={note.user.name || ""} />
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 dark:text-zinc-200 truncate max-w-20">
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
              {/* Hide/Show Completed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label={hideCompleted ? "Show completed" : "Hide completed"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHideCompleted((v) => !v);
                    }}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded"
                    variant="ghost"
                    size="icon"
                  >
                    {hideCompleted ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hideCompleted ? "Show completed" : "Hide completed"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Clear Completed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    aria-label="Clear completed"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCompleted();
                    }}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded"
                    variant="ghost"
                    size="icon"
                  >
                    <CheckSquare className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear completed</p>
                </TooltipContent>
              </Tooltip>

              {/* Duplicate Note */}
              {onDuplicate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Duplicate note"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate?.(note.id);
                      }}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded"
                      variant="ghost"
                      size="icon"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Duplicate note</p>
                  </TooltipContent>
                </Tooltip>
              )}

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

      <div className="flex flex-col">
        <div className="overflow-y-auto space-y-1">
          {/* Checklist Items */}
          <DraggableRoot
            items={visibleChecklistItems}
            onItemsChange={(newItems) => {
              handleReorderChecklistItems(note.id, newItems);
            }}
          >
            <DraggableContainer className="space-y-1">
              {visibleChecklistItems.map((item) => (
                <DraggableItem key={item.id} id={item.id}>
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
