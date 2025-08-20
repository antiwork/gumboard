"use client";

import * as React from "react";
import { useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Note as NoteCard } from "@/components/note";
import { cn, calculateGridLayout, calculateMobileLayout, convertPositionedNotesToColumns } from "@/lib/utils";
import { useResponsiveLayout } from "@/lib/hooks";
import type { Note, User } from "@/components/note";

interface NotesGridProps {
  notes: Note[];
  currentUser?: User;
  onUpdate?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  onUnarchive?: (noteId: string) => void;
  onCopy?: (note: Note) => void;
  showBoardName?: boolean;
  syncDB?: boolean;
  className?: string;
  gridClassName?: string;
  noteClassName?: string;
  noteStyle?: (note: Note) => React.CSSProperties;
  // Layout variant: 'grid', 'masonry' for demo, 'board-masonry' for board pages with JS masonry
  variant?: "grid" | "masonry" | "board-masonry";
  // Animation settings
  animationDuration?: number;
  staggerChildren?: number;
  // Initial animation for the container
  initialAnimation?: boolean;
}

// Animation variants for container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

// Animation variants for grid items
const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: 0.2 },
      scale: { duration: 0.2 },
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: 0.2 },
  },
};

// Animation variants for masonry items
const masonryItemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      y: { duration: 0.3 },
      opacity: { duration: 0.2 },
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// Memoized components to prevent unnecessary re-renders
const MemoizedNoteCard = memo(NoteCard);

// Create stable animation variants outside component to prevent recreation
const createItemVariants = (isGrid: boolean) => isGrid ? gridItemVariants : masonryItemVariants;

export function NotesGrid({
  notes,
  currentUser,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
  onCopy,
  showBoardName = false,
  syncDB = true,
  className,
  gridClassName,
  noteClassName,
  noteStyle,
  variant = "grid",
  animationDuration = 0.3,
  staggerChildren = 0.03,
  initialAnimation = true,
}: NotesGridProps) {
  const isGrid = variant === "grid";
  const isBoardMasonry = variant === "board-masonry";
  const { isMobile, windowWidth } = useResponsiveLayout();
  
  // Ref to get the actual container element for layout calculations
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Memoize computed values to prevent recalculation on every render
  const itemVariants = useMemo(() => createItemVariants(isGrid), [isGrid]);
  
  // Grid classes for board layout
  const gridClasses = useMemo(() => cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min",
    gridClassName
  ), [gridClassName]);

  // Masonry classes for demo layout (CSS columns) - using working version
  const masonryClasses = useMemo(() => cn("columns-1 gap-4 sm:columns-2", gridClassName), [gridClassName]);

  // Customize container variants with stagger timing - memoized to prevent recreation
  const customContainerVariants = useMemo(() => ({
    ...containerVariants,
    visible: {
      ...containerVariants.visible,
      transition: {
        staggerChildren: staggerChildren,
      },
    },
  }), [staggerChildren]);

  // Use sophisticated layout calculation from lib/utils.ts for board-masonry
  // Always call useMemo to comply with Rules of Hooks, but only use result for board-masonry
  const columns = useMemo(() => {
    if (!isBoardMasonry) return [];
    
    // Use the sophisticated layout functions from lib/utils.ts
    // Pass container element if available for more accurate container width detection
    const positionedNotes = isMobile 
      ? calculateMobileLayout(notes, null, containerRef.current) 
      : calculateGridLayout(notes, null, containerRef.current);
    
    // Memoize the column conversion to avoid recalculation with same input
    return convertPositionedNotesToColumns(positionedNotes);
  }, [isBoardMasonry, notes, isMobile, windowWidth]); // Use windowWidth to trigger recalculation on any resize

  // Memoize container classes to prevent recalculation
  const containerClasses = useMemo(() => isGrid ? gridClasses : masonryClasses, [isGrid, gridClasses, masonryClasses]);
  // For board masonry layout (JavaScript-based), distribute notes into columns
  if (isBoardMasonry) {
    return (
      <div className={className} data-testid="notes-grid">
        <motion.div
          ref={containerRef}
          className={cn("flex gap-4", gridClassName)}
          variants={initialAnimation ? customContainerVariants : undefined}
          initial={initialAnimation ? "hidden" : undefined}
          animate={initialAnimation ? "visible" : undefined}
          data-testid="notes-grid-container"
        >
          {columns.map((columnNotes, columnIndex) => (
            <div key={columnIndex} className="flex-1 flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {columnNotes.map((note: Note & { x: number; y: number; width: number; height: number }) => (
                  <motion.div
                    key={note.id}
                    variants={itemVariants}
                    initial={initialAnimation ? "hidden" : { opacity: 0, scale: 0.8 }}
                    animate={initialAnimation ? "visible" : { opacity: 1, scale: 1 }}
                    exit="exit"
                    layout={"position"}
                    layoutId={note.id}
                    transition={{
                      layout: { duration: animationDuration },
                    }}
                  >
                    <MemoizedNoteCard
                      note={note}
                      currentUser={currentUser}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onArchive={onArchive}
                      onUnarchive={onUnarchive}
                      onCopy={onCopy}
                      readonly={!currentUser}
                      showBoardName={showBoardName}
                      syncDB={syncDB}
                      className={noteClassName}
                      style={noteStyle?.(note)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={className} data-testid="notes-grid">
      <motion.div
        className={containerClasses}
        variants={initialAnimation ? customContainerVariants : undefined}
        initial={initialAnimation ? "hidden" : undefined}
        animate={initialAnimation ? "visible" : undefined}
        layout={isGrid ? true : undefined}
        layoutRoot={!isGrid ? true : undefined}
        data-testid="notes-grid-container"
      >
        <AnimatePresence mode="popLayout">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              className={isGrid ? undefined : "mb-4 break-inside-avoid"}
              variants={itemVariants}
              initial={initialAnimation ? "hidden" : { opacity: 0, scale: 0.8 }}
              animate={initialAnimation ? "visible" : { opacity: 1, scale: 1 }}
              exit="exit"
              layout={"position"}
              layoutId={note.id}
              transition={{
                layout: { duration: animationDuration },
              }}
            >
              <div className={!isGrid ? "pb-4" : undefined}>
                <MemoizedNoteCard
                  note={note}
                  currentUser={currentUser}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onArchive={onArchive}
                  onUnarchive={onUnarchive}
                  onCopy={onCopy}
                  readonly={!currentUser}
                  showBoardName={showBoardName}
                  syncDB={syncDB}
                  className={noteClassName}
                  style={noteStyle?.(note)}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
