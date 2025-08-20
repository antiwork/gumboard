"use client";

import React from "react";
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
  // Layout variant: 'grid' for board pages, 'masonry' for demo
  variant?: "grid" | "masonry";
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
  const itemVariants = isGrid ? gridItemVariants : masonryItemVariants;

  // Grid classes for board layout
  const gridClasses = cn(
    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 auto-rows-min",
    gridClassName
  );

  // Masonry classes for demo layout
  const masonryClasses = cn("columns-1 gap-4 sm:columns-2", gridClassName);

  const containerClasses = isGrid ? gridClasses : masonryClasses;

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

  return (
    <div className={className}>
      <motion.div
        className={containerClasses}
        variants={initialAnimation ? customContainerVariants : undefined}
        initial={initialAnimation ? "hidden" : undefined}
        animate={initialAnimation ? "visible" : undefined}
        layout={isGrid ? true : undefined}
        layoutRoot={!isGrid ? true : undefined}
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
