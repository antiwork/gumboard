"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChecklistItem as ChecklistItemComponent, ChecklistItem } from "@/components/checklist-item";
import { cn } from "@/lib/utils";
import { Trash2, Plus, Archive, ArchiveRestore, Info } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

const getHoverBackgroundColor = (backgroundColor: string, isDark: boolean) => {
  if (isDark) {
    return "hover:bg-zinc-700/50";
  }
  
  const colorToHover: { [key: string]: string } = {
    "#fef3c7": "hover:bg-yellow-200/50",
    "#fed7d7": "hover:bg-red-200/50",
    "#d1fae5": "hover:bg-green-200/50",
    "#dbeafe": "hover:bg-blue-200/50",
    "#e0e7ff": "hover:bg-indigo-200/50",
    "#f3e8ff": "hover:bg-purple-200/50",
    "#fce7f3": "hover:bg-pink-200/50",
    "#f0fdfa": "hover:bg-teal-200/50",
    "#fef7ff": "hover:bg-fuchsia-200/50",
    "#fff7ed": "hover:bg-orange-200/50",
    "#ffffff": "hover:bg-gray-200/50",
    "#f8fafc": "hover:bg-slate-200/50",
  };

  const hoverColor = colorToHover[backgroundColor.toLowerCase()];
  if (hoverColor) {
    return hoverColor;
  }

  if (backgroundColor.startsWith("#")) {
    const hex = backgroundColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    if (brightness > 128) {
      const darkerR = Math.max(0, r - 30);
      const darkerG = Math.max(0, g - 30);
      const darkerB = Math.max(0, b - 30);
      return `hover:bg-[rgb(${darkerR},${darkerG},${darkerB})]`;
    } else {
      const lighterR = Math.min(255, r + 30);
      const lighterG = Math.min(255, g + 30);
      const lighterB = Math.min(255, b + 30);
      return `hover:bg-[rgb(${lighterR},${lighterG},${lighterB})]`;
    }
  }

  return "hover:bg-gray-200/50";
};

const getBorderColor = (backgroundColor: string, isDark: boolean) => {
  if (isDark) {
    return "border-gray-600";
  }
  
  const colorToBorder: { [key: string]: string } = {
    "#fef3c7": "border-yellow-300",
    "#fed7d7": "border-red-300",
    "#d1fae5": "border-green-300",
    "#dbeafe": "border-blue-300",
    "#e0e7ff": "border-indigo-300",
    "#f3e8ff": "border-purple-300",
    "#fce7f3": "border-pink-300",
    "#f0fdfa": "border-teal-300",
    "#fef7ff": "border-fuchsia-300",
    "#fff7ed": "border-orange-300",
    "#ffffff": "border-gray-300",
    "#f8fafc": "border-slate-300",
  };

  const borderColor = colorToBorder[backgroundColor.toLowerCase()];
  if (borderColor) {
    return borderColor;
  }

  if (backgroundColor.startsWith("#")) {
    const hex = backgroundColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    if (brightness > 200) {
      return "border-gray-400";
    } else if (brightness > 128) {
      return "border-gray-500";
    } else {
      return "border-gray-300";
    }
  }

  return "border-gray-300";
};

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
  syncDB?: boolean;
  currentUser?: User;
  addingChecklistItem?: string | null;
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
  addingChecklistItem,
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
  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
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
      const updatedItems = note.checklistItems.filter(
        (item) => item.id !== itemId
      );
      
      const optimisticNote = {
        ...note,
        checklistItems: updatedItems,
      };
  
      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(
          `/api/boards/${note.boardId}/notes/${note.id}`,
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
        const response = await fetch(
          `/api/boards/${note.boardId}/notes/${note.id}`,
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

      const optimisticNote = {
        ...note,
        checklistItems: allItems,
      };

      onUpdate?.(optimisticNote);

      if (syncDB) {
        const response = await fetch(
          `/api/boards/${note.boardId}/notes/${note.id}`,
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
      }
    } catch (error) {
      console.error("Error splitting checklist item:", error);
    }
  };

  const handleAddChecklistItem = async (content: string) => {
    try {
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

      if (syncDB) {
        const response = await fetch(
          `/api/boards/${note.boardId}/notes/${note.id}`,
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
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
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

  const borderColorClass = getBorderColor(note.color, resolvedTheme === 'dark');

  return (
    <div
      className={cn(
        "rounded-lg shadow-md hover:shadow-lg select-none group transition-all duration-200 flex flex-col border box-border",
        borderColorClass,
        className
      )}
      style={{
        backgroundColor: resolvedTheme === 'dark' ? "#18181B" : note.color,
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
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-20">
              {note.user.name
                ? note.user.name.split(" ")[0]
                : note.user.email.split("@")[0]}
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
        <div className="flex items-center space-x-1.5">
          <Popover open={showInfoPopover} onOpenChange={setShowInfoPopover}>
            <PopoverTrigger asChild>
              <Button
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoPopover((v) => !v);
                }}
              >
                <Info className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-64 p-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-lg" 
              side="right" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Created:</span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {formatRelativeTime(note.createdAt)}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Updated:</span>
                  <div className="text-gray-600 dark:text-gray-300">
                    {formatRelativeTime(note.updatedAt)}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {canEdit && (
            <div className="flex space-x-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Popover open={showDeletePopover} onOpenChange={setShowDeletePopover}>
                <PopoverTrigger asChild>
                  <Button
                    aria-label={`Delete Note ${note.id}`}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-64 p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-lg" 
                  side="right" 
                  align="start"
                >
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Delete note</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Are you sure? This action cannot be undone.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeletePopover(false)}
                        className="border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setShowDeletePopover(false);
                          onDelete?.(note.id);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
          {canEdit && onUnarchive && (
            <div className="flex items-center">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnarchive(note.id);
                }}
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded"
                variant="ghost"
                size="icon"
                title="Unarchive note"
              >
                <ArchiveRestore className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex-1 min-h-[120px]">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full min-h-[120px] p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7 text-gray-800 dark:text-gray-200"
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
                {note.content || ""}
              </div>
            )}
          </div>

          {/* Add Item Button */}
          {canEdit && (
            <Button
              variant="ghost"
              onClick={() => {
                if (addingItem && newItemInputRef.current && newItemContent.length === 0) {
                  newItemInputRef.current.focus();
                } else {
                  setAddingItem(true);
                }
              }}
              className={cn(
                "mt-3 justify-start text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors duration-200",
                getHoverBackgroundColor(note.color, resolvedTheme === 'dark')
              )}
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
