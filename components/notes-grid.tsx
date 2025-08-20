"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Note as NoteCard } from "@/components/note";
import { cn } from "@/lib/utils";
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
  // Layout variant: 'grid' for board pages, 'masonry' for demo, 'board-masonry' for board pages with JS masonry
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

// Hook to get fluid responsive column count based on screen size
function useColumnCount() {
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      
      // Fluid responsive calculation based on available width
      // Each column needs minimum ~280px for comfortable note display
      const minColumnWidth = 280;
      const containerPadding = 32; // Account for container padding
      const gapWidth = 16; // Gap between columns
      
      const availableWidth = width - containerPadding;
      let calculatedColumns = Math.floor(availableWidth / (minColumnWidth + gapWidth));
      
      // Ensure minimum 1 column and maximum 6 columns
      calculatedColumns = Math.max(1, Math.min(6, calculatedColumns));
      
      // Fine-tune for better responsive behavior
      if (width < 480) calculatedColumns = 1;        // Very small screens
      else if (width < 768) calculatedColumns = Math.min(2, calculatedColumns);  // Mobile
      else if (width < 1024) calculatedColumns = Math.min(3, calculatedColumns); // Tablet
      
      setColumnCount(calculatedColumns);
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  return columnCount;
}

// Distribute notes into columns based on shortest column
function distributeNotesToColumns(notes: Note[], columnCount: number) {
  // Ensure we have at least 1 column
  const safeColumnCount = Math.max(1, columnCount);
  const columns: Note[][] = Array.from({ length: safeColumnCount }, () => []);
  const columnHeights = Array(safeColumnCount).fill(0);

  // Create a Set to track which notes we've already distributed
  const distributedNoteIds = new Set<string>();

  notes.forEach((note) => {
    // Skip if this note has already been distributed
    if (distributedNoteIds.has(note.id)) {
      return;
    }
    
    // Find the shortest column
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestColumnIndex].push(note);
    distributedNoteIds.add(note.id);
    // Estimate height (this is approximate, real implementation would measure actual heights)
    columnHeights[shortestColumnIndex] += 200; // Base height estimate
  });

  return columns;
}

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
  const columnCount = useColumnCount();
  const itemVariants = isGrid ? gridItemVariants : masonryItemVariants;

  // Grid classes for board layout
  const gridClasses = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min",
    gridClassName
  );

  // Masonry classes for demo layout (CSS columns) - using working version
  const masonryClasses = cn("columns-1 gap-4 sm:columns-2", gridClassName);

  // Customize container variants with stagger timing
  const customContainerVariants = {
    ...containerVariants,
    visible: {
      ...containerVariants.visible,
      transition: {
        staggerChildren: staggerChildren,
      },
    },
  };

  // For board masonry layout (JavaScript-based), distribute notes into columns
  if (isBoardMasonry) {
    // Memoize the column distribution to prevent unnecessary re-calculations
    const columns = useMemo(() => {
      return distributeNotesToColumns(notes, columnCount);
    }, [notes, columnCount]);
    
    return (
      <div className={className} data-testid="notes-grid">
        <motion.div
          className={cn("flex gap-4", gridClassName)}
          variants={initialAnimation ? customContainerVariants : undefined}
          initial={initialAnimation ? "hidden" : undefined}
          animate={initialAnimation ? "visible" : undefined}
          data-testid="notes-grid-container"
        >
          {columns.map((columnNotes, columnIndex) => (
            <div key={columnIndex} className="flex-1 flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {columnNotes.map((note) => (
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
                    <NoteCard
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

  const containerClasses = isGrid ? gridClasses : masonryClasses;

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
                <NoteCard
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
