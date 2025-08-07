"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { ChecklistItem } from "./checklist-item";

interface ChecklistItemData {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

interface ChecklistProps {
  noteId: string;
  boardId: string;
  items: ChecklistItemData[];
  canEdit: boolean;
  editingItemId?: string | null;
  isAddingItem?: boolean;
  newItemContent?: string;
  onItemsUpdate: (items: ChecklistItemData[], noteIsDone: boolean) => void;
  onEditStart: (itemId: string) => void;
  onEditEnd: () => void;
  onNewItemChange: (content: string) => void;
  onAddTaskClick: () => void;
  onCancelAddingItem: () => void;
  onError: (title: string, description: string) => void;
}

export function Checklist({
  noteId,
  boardId,
  items,
  canEdit,
  editingItemId = null,
  isAddingItem = false,
  newItemContent = "",
  onItemsUpdate,
  onEditStart,
  onEditEnd,
  onNewItemChange,
  onAddTaskClick,
  onCancelAddingItem,
  onError,
}: ChecklistProps) {
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const editDebounceMap = useRef(new Map<string, NodeJS.Timeout>());
  const EDIT_DEBOUNCE_DURATION = 1000;

  const handleAddChecklistItem = async () => {
    if (!newItemContent.trim()) return;

    try {
      const newItem: ChecklistItemData = {
        id: `item-${Date.now()}`,
        content: newItemContent,
        checked: false,
        order: items.length,
      };

      const updatedItems = [...items, newItem];
      const allItemsChecked = updatedItems.every((item) => item.checked);

      // Optimistic update
      onItemsUpdate(updatedItems, allItemsChecked);

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: updatedItems,
          done: allItemsChecked,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        onItemsUpdate(note.checklistItems, note.done);
      } else {
        // Revert on error
        onItemsUpdate(items, items.every((item) => item.checked));
        onError("Failed to Add Item", "Failed to add checklist item. Please try again.");
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      onItemsUpdate(items, items.every((item) => item.checked));
      onError("Connection Error", "Failed to add item. Please check your connection.");
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    try {
      // Optimistic update
      const updatedItems = items.map((item) =>
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

      const allItemsChecked = sortedItems.every((item) => item.checked);
      onItemsUpdate(sortedItems, allItemsChecked);

      setAnimatingItems((prev) => new Set([...prev, itemId]));
      setTimeout(() => {
        setAnimatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 200);

      // Send to server in background
      fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: sortedItems,
          done: allItemsChecked,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            console.error("Server error, reverting optimistic update");
            onItemsUpdate(items, items.every((item) => item.checked));
            onError("Update Failed", "Failed to update checklist item. Please try again.");
          } else {
            const { note } = await response.json();
            onItemsUpdate(note.checklistItems, note.done);
          }
        })
        .catch((error) => {
          console.error("Error toggling checklist item:", error);
          onItemsUpdate(items, items.every((item) => item.checked));
          onError("Connection Error", "Failed to sync changes. Please check your connection.");
        });
    } catch (error) {
      console.error("Error toggling checklist item:", error);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      const updatedItems = items.filter((item) => item.id !== itemId);
      const allItemsChecked = updatedItems.length > 0 ? updatedItems.every((item) => item.checked) : false;

      // Optimistic update
      onItemsUpdate(updatedItems, allItemsChecked);

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: updatedItems,
          done: allItemsChecked,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        onItemsUpdate(note.checklistItems, note.done);
      } else {
        console.error("Server error, reverting optimistic update");
        onItemsUpdate(items, items.every((item) => item.checked));
        onError("Failed to Delete Item", "Failed to delete checklist item. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      onItemsUpdate(items, items.every((item) => item.checked));
      onError("Connection Error", "Failed to delete item. Please check your connection.");
    }
  };

  const handleEditChecklistItem = useCallback(async (itemId: string, content: string) => {
    try {
      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, content } : item
      );

      const allItemsChecked = updatedItems.every((item) => item.checked);

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: updatedItems,
          done: allItemsChecked,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        onItemsUpdate(note.checklistItems, note.done);
        onEditEnd();
      }
    } catch (error) {
      console.error("Error editing checklist item:", error);
    }
  }, [items, boardId, noteId, onItemsUpdate, onEditEnd]);

  const debouncedEditChecklistItem = useCallback((itemId: string, content: string) => {
    const key = `${noteId}-${itemId}`;
    
    const existingTimeout = editDebounceMap.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      handleEditChecklistItem(itemId, content);
      editDebounceMap.current.delete(key);
    }, EDIT_DEBOUNCE_DURATION);
    
    editDebounceMap.current.set(key, timeout);
  }, [handleEditChecklistItem, noteId]);


  const handleSplitChecklistItem = async (
    itemId: string,
    content: string,
    cursorPosition: number
  ) => {
    try {
      const firstHalf = content.substring(0, cursorPosition).trim();
      const secondHalf = content.substring(cursorPosition).trim();

      const updatedItems = items.map((item) =>
        item.id === itemId ? { ...item, content: firstHalf } : item
      );

      const currentItem = items.find((item) => item.id === itemId);
      const currentOrder = currentItem?.order || 0;

      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: secondHalf,
        checked: false,
        order: currentOrder + 0.5,
      };

      const allItems = [...updatedItems, newItem].sort((a, b) => a.order - b.order);

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistItems: allItems,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        onItemsUpdate(note.checklistItems, note.done);
        onEditStart(newItem.id);
      }
    } catch (error) {
      console.error("Error splitting checklist item:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="overflow-y-auto space-y-1 flex-1">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            content={item.content}
            checked={item.checked}
            isEditing={editingItemId === item.id}
            canEdit={canEdit}
            onToggle={() => handleToggleChecklistItem(item.id)}
            onDelete={() => handleDeleteChecklistItem(item.id)}
            onEdit={(newContent) => debouncedEditChecklistItem(item.id, newContent)}
            onEditStart={() => onEditStart(item.id)}
            onEditEnd={() => onEditEnd()}
            onSplit={(content, cursorPosition) =>
              handleSplitChecklistItem(item.id, content, cursorPosition)
            }
            isAnimating={animatingItems.has(item.id)}
          />
        ))}

        {isAddingItem && (
          <div className="flex items-center group/item rounded gap-3 transition-all duration-200">
            <Checkbox
              checked={false}
              disabled
              className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
            />
            <Input
              type="text"
              value={newItemContent}
              onChange={(e) => onNewItemChange(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm leading-6 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Add new item..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddChecklistItem();
                }
                if (e.key === "Escape") {
                  onCancelAddingItem();
                }
                if (e.key === "Backspace" && newItemContent.trim() === "") {
                  onCancelAddingItem();
                }
              }}
              onBlur={() => {
                if (newItemContent.trim()) {
                  handleAddChecklistItem();
                } else {
                  onCancelAddingItem();
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
            onAddTaskClick();
          }}
          className="mt-2 justify-start text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-gray-100 text-sm opacity-70 hover:opacity-100"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      )}
    </div>
  );
}