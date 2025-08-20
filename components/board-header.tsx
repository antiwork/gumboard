import React from "react";
import Link from "next/link";
import { Search, X, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetaBadge } from "@/components/ui/beta-badge";
import { FilterPopover } from "@/components/ui/filter-popover";
import { ProfileDropdown } from "@/components/profile-dropdown";
import type { Board } from "@/components/note";
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

interface BoardHeaderProps {
  board: Board | null;
  isPublicView?: boolean;
  user?: User | null;

  // Search props
  searchTerm: string;
  onSearchChange: (term: string) => void;

  // Filter props
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  selectedAuthor: string | null;
  authors: Author[];
  onAuthorChange: (authorId: string | null) => void;

  // Private board specific props
  showSettings?: boolean;
  onSettingsClick?: () => void;
  boardId?: string | null;

  // For private boards - board dropdown
  allBoards?: Board[];
  showBoardDropdown?: boolean;
  onBoardDropdownToggle?: () => void;
  showAddBoard?: boolean;
  onAddBoardClick?: () => void;
  onAddNoteClick?: () => void;
}

export function BoardHeader({
  board,
  isPublicView = false,
  user,
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  selectedAuthor,
  authors,
  onAuthorChange,
  showSettings = false,
  onSettingsClick,
  boardId,
  allBoards = [],
  showBoardDropdown = false,
  onBoardDropdownToggle,
  onAddBoardClick,
  onAddNoteClick,
}: BoardHeaderProps) {
  if (isPublicView) {
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

          {/* Board Name - Static for public boards */}
          <div className="flex items-center space-x-2">
            <div className="text-sm font-semibold text-foreground dark:text-zinc-100">
              {board?.name}
            </div>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Public
            </span>
          </div>

          <div className="hidden md:block">
            <FilterPopover
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onDateRangeChange={(startDate, endDate) => {
                onDateRangeChange({ startDate, endDate });
              }}
              selectedAuthor={selectedAuthor}
              authors={authors}
              onAuthorChange={onAuthorChange}
              className="min-w-fit"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 grid grid-cols-[1fr_auto] sm:grid-cols-[auto_auto] gap-2 items-center auto-rows-auto grid-flow-dense">
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
            />
          </div>

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

  // Private board header with full layout
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
            onClick={onBoardDropdownToggle}
            className="flex items-center justify-between px-2 py-2 w-full"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground dark:text-zinc-100 truncate">
                {boardId === "all-notes"
                  ? "All notes"
                  : boardId === "archive"
                    ? "Archive"
                    : board?.name}
              </div>
            </div>
            <EllipsisVertical className="w-4 h-4 text-muted-foreground dark:text-zinc-400" />
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
                >
                  <div>All archived</div>
                </Link>
                <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddBoardClick}
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
                onDateRangeChange({ startDate, endDate });
              }}
              selectedAuthor={selectedAuthor}
              authors={authors}
              onAuthorChange={onAuthorChange}
              className="h-9"
            />
          </div>
          {boardId !== "all-notes" && boardId !== "archive" && showSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSettingsClick}
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border border-zinc-100 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 dark:focus:ring-sky-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
          />
          {searchTerm && (
            <Button
              onClick={() => onSearchChange("")}
              className="absolute top-[5px] right-1 size-7 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-white dark:hover:text-zinc-100 cursor-pointer bg-transparent"
            >
              <X className="h-4 w-4 " />
            </Button>
          )}
        </div>

        <Button onClick={onAddNoteClick} disabled={boardId === "archive"}>
          <span>Add note</span>
        </Button>

        {/* User Dropdown */}
        <ProfileDropdown user={user} />
      </div>
    </div>
  );
}
