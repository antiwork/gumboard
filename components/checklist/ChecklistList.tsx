"use client";

import * as React from "react";
import { DndContext, closestCenter, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import SortableChecklistItem from "./SortableChecklistItem";
import type { ChecklistItem } from "@/lib/checklist";

export interface ChecklistListProps {
  noteId: string;
  items: ChecklistItem[];
  canEdit: boolean;
  animatingItems: Set<string>;
  editingChecklistItem: { noteId: string; itemId: string } | null;
  editingChecklistItemContent: string;
  setEditingChecklistItem: React.Dispatch<
    React.SetStateAction<{ noteId: string; itemId: string } | null>
  >;
  setEditingChecklistItemContent: React.Dispatch<React.SetStateAction<string>>;
  debouncedEditChecklistItem: (
    noteId: string,
    itemId: string,
    content: string
  ) => void;
  handleEditChecklistItem: (
    noteId: string,
    itemId: string,
    content: string
  ) => Promise<void>;
  handleSplitChecklistItem: (
    noteId: string,
    itemId: string,
    content: string,
    cursorPosition: number
  ) => Promise<void>;
  handleDeleteChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  handleToggleChecklistItem: (noteId: string, itemId: string) => Promise<void>;
  onReorder: (activeId: string, overId: string) => void;
  cancelPendingEdit: (noteId: string, itemId: string) => void;
}

export function ChecklistList(props: ChecklistListProps) {
  const {
    noteId,
    items,
    canEdit,
    animatingItems,
    editingChecklistItem,
    editingChecklistItemContent,
    setEditingChecklistItem,
    setEditingChecklistItemContent,
    debouncedEditChecklistItem,
    handleEditChecklistItem,
    handleSplitChecklistItem,
    handleDeleteChecklistItem,
    handleToggleChecklistItem,
    onReorder,
    cancelPendingEdit,
  } = props;

  const sensors = useSensors(
    // Instant drag on mouse for a snappier feel
    useSensor(MouseSensor, { activationConstraint: { distance: 0 } }),
    // Small delay + tolerance on touch to avoid accidental drags while tapping/scrolling
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableChecklistItem
            key={item.id}
            noteId={noteId}
            note={{ checklistItems: items }}
            item={item}
            canEdit={canEdit}
            animating={animatingItems.has(item.id)}
            editingChecklistItem={editingChecklistItem}
            editingChecklistItemContent={editingChecklistItemContent}
            setEditingChecklistItem={setEditingChecklistItem}
            setEditingChecklistItemContent={setEditingChecklistItemContent}
            debouncedEditChecklistItem={debouncedEditChecklistItem}
            handleEditChecklistItem={handleEditChecklistItem}
            handleSplitChecklistItem={handleSplitChecklistItem}
            handleDeleteChecklistItem={handleDeleteChecklistItem}
            handleToggleChecklistItem={handleToggleChecklistItem}
            cancelPendingEdit={cancelPendingEdit}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

export default ChecklistList;


