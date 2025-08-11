"use client";

import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/ui/beta-badge";
import Link from "next/link";
import {
  Plus,
  Search,
  ChevronDown,
  Pencil,
  Settings,
} from "lucide-react";
import { ProfileDropdown } from "@/components/profile-dropdown";
import type { User, Board } from "@/components/note";
import { FilterPopover } from "@/components/ui/filter-popover";

interface NavbarProps {
  user: User | null;
  onAddBoard?: () => void;
  showAddBoard?: boolean;
  showFilterPopover?: boolean;
  showSearchBar?: boolean;
  showBoardSelector?: boolean;
  showAddNote?: boolean;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  setDebouncedSearchTerm?: (term: string) => void;
  updateURL?: (searchTerm?: string, dateRange?: { startDate: Date | null; endDate: Date | null }, authorId?: string | null) => void;
  dateRange?: {
    startDate: Date | null;
    endDate: Date | null;
  };
  setDateRange?: (range: { startDate: Date | null; endDate: Date | null }) => void;
  selectedAuthor?: string | null;
  setSelectedAuthor?: (authorId: string | null) => void;
  uniqueAuthors?: Array<{ id: string; name: string; email: string }>;
  board?: Board | null;
  boardId?: string | null;
  allBoards?: Board[];
  showBoardDropdown?: boolean;
  setShowBoardDropdown?: (show: boolean) => void;
  showAddBoardModal?: boolean;
  setShowAddBoardModal?: (show: boolean) => void;
  boardSettings?: { sendSlackUpdates: boolean };
  setBoardSettings?: (settings: { sendSlackUpdates: boolean }) => void;
  setBoardSettingsDialog?: (show: boolean) => void;
  onAddNote?: (targetBoardId?: string) => void;
}

