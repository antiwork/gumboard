import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Note as NoteCard } from "@/components/note";
import { getResponsiveConfig } from "@/lib/utils";
import type { Note } from "@/components/note";
import type { User } from "@/types/types";

interface Author {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface BoardNotesDisplayProps {
  layoutNotes: (Note & { x: number; y: number; width: number; height: number })[];
  filteredNotes: Note[];
  boardHeight: string;

  // Search/filter state for empty state
  searchTerm: string;
  selectedAuthor: string | null;
  dateRange: DateRange;
  uniqueAuthors: Author[];
  onClearFilters?: () => void;

  // Note interaction props
  isReadonly?: boolean;
  currentUser?: User;
  onUpdate?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
  onArchive?: (noteId: string) => void;
  onUnarchive?: (noteId: string) => void;
  onCopy?: (note: Note) => void;
  showBoardName?: boolean;

  // Theme
  resolvedTheme?: string;

  // Style customization
  containerClassName?: string;
  noteClassName?: string;
  isPrivateBoard?: boolean;
}

export function BoardNotesDisplay({
  layoutNotes,
  filteredNotes,
  boardHeight,
  searchTerm,
  selectedAuthor,
  dateRange,
  uniqueAuthors,
  onClearFilters,
  isReadonly = false,
  currentUser,
  onUpdate,
  onDelete,
  onArchive,
  onUnarchive,
  onCopy,
  showBoardName = false,
  resolvedTheme,
  containerClassName = "",
  noteClassName = "shadow-md shadow-black/10",
  isPrivateBoard = false,
}: BoardNotesDisplayProps) {
  const hasFilters = searchTerm || selectedAuthor || dateRange.startDate || dateRange.endDate;
  const showEmptyState = filteredNotes.length === 0;
  const showFilteredEmptyState = showEmptyState && hasFilters;

  const wrapperClassName = isPrivateBoard
    ? `relative w-full ${containerClassName}`
    : `relative ${containerClassName}`;

  const wrapperStyle = isPrivateBoard
    ? {
        height: boardHeight,
        minHeight: "calc(100vh - 64px)", // Account for header height
      }
    : { height: boardHeight };

  return (
    <div className={wrapperClassName} style={wrapperStyle}>
      {/* Notes */}
      <div className="relative w-full h-full">
        {layoutNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note as Note}
            readonly={isReadonly}
            currentUser={currentUser}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            onCopy={onCopy}
            showBoardName={showBoardName}
            className={`${noteClassName} absolute`}
            style={{
              position: "absolute",
              left: note.x,
              top: note.y,
              width: note.width,
              height: note.height,
              padding: `${getResponsiveConfig().notePadding}px`,
              backgroundColor: resolvedTheme === "dark" ? "#18181B" : note.color,
            }}
          />
        ))}
      </div>

      {/* Empty State */}
      {showEmptyState && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {showFilteredEmptyState ? (
              <>
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-gray-500 dark:text-gray-400">
                  <Search className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-500" />
                  <div className="text-xl mb-2">No notes found</div>
                  <div className="text-sm mb-4 text-center">
                    No notes match your current filters
                    {searchTerm && <div>Search: &quot;{searchTerm}&quot;</div>}
                    {selectedAuthor && (
                      <div>
                        Author:{" "}
                        {uniqueAuthors.find((a) => a.id === selectedAuthor)?.name || "Unknown"}
                      </div>
                    )}
                    {(dateRange.startDate || dateRange.endDate) && (
                      <div>
                        Date range:{" "}
                        {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : "..."} -{" "}
                        {dateRange.endDate ? dateRange.endDate.toLocaleDateString() : "..."}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      onClearFilters?.();
                    }}
                    variant="outline"
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <span>Clear All Filters</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No notes found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  This board doesn&apos;t have any notes yet.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
