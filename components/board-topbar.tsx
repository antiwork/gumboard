"use client";


import { Button } from "@/components/ui/button";
import { ChevronDown, Search, X, ChevronUp, EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { BetaBadge } from "@/components/ui/beta-badge";
import { FilterPopover } from "@/components/ui/filter-popover";
import { ProfileDropdown } from "@/components/profile-dropdown";
import type { Board, User } from "@/components/note";

interface BoardTopbarProps {
  boardId: string | null;
  board: Board | null;
  allBoards?: Board[];
  user: User | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setDebouncedSearchTerm?: (term: string) => void;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  setDateRange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  selectedAuthor: string | null;
  setSelectedAuthor: (author: string | null) => void;
  uniqueAuthors: { id: string; name: string; email: string; image?: string | null }[];
  updateURL?: (
    newSearchTerm?: string,
    newDateRange?: { startDate: Date | null; endDate: Date | null },
    newAuthor?: string | null
  ) => void;
  handleAddNote?: (targetBoardId?: string) => void;
  setShowBoardDropdown?: (show: boolean) => void;
  setShowAddBoard?: (show: boolean) => void;
  setBoardSettings?: (settings: {
    name: string;
    description: string;
    isPublic: boolean;
    sendSlackUpdates: boolean;
  }) => void;
  setBoardSettingsDialog?: (show: boolean) => void;
  showBoardDropdown?: boolean;
  isPublic?: boolean;
}

export function BoardTopbar({
  boardId,
  board,
  allBoards = [],
  user,
  searchTerm,
  setSearchTerm,
  setDebouncedSearchTerm,
  dateRange,
  setDateRange,
  selectedAuthor,
  setSelectedAuthor,
  uniqueAuthors,
  updateURL,
  handleAddNote,
  setShowBoardDropdown,
  setShowAddBoard,
  setBoardSettings,
  setBoardSettingsDialog,
  showBoardDropdown = false,
  isPublic = false,
}: BoardTopbarProps) {

  return (
    <div className="mx-0.5 sm:mx-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center h-auto sm:h-16 p-2 sm:p-0">
      <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 sm:w-fit grid grid-cols-[1fr_auto] sm:grid-cols-[auto_auto_1fr_auto_auto] gap-2 items-center auto-rows-auto grid-flow-dense">
        {/* Company Name */}
        <Link href="/dashboard" className="flex-shrink-0 pl-1">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            Gumboard
            <BetaBadge />
          </h1>
        </Link>
        <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700 hidden sm:block" />
        {/* Board Selector Dropdown */}
        <div className="relative board-dropdown min-w-32 sm:max-w-64 col-span-2 sm:col-span-1">
          <Button
            variant="ghost"
            onClick={() => setShowBoardDropdown?.(!showBoardDropdown)}
            className="flex items-center justify-between px-2 py-2 w-full"
          >
            <div className={`min-w-0 ${isPublic ? 'flex items-center space-x-2' : '' }`}>
              <div className="text-sm font-semibold text-foreground dark:text-zinc-100 truncate">
                {boardId === "all-notes"
                  ? "All notes"
                  : boardId === "archive"
                    ? "Archive"
                    : board?.name}
              </div>
                {isPublic && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Public
                </span>}
            </div>
            {!isPublic && (
              showBoardDropdown ? (
                <ChevronUp
                  className="w-4 h-4 text-muted-foreground dark:text-zinc-400 transition-transform"
                />
              ) : (
                <ChevronDown
                  className="w-4 h-4 text-muted-foreground dark:text-zinc-400 transition-transform"
                />
              )
            )}
          </Button>

          {showBoardDropdown && (
            <div className="fixed sm:absolute left-0 mt-1 w-full sm:w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-100 dark:border-zinc-800 z-50 max-h-80 overflow-y-auto">
              <div className="p-2 flex flex-col gap-1">
                {/* Boards */}
                {allBoards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/boards/${b.id}`}
                    className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white ${
                      b.id === boardId
                        ? "bg-sky-50 dark:bg-sky-600 text-foreground dark:text-zinc-100 font-semibold"
                        : "text-foreground dark:text-zinc-100"
                    }`}
                    onClick={() => setShowBoardDropdown?.(false)}
                  >
                    <div>{b.name}</div>
                  </Link>
                ))}

                {allBoards.length > 0 && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                )}

                {/* All Notes Option */}
                <Link
                  href="/boards/all-notes"
                  className={`rounded-lg font-medium block px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    boardId === "all-notes"
                      ? "bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold"
                      : "text-foreground dark:text-white"
                  }`}
                  onClick={() => setShowBoardDropdown?.(false)}
                >
                  <div>All notes</div>
                </Link>

                {/* Archive Option */}
                <Link
                  href="/boards/archive"
                  className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    boardId === "archive"
                      ? "bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold"
                      : "text-foreground dark:text-white"
                  }`}
                  onClick={() => setShowBoardDropdown?.(false)}
                >
                  <div>All archived</div>
                </Link>
                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddBoard?.(true);
                    setShowBoardDropdown?.(false);
                  }}
                  className="flex items-center w-full px-4 py-2"
                >
                  <span className="font-medium">Create new board</span>
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700 hidden sm:block" />

        {/* Filter Popover */}
        <div className="flex flex-nowrap space-x-1">
          <div className="relative board-dropdown" data-slot="filter-popover">
            <FilterPopover
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onDateRangeChange={(startDate, endDate) => {
                const newDateRange = { startDate, endDate };
                setDateRange(newDateRange);
                updateURL?.(undefined, newDateRange);
              }}
              selectedAuthor={selectedAuthor}
              authors={uniqueAuthors}
              onAuthorChange={(authorId) => {
                setSelectedAuthor(authorId);
                updateURL?.(undefined, undefined, authorId);
              }}
              className="h-9"
            />
          </div>
          {!isPublic && boardId !== "all-notes" && boardId !== "archive" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBoardSettings?.({
                  name: board?.name || "",
                  description: board?.description || "",
                  isPublic: (board as { isPublic?: boolean })?.isPublic ?? false,
                  sendSlackUpdates:
                    (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true,
                });
                setBoardSettingsDialog?.(true);
              }}
              aria-label="Board settings"
              title="Board settings"
              className="flex items-center size-9"
            >
              <EllipsisVertical className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Right side - Search, Add Note and User dropdown */}
      <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 grid grid-cols-[1fr_auto] sm:grid-cols-[auto_auto_auto] gap-2 items-center auto-rows-auto grid-flow-dense">
        {/* Search Box */}
        <div className="relative h-9">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
          </div>
          <input
            aria-label="Search notes"
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full pl-10 pr-8 py-2 border border-zinc-100 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 dark:focus:ring-sky-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
          />
          {searchTerm && (
            <Button
              onClick={() => {
                setSearchTerm("");
                setDebouncedSearchTerm?.("");
                updateURL?.("");
              }}
              className="absolute top-[5px] right-1 size-7 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-white dark:hover:text-zinc-100 cursor-pointer bg-transparent"
            >
              <X className="h-4 w-4 " />
            </Button>
          )}
        </div>
        
        {!isPublic && 
        <Button
            onClick={() => {
              if (boardId === "all-notes" && allBoards.length > 0) {
                handleAddNote?.(allBoards[0].id);
              } else {
                handleAddNote?.();
              }
            }}
          disabled={boardId === "archive"}
        >
          <span>Add note</span>
        </Button>
        }

        {/* User Dropdown */}
        {user ? (
              <ProfileDropdown user={user} />
            ) : (
              <Link href="/auth/signin">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
      </div>
    </div>
  );
}