export function Navbar({ 
  user, 
  onAddBoard, 
  showAddBoard = true,
  showFilterPopover = false,
  showSearchBar = false,
  showBoardSelector = false,
  showAddNote = false,
  searchTerm = "",
  setSearchTerm,
  setDebouncedSearchTerm,
  updateURL,
  dateRange = { startDate: null, endDate: null },
  setDateRange,
  selectedAuthor,
  setSelectedAuthor,
  uniqueAuthors = [],
  board,
  boardId,
  allBoards = [],
  showBoardDropdown = false,
  setShowBoardDropdown,
  setShowAddBoardModal,
  setBoardSettings,
  setBoardSettingsDialog,
  onAddNote
}: NavbarProps) {

  return (
    <nav className="bg-card dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
      <div className="flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Link href="/dashboard">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                Gumboard
                <BetaBadge />
              </h1>
            </Link>
          </div>
          
          {/* Board Selector Dropdown */}
          {showBoardSelector && (
            <div className="relative board-dropdown flex-1 sm:flex-none">
              <Button
                onClick={() => setShowBoardDropdown?.(!showBoardDropdown)}
                className="flex items-center justify-between border border-gray-200 dark:border-zinc-800 space-x-2 text-foreground dark:text-zinc-100 hover:text-foreground dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 rounded-md px-3 py-2 cursor-pointer w-full sm:w-auto"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground dark:text-zinc-100">
                    {boardId === "all-notes"
                      ? "All notes"
                      : boardId === "archive"
                        ? "Archive"
                        : board?.name}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground dark:text-zinc-400 transition-transform ${
                    showBoardDropdown ? "rotate-180" : ""
                  }`}
                />
              </Button>

              {showBoardDropdown && (
                <div className="fixed sm:absolute left-0 mt-2 w-full sm:w-64 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-gray-200 dark:border-zinc-800 z-50 max-h-80 overflow-y-auto">
                  <div className="py-1">
                    {/* All Notes Option */}
                    <Link
                      href="/boards/all-notes"
                      className={`block px-4 py-2 text-sm hover:bg-accent dark:hover:bg-zinc-800 ${
                        boardId === "all-notes"
                          ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                          : "text-foreground dark:text-zinc-100"
                      }`}
                      onClick={() => setShowBoardDropdown?.(false)}
                    >
                      <div className="font-medium">All notes</div>
                      <div className="text-xs text-muted-foreground dark:text-zinc-400 mt-1">
                        Notes from all boards
                      </div>
                    </Link>

                    {/* Archive Option */}
                    <Link
                      href="/boards/archive"
                      className={`block px-4 py-2 text-sm hover:bg-accent dark:hover:bg-zinc-800 ${
                        boardId === "archive"
                          ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                          : "text-foreground dark:text-zinc-100"
                      }`}
                      onClick={() => setShowBoardDropdown?.(false)}
                    >
                      <div className="font-medium">Archive</div>
                      <div className="text-xs text-muted-foreground dark:text-zinc-400 mt-1">
                        Archived notes from all boards
                      </div>
                    </Link>

                    {allBoards.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-zinc-800 my-1"></div>
                    )}
                    {allBoards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/boards/${b.id}`}
                        className={`block px-4 py-2 text-sm hover:bg-accent dark:hover:bg-zinc-800 ${
                          b.id === boardId
                            ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                            : "text-foreground dark:text-zinc-100"
                        }`}
                        onClick={() => setShowBoardDropdown?.(false)}
                      >
                        <div className="font-medium">{b.name}</div>
                        {b.description && (
                          <div className="text-xs text-muted-foreground dark:text-zinc-400 mt-1">
                            {b.description}
                          </div>
                        )}
                      </Link>
                    ))}
                    {allBoards.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-zinc-800 my-1"></div>
                    )}
                    <Button
                      onClick={() => {
                        setShowAddBoardModal?.(true);
                        setShowBoardDropdown?.(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="font-medium">Create new board</span>
                    </Button>
                    {boardId !== "all-notes" && boardId !== "archive" && (
                      <Button
                        onClick={() => {
                          setBoardSettings?.({
                            sendSlackUpdates:
                              (board as { sendSlackUpdates?: boolean })
                                ?.sendSlackUpdates ?? true,
                          });
                          setBoardSettingsDialog?.(true);
                          setShowBoardDropdown?.(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="font-medium">Board settings</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {showFilterPopover && (
            <div className="relative board-dropdown flex-1 sm:flex-none">
              <FilterPopover
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onDateRangeChange={(startDate, endDate) => {
                  const newDateRange = { startDate, endDate };
                  setDateRange?.(newDateRange);
                  updateURL?.(undefined, newDateRange);
                }}
                selectedAuthor={selectedAuthor}
                authors={uniqueAuthors}
                onAuthorChange={(authorId) => {
                  setSelectedAuthor?.(authorId);
                  updateURL?.(undefined, undefined, authorId);
                }}
                className="min-w-fit"
              />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {showSearchBar && (
            <div className="relative flex-1 sm:flex-none min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
              </div>
              <input
                aria-label="Search notes"
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm?.(e.target.value);
                }}
                className="w-full sm:w-64 pl-10 pr-8 py-2 border border-gray-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
              />
              {searchTerm && (
                <Button
                  onClick={() => {
                    setSearchTerm?.("");
                    setDebouncedSearchTerm?.("");
                    updateURL?.("");
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-100 cursor-pointer"
                >
                  ×
                </Button>
              )}
            </div> 
          )}
          {showAddNote && onAddNote && (
            <Button
              onClick={() => {
                if (boardId === "all-notes" && allBoards.length > 0) {
                  onAddNote(allBoards[0].id);
                } else {
                  onAddNote();
                }
              }}
              className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer font-medium"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {showAddBoard && onAddBoard && (
            <Button
              onClick={onAddBoard}
              className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium px-3 sm:px-4 py-2 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Board</span>
            </Button>
          )}
          <ProfileDropdown user={user} />
        </div>
      </div>
    </nav>
  );
}