"use client";

import * as React from "react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChecklistItem as ChecklistItemComponent, ChecklistItem } from "@/components/checklist-item";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

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
  onAddChecklistItem?: (noteId: string, content: string) => void;
  onToggleChecklistItem?: (noteId: string, itemId: string) => void;
  onEditChecklistItem?: (noteId: string, itemId: string, content: string) => void;
  onDeleteChecklistItem?: (noteId: string, itemId: string) => void;
  onSplitChecklistItem?: (noteId: string, itemId: string, content: string, cursorPosition: number) => void;
  onToggleAllChecklistItems?: (noteId: string) => void;
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
  onAddChecklistItem,
  onToggleChecklistItem,
  onEditChecklistItem,
  onDeleteChecklistItem,
  onSplitChecklistItem,
  onToggleAllChecklistItems,
  readonly = false,
  showBoardName = false,
  className,
  style,
}: NoteProps) {
  const [isEditing, setIsEditing] = useState(false);
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

  const canEdit = !readonly && (currentUser?.id === note.user.id || currentUser?.isAdmin);

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

  return (
    <div
      className={cn(
        "rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border",
        note.done && "opacity-80",
        className
      )}
      style={{
        backgroundColor: note.color,
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
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          {canEdit && (
            <div className="flex items-center">
              <Checkbox
                checked={note.done}
                onCheckedChange={() => onToggleAllChecklistItems?.(note.id)}
                className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                title={note.done ? "Uncheck all items" : "Check all items"}
              />
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex-1 min-h-0">
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
        <div className="flex-1 flex flex-col">
          <div className="overflow-y-auto space-y-1 flex-1">
            {/* Checklist Items */}
            {note.checklistItems?.map((item) => (
              <ChecklistItemComponent
                key={item.id}
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
            ))}

            {/* Add New Item Input */}
            {addingItem && canEdit && (
              <div className="flex items-center gap-3">
                <Checkbox disabled className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600" />
                <Input
                  type="text"
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  className="h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0"
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