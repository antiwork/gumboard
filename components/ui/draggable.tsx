import React from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext as DndSortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"

interface DraggableInternalContextValue {
  isDragging: (id: UniqueIdentifier) => boolean
}

const DraggableInternalContext = React.createContext<DraggableInternalContextValue | null>(null)

export interface DraggableItem {
  id: UniqueIdentifier
}

export interface DraggableRootProps<T extends DraggableItem> {
  items: T[]
  onItemsChange: (items: T[]) => void
  children: React.ReactNode
}

export function DraggableRoot<T extends DraggableItem>({
  items,
  onItemsChange,
  children,
}: DraggableRootProps<T>) {
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        onItemsChange(arrayMove(items, oldIndex, newIndex))
      }
    }
  }

  const contextValue: DraggableInternalContextValue = {
    isDragging: (id: UniqueIdentifier) => activeId === id,
  }

  return (
    <DraggableInternalContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <DndSortableContext items={items} strategy={verticalListSortingStrategy}>
          {children}
        </DndSortableContext>
      </DndContext>
    </DraggableInternalContext.Provider>
  )
}

export interface DraggableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DraggableContainer({ 
  children, 
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  ...props 
}: DraggableContainerProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

export interface DraggableItemProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string
  children: React.ReactNode
  disabled?: boolean
}

export function DraggableItem({ 
  id, 
  children, 
  disabled = false,
  className,
  ...props 
}: DraggableItemProps) {
  const context = React.useContext(DraggableInternalContext)
  if (!context) {
    throw new Error("DraggableItem must be used within DraggableRoot")
  }

  const {
    active,
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ 
    id,
    disabled,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const combinedClassName = [
    className,
    isDragging && "z-50 scale-100 bg-blue-50 dark:bg-blue-800/20",
    disabled && "opacity-50",
    !disabled && "hover:bg-blue-50 dark:hover:bg-blue-800/20",
    active && active.id !== id && isOver && "opacity-60 bg-blue-600/10",
    // Prevent scrolling on mobile devices
    "touch-none sm:touch-auto"
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={combinedClassName}
      {...(disabled ? {} : { ...attributes, ...listeners })}
      {...props}
    >
      {children}
    </div>
  )
}

export interface DraggableTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function DraggableTrigger({ children, style, ...props }: DraggableTriggerProps) {
  return (
    <div 
      className="contents"
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}
