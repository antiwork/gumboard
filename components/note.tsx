"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChecklistItem as ChecklistItemComponent, ChecklistItem } from "@/components/checklist-item";
import { cn } from "@/lib/utils";
import { Trash2, Plus, Archive } from "lucide-react";
import { useTheme } from "next-themes";

// Core domain types
export interface User {
  id: string;
  name: string | null;
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
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  checklistItems?: ChecklistItem[];
  user: {
    id: string;
    name: string | null;
    email: string;
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
  currentUser?: User;
  boardId: string;
  addingChecklistItem?: string | null;
  onUpdate?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  readonly?: boolean;
  showBoardName?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Note({
  note,
  currentUser,
  boardId,
  addingChecklistItem,
  onUpdate,
  onDelete,
  onArchive,
  readonly = false,
  showBoardName = false,
  className,
  style,
}: NoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { resolvedTheme } = useTheme();
  const [editContent, setEditContent] = useState(note.content);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [addingItem, setAddingItem] = useState(
    !readonly &&
    currentUser &&
    (currentUser.id === note.user.id || currentUser.isAdmin) &&
    (!note.checklistItems || note.checklistItems.length === 0)
  );
  const [newItemContent, setNewItemContent] = useState("");
  const newItemInputRef = useRef<HTMLInputElement>(null);

  const canEdit = !readonly && (currentUser?.id === note.user.id || currentUser?.isAdmin);

  useEffect(() => {
    if (addingChecklistItem === note.id && canEdit) {
      setAddingItem(true);
    }
  }, [addingChecklistItem, note.id, canEdit]);

  const handleToggleChecklistItem = async (itemId: string) => {
    try {
      if (!note.checklistItems) return;

      const targetBoardId = boardId === "all-notes" && note.board?.id ? note.board.id : boardId;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );

      const sortedItems = [
        ...updatedItems
          .filter((item) => !item.checked)
          .sort((a, b) => a.order - b.order),
        ...updatedItems
          .filter((item) => item.checked)
          .sort((a, b) => a.order - b.order),
      ];

      const optimisticNote = {
        ...note,
        checklistItems: sortedItems,
      };

      onUpdate?.(optimisticNote);

      fetch(`/api/boards/${targetBoardId}/notes/${note.id}`, {
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
    } catch (error) {
      console.error("Error toggling checklist item:", error);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      if (!note.checklistItems) return;

      const targetBoardId = boardId === "all-notes" && note.board?.id ? note.board.id : boardId;

      const updatedItems = note.checklistItems.filter(
        (item) => item.id !== itemId
      );

      const optimisticNote = {
        ...note,
        checklistItems: updatedItems,
      };

      onUpdate?.(optimisticNote);

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${note.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
          }),
        }
      );

      if (response.ok) {
        const { note: updatedNote } = await response.json();
        onUpdate?.(updatedNote);
      } else {
        console.error("Server error, reverting optimistic update");
        onUpdate?.(note);
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      onUpdate?.(note);
    }
  };

  const handleEditChecklistItem = async (itemId: string, content: string) => {
    try {
      if (!note.checklistItems) return;

      const targetBoardId = boardId === "all-notes" && note.board?.id ? note.board.id : boardId;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, content } : item
      );

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${note.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
          }),
        }
      );

      if (response.ok) {
        const { note: updatedNote } = await response.json();
        onUpdate?.(updatedNote);
      }
    } catch (error) {
      console.error("Error editing checklist item:", error);
    }
  };

  const handleSplitChecklistItem = async (
    itemId: string,
    content: string,
    cursorPosition: number
  ) => {
    try {
      if (!note.checklistItems) return;

      const targetBoardId = boardId === "all-notes" && note.board?.id ? note.board.id : boardId;

      const firstHalf = content.substring(0, cursorPosition).trim();
      const secondHalf = content.substring(cursorPosition).trim();

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, content: firstHalf } : item
      );

      const currentItem = note.checklistItems.find(
        (item) => item.id === itemId
      );
      const currentOrder = currentItem?.order || 0;

      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: secondHalf,
        checked: false,
        order: currentOrder + 0.5,
      };

      const allItems = [...updatedItems, newItem].sort(
        (a, b) => a.order - b.order
      );

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${note.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistItems: allItems,
          }),
        }
      );

      if (response.ok) {
        const { note: updatedNote } = await response.json();
        onUpdate?.(updatedNote);
      }
    } catch (error) {
      console.error("Error splitting checklist item:", error);
    }
  };

  const handleAddChecklistItem = async (content: string) => {
    try {
      const targetBoardId = boardId === "all-notes" && note.board?.id ? note.board.id : boardId;

      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content,
        checked: false,
        order: (note.checklistItems?.length || 0) + 1,
      };

      const allItemsChecked = [...(note.checklistItems || []), newItem].every(
        (item) => item.checked
      );

      const optimisticNote = {
        ...note,
        checklistItems: [...(note.checklistItems || []), newItem],
        done: allItemsChecked,
      };

      onUpdate?.(optimisticNote);

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${note.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: [...(note.checklistItems || []), newItem],
          }),
        }
      );

      if (response.ok) {
        const { note: updatedNote } = await response.json();
        onUpdate?.(updatedNote);
      } else {
        onUpdate?.(note);
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      onUpdate?.(note);
    }
  };

  const handleStartEdit = () => {
    if (canEdit) {
      setIsEditing(true);
      setEditContent(note.content);
    }
  };

  const handleStopEdit = () => {
    setIsEditing(false);
    if (onUpdate && editContent !== note.content) {
      onUpdate({ ...note, content: editContent });
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

  const handleSplitItem = (itemId: string, content: string, cursorPosition: number) => {
    handleSplitChecklistItem(itemId, content, cursorPosition);
    handleStopEditItem();
  };

  const handleAddItem = () => {
    if (newItemContent.trim()) {
      handleAddChecklistItem(newItemContent.trim());
      setNewItemContent("");
      setAddingItem(false);
    }
  };

  const handleKeyDownNewItem = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
    if (e.key === "Escape") {
      setAddingItem(false);
      setNewItemContent("");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border",
        className
      )}
      style={{
        backgroundColor: resolvedTheme === 'dark' ? "#18181B" : note.color,
        ...style,
      }}
    >
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
            <div className="flex space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Button
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
            </div>
          )}
          {canEdit && onArchive && (
            <div className="flex items-center">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(note.id);
                }}
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                variant="ghost"
                size="icon"
                title="Archive note"
              >
                <Archive className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="min-h-0">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7 text-gray-800 dark:text-gray-200"
            placeholder="Enter note content..."
            onBlur={handleStopEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleStopEdit();
              }
              if (e.key === "Escape") {
                setIsEditing(false);
                setEditContent(note.content);
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="overflow-y-auto space-y-1">
            {/* Checklist Items */}
            {note.checklistItems?.map((item) => (
              <ChecklistItemComponent
                key={item.id}
                item={item}
                onToggle={handleToggleChecklistItem}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                onSplit={handleSplitItem}
                isEditing={editingItem === item.id}
                editContent={editingItem === item.id ? editingItemContent : undefined}
                onEditContentChange={setEditingItemContent}
                onStartEdit={handleStartEditItem}
                onStopEdit={handleStopEditItem}
                readonly={readonly}
                showDeleteButton={canEdit}
              />
            ))}

            {/* Add New Item Input */}
            {addingItem && canEdit && (
              <div className="flex items-center gap-3">
                <Checkbox disabled className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600" />
                <Input
                  ref={newItemInputRef}
                  type="text"
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="h-auto flex-1 border-none bg-transparent px-1 py-0.5 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Add new item..."
                  onBlur={handleAddItem}
                  onKeyDown={handleKeyDownNewItem}
                  autoFocus
                />
              </div>
            )}

            {/* Content as text if no checklist items */}
            {(!note.checklistItems || note.checklistItems.length === 0) && !isEditing && (
              <div
                className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed cursor-pointer"
                onClick={handleStartEdit}
              >
                {note.content || "Click to add content..."}
              </div>
            )}
          </div>

          {/* Add Item Button */}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (addingItem && newItemInputRef.current && newItemContent.length === 0) {
                  newItemInputRef.current.focus();
                } else {
                  setAddingItem(true);
                }
              }}
              className="mt-2 justify-start text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
