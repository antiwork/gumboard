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

interface ChecklistContainerProps {
  noteId: string;
  boardId: string;
  items: ChecklistItemData[];
  canEdit: boolean;
  onItemsUpdate: (items: ChecklistItemData[], noteIsDone: boolean) => void;
  onContentEdit?: () => void;
}

export function ChecklistContainer({
  noteId,
  boardId,
  items,
  canEdit,
  onItemsUpdate,
  onContentEdit,
}: ChecklistContainerProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemContent, setNewItemContent] = useState("");
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
      setNewItemContent("");
      setIsAddingItem(false);

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
        setIsAddingItem(true);
        setNewItemContent(newItem.content);
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      onItemsUpdate(items, items.every((item) => item.checked));
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
          } else {
            const { note } = await response.json();
            onItemsUpdate(note.checklistItems, note.done);
          }
        })
        .catch((error) => {
          console.error("Error toggling checklist item:", error);
          onItemsUpdate(items, items.every((item) => item.checked));
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
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      onItemsUpdate(items, items.every((item) => item.checked));
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
        setEditingItemId(null);
      }
    } catch (error) {
      console.error("Error editing checklist item:", error);
    }
  }, [items, boardId, noteId, onItemsUpdate]);

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
        setEditingItemId(newItem.id);
      }
    } catch (error) {
      console.error("Error splitting checklist item:", error);
    }
  };

  // If there are no items and we can edit, show the content edit option
  if (items.length === 0 && canEdit && !isAddingItem) {
    return (
      <div className="flex-1 flex flex-col">
        <div 
          className="flex-1 p-2 text-gray-500 dark:text-gray-400 cursor-text"
          onClick={() => onContentEdit?.()}
        >
          Click to add content...
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingItem(true);
          }}
          className="mt-2 justify-start text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-gray-100 text-sm opacity-70 hover:opacity-100"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      </div>
    );
  }

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
            onEditStart={() => setEditingItemId(item.id)}
            onEditEnd={() => setEditingItemId(null)}
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
              onChange={(e) => setNewItemContent(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm leading-6 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Add new item..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddChecklistItem();
                }
                if (e.key === "Escape") {
                  setIsAddingItem(false);
                  setNewItemContent("");
                }
                if (e.key === "Backspace" && newItemContent.trim() === "") {
                  setIsAddingItem(false);
                  setNewItemContent("");
                }
              }}
              onBlur={() => {
                if (newItemContent.trim()) {
                  handleAddChecklistItem();
                } else {
                  setIsAddingItem(false);
                  setNewItemContent("");
                }
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {canEdit && !isAddingItem && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingItem(true);
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