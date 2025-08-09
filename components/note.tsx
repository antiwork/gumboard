"use client";

import * as React from "react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ChecklistItem as ChecklistItemComponent,
  ChecklistItem,
} from "@/components/checklist-item";
import { cn } from "@/lib/utils";
import { Trash2, Plus, Archive } from "lucide-react";
import { useTheme } from "next-themes";
import { nanoid } from "nanoid";

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
  description?: string;
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
  // Optional positioning properties for board layout
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface NoteProps {
  note: Note;
  currentUser?: User;
  onUpdate?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  onAddChecklistItem?: (noteId: string, content: string) => void;
  onToggleChecklistItem?: (noteId: string, itemId: string) => void;
  onEditChecklistItem?: (noteId: string, itemId: string, content: string) => void;
  onDeleteChecklistItem?: (noteId: string, itemId: string) => void;
  onSplitChecklistItem?: (noteId: string, itemId: string, content: string, cursorPosition: number) => void;
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
  onAddChecklistItem,
  onToggleChecklistItem,
  onEditChecklistItem,
  onDeleteChecklistItem,
  onSplitChecklistItem,
  readonly = false,
  showBoardName = false,
  className,
  style,
}: NoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { resolvedTheme } = useTheme();
  const [editContent, setEditContent] = useState(note.content);
  const [editDescription, setEditDescription] = useState(note.description || "");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingItemContent, setEditingItemContent] = useState("");
  const [addingItem, setAddingItem] = useState(
    !readonly &&
    currentUser &&
    (currentUser.id === note.user.id || currentUser.isAdmin) &&
    (!note.checklistItems || note.checklistItems.length === 0)
  );
  const [newItemContent, setNewItemContent] = useState("");
  const [newItemComments, setNewItemComments] = useState<Record<string, string>>({});

  const canEdit = !readonly && (currentUser?.id === note.user.id || currentUser?.isAdmin);

  const handleStartEdit = () => {
    if (canEdit) {
      setIsEditing(true);
      setEditContent(note.content);
      setEditDescription(note.description || "");
    }
  };

  const handleStopEdit = () => {
    setIsEditing(false);
    if (onUpdate && (editContent !== note.content || editDescription !== (note.description || ""))) {
      onUpdate({ ...note, content: editContent, description: editDescription });
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
    if (onEditChecklistItem) {
      onEditChecklistItem(note.id, itemId, content);
    }
    handleStopEditItem();
  };

  const handleDeleteItem = (itemId: string) => {
    if (onDeleteChecklistItem) {
      onDeleteChecklistItem(note.id, itemId);
    }
    handleStopEditItem();
  };

  const handleSplitItem = (itemId: string, content: string, cursorPosition: number) => {
    if (onSplitChecklistItem) {
      onSplitChecklistItem(note.id, itemId, content, cursorPosition);
    }
    handleStopEditItem();
  };

  const handleAddItem = () => {
    if (newItemContent.trim() && onAddChecklistItem) {
      onAddChecklistItem(note.id, newItemContent.trim());
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

  const handleAddItemComment = (itemId: string) => {
    const content = (newItemComments[itemId] || "").trim();
    if (!content) return;
    const updatedItems = (note.checklistItems || []).map((item) =>
      item.id === itemId
        ? { ...item, comments: [...(item.comments || []), { id: nanoid(), content }] }
        : item
    );
    onUpdate?.({ ...note, checklistItems: updatedItems });
    setNewItemComments((prev) => ({ ...prev, [itemId]: "" }));
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
        <div className="flex-1 min-h-0 space-y-2">
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
                setEditDescription(note.description || "");
              }
            }}
            autoFocus
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full p-2 bg-transparent border-none resize-none focus:outline-none text-sm leading-6 text-gray-700 dark:text-gray-300"
            placeholder="Add description..."
          />
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="space-y-1">
            {/* Checklist Items */}
            {note.checklistItems?.map((item) => (
              <div key={item.id} className="space-y-1">
                <ChecklistItemComponent
                  item={item}
                  onToggle={(itemId) => onToggleChecklistItem?.(note.id, itemId)}
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
                {item.comments?.map((c) => (
                  <div
                    key={c.id}
                    className="ml-8 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    {c.content}
                  </div>
                ))}
                {canEdit && (
                  <div className="ml-8 flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Add comment"
                      value={newItemComments[item.id] || ""}
                      onChange={(e) =>
                        setNewItemComments((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddItemComment(item.id);
                      }}
                      className="h-6 flex-1 border-none bg-transparent px-1 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleAddItemComment(item.id)}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {/* Add New Item Input */}
            {addingItem && canEdit && (
              <div className="flex items-center gap-3">
                <Checkbox disabled className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600" />
                <Input
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

          {note.description && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {note.description}
            </p>
          )}

          {/* Add Item Button */}
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingItem(true)}
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

