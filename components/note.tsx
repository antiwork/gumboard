"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { Checklist } from "./checklist";
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
  onToggleAllChecklistItems?: (noteId: string) => void;
  onChecklistUpdate?: (noteId: string, items: ChecklistItemData[], done: boolean) => void;
  boardId?: string;
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
  onToggleAllChecklistItems,
  onChecklistUpdate,
  boardId,
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

  const handleChecklistUpdate = (items: ChecklistItemData[], done: boolean) => {
    if (onChecklistUpdate) {
      onChecklistUpdate(id, items, done);
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
        <Checklist
          noteId={id}
          boardId={boardId || ""}
          items={checklistItems}
          canEdit={canEdit}
          editingItemId={editingChecklistItemId}
          isAddingItem={addingChecklistItem}
          newItemContent={newChecklistItemContent}
          onItemsUpdate={handleChecklistUpdate}
          onEditStart={(itemId) => onChecklistItemEditStart?.(id, itemId)}
          onEditEnd={() => onChecklistItemEditEnd?.()}
          onNewItemChange={(content) => {
            if (onNewChecklistItemChange) {
              onNewChecklistItemChange(content);
            } else {
              setInternalNewChecklistItemContent(content);
            }
          }}
          onAddTaskClick={() => {
            if (onAddTaskClick) {
              onAddTaskClick();
            } else {
              setInternalAddingChecklistItem(true);
            }
          }}
          onCancelAddingItem={() => {
            if (onCancelAddingItem) {
              onCancelAddingItem();
            } else {
              setInternalAddingChecklistItem(false);
              setInternalNewChecklistItemContent("");
            }
          }}
          onError={(title, description) => {
            console.error(`${title}: ${description}`);
          }}
        />
      )}
    </div>
  );
}