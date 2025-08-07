"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { ChecklistItem } from "./checklist-item";
import { cn } from "@/lib/utils";

interface ChecklistItemData {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

interface NoteProps {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
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
  currentUserId?: string;
  isAdmin?: boolean;
  showBoardName?: boolean;
  isEditing?: boolean;
  editingChecklistItemId?: string | null;
  isAddingChecklistItem?: boolean;
  newChecklistItemContent?: string;
  onUpdate?: (noteId: string, content: string) => void;
  onDelete?: (noteId: string) => void;
  onAddChecklistItem?: (noteId: string, content: string) => void;
  onToggleChecklistItem?: (noteId: string, itemId: string) => void;
  onDeleteChecklistItem?: (noteId: string, itemId: string) => void;
  onEditChecklistItem?: (noteId: string, itemId: string, content: string) => void;
  onToggleAllChecklistItems?: (noteId: string) => void;
  onSplitChecklistItem?: (noteId: string, itemId: string, content: string, cursorPosition: number) => void;
  onDebouncedEditChecklistItem?: (noteId: string, itemId: string, content: string) => void;
  onEditStart?: (noteId: string) => void;
  onEditEnd?: (noteId: string) => void;
  onChecklistItemEditStart?: (noteId: string, itemId: string) => void;
  onChecklistItemEditEnd?: () => void;
  onNewChecklistItemChange?: (content: string) => void;
  onAddTaskClick?: () => void;
  onCancelAddingItem?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function Note({
  id,
  content,
  color,
  done,
  createdAt,
  checklistItems = [],
  user,
  board,
  currentUserId,
  isAdmin = false,
  showBoardName = false,
  isEditing: externalIsEditing = false,
  editingChecklistItemId: externalEditingChecklistItemId = null,
  isAddingChecklistItem: externalIsAddingChecklistItem = false,
  newChecklistItemContent: externalNewChecklistItemContent = "",
  onUpdate,
  onDelete,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onEditChecklistItem,
  onToggleAllChecklistItems,
  onSplitChecklistItem,
  onDebouncedEditChecklistItem,
  onEditStart,
  onEditEnd,
  onChecklistItemEditStart,
  onChecklistItemEditEnd,
  onNewChecklistItemChange,
  onAddTaskClick,
  onCancelAddingItem,
  className,
  style,
}: NoteProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [internalAddingChecklistItem, setInternalAddingChecklistItem] = useState(false);
  const [internalNewChecklistItemContent, setInternalNewChecklistItemContent] = useState("");
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  const isEditing = externalIsEditing || internalIsEditing;
  const editingChecklistItemId = externalEditingChecklistItemId;
  const addingChecklistItem = externalIsAddingChecklistItem || internalAddingChecklistItem;
  const newChecklistItemContent = externalIsAddingChecklistItem ? externalNewChecklistItemContent : internalNewChecklistItemContent;

  const canEdit = currentUserId === user.id || isAdmin;

  const handleUpdateNote = () => {
    if (onUpdate && editContent !== content) {
      onUpdate(id, editContent);
    }
    if (onEditEnd) {
      onEditEnd(id);
    } else {
      setInternalIsEditing(false);
    }
  };

  const handleAddChecklistItem = () => {
    if (onAddChecklistItem && newChecklistItemContent.trim()) {
      onAddChecklistItem(id, newChecklistItemContent);
      if (!externalIsAddingChecklistItem) {
        setInternalNewChecklistItemContent("");
      }
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (onToggleChecklistItem) {
      setAnimatingItems(new Set([...animatingItems, itemId]));
      onToggleChecklistItem(id, itemId);
      setTimeout(() => {
        setAnimatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 200);
    }
  };

  const backgroundColor = 
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? `${color}20`
      : color;

  return (
    <div
      className={cn(
        "rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border",
        done && "opacity-80",
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
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-20">
              {user.name
                ? user.name.split(" ")[0]
                : user.email.split("@")[0]}
            </span>
            <div className="flex flex-col">
              {showBoardName && board && (
                <span className="text-xs text-blue-600 dark:text-blue-400 opacity-80 font-medium truncate max-w-20">
                  {board.name}
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
                  onDelete?.(id);
                }}
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
          {canEdit && (
            <div className="flex items-center">
              <Checkbox
                checked={done}
                onCheckedChange={() => {
                  onToggleAllChecklistItems?.(id);
                }}
                className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                title={
                  done
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
                if (onEditEnd) {
                  onEditEnd(id);
                } else {
                  setInternalIsEditing(false);
                }
                setEditContent(content);
              }
              if (e.key === "Backspace" && editContent.trim() === "") {
                onDelete?.(id);
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="overflow-y-auto space-y-1 flex-1">
            {checklistItems.map((item) => (
              <ChecklistItem
                key={item.id}
                content={item.content}
                checked={item.checked}
                isEditing={editingChecklistItemId === item.id}
                canEdit={canEdit}
                onToggle={() => handleToggleChecklistItem(item.id)}
                onDelete={() => onDeleteChecklistItem?.(id, item.id)}
                onEdit={(newContent) => onDebouncedEditChecklistItem ? onDebouncedEditChecklistItem(id, item.id, newContent) : onEditChecklistItem?.(id, item.id, newContent)}
                onEditStart={() => onChecklistItemEditStart?.(id, item.id)}
                onEditEnd={() => onChecklistItemEditEnd?.()}
                onSplit={(content, cursorPosition) => 
                  onSplitChecklistItem?.(id, item.id, content, cursorPosition)
                }
                isAnimating={animatingItems.has(item.id)}
              />
            ))}

            {addingChecklistItem && (
              <div className="flex items-center group/item rounded gap-3 transition-all duration-200">
                <Checkbox
                  checked={false}
                  disabled
                  className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                />
                <Input
                  type="text"
                  value={newChecklistItemContent}
                  onChange={(e) => {
                    if (onNewChecklistItemChange) {
                      onNewChecklistItemChange(e.target.value);
                    } else {
                      setInternalNewChecklistItemContent(e.target.value);
                    }
                  }}
                  className="flex-1 bg-transparent border-none text-sm leading-6 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Add new item..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddChecklistItem();
                    }
                    if (e.key === "Escape") {
                      if (onCancelAddingItem) {
                        onCancelAddingItem();
                      } else {
                        setInternalAddingChecklistItem(false);
                        setInternalNewChecklistItemContent("");
                      }
                    }
                    if (e.key === "Backspace" && newChecklistItemContent.trim() === "") {
                      if (onCancelAddingItem) {
                        onCancelAddingItem();
                      } else {
                        setInternalAddingChecklistItem(false);
                        setInternalNewChecklistItemContent("");
                      }
                    }
                  }}
                  onBlur={() => {
                    if (newChecklistItemContent.trim()) {
                      handleAddChecklistItem();
                    } else {
                      if (onCancelAddingItem) {
                        onCancelAddingItem();
                      } else {
                        setInternalAddingChecklistItem(false);
                      }
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddTaskClick) {
                  onAddTaskClick();
                } else {
                  setInternalAddingChecklistItem(true);
                }
              }}
              className="mt-2 justify-start text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-gray-100 text-sm opacity-70 hover:opacity-100"
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