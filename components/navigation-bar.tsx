"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BetaBadge } from "@/components/ui/beta-badge";
import { FilterPopover } from "@/components/ui/filter-popover";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Plus, ChevronDown, Settings, Search, X } from "lucide-react";
import type { User } from "@/components/note";

export interface Board {
  id: string;
  name: string;
  description?: string | null;
}

export interface Author {
  id: string;
  name: string;
  email: string;
}

export interface ActionButton {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary";
  className?: string;
  hideOnMobile?: boolean;
}

export interface BoardSelectorProps {
  currentBoardId?: string;
  currentBoard?: Board | null;
  boards?: Board[];
  showAllNotes?: boolean;
  showArchive?: boolean;
  onBoardChange?: (boardId: string) => void;
}

export interface SearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

export interface FilterProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
  selectedAuthor?: string | null;
  authors?: Author[];
  onAuthorChange?: (authorId: string | null) => void;
}

export type NavigationVariant = "dashboard" | "board" | "public-board" | "settings" | "simple";

export interface NavigationBarProps {
  variant: NavigationVariant;
  user?: User | null;
  logoHref?: string;
  logoText?: string;
  showBetaBadge?: boolean;
  boardSelector?: BoardSelectorProps;
  search?: SearchProps;
  filter?: FilterProps;
  actionButtons?: ActionButton[];
  showSettingsButton?: boolean;
  settingsHref?: string;
  showPublicBadge?: boolean;
  additionalContent?: React.ReactNode;
  className?: string;
}

function NavLogo({ href, text, showBeta = true }: { href: string; text: string; showBeta?: boolean }) {
  return (
    <Link href={href} className="flex-shrink-0 pl-2">
      <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
        {text}
        {showBeta && <BetaBadge />}
      </h1>
    </Link>
  );
}

function NavSearch({ searchTerm, onSearchChange, placeholder = "Search..." }: SearchProps & { onClear?: () => void }) {
  return (
    <div className="relative flex-1 sm:flex-none min-w-[150px]">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
      </div>
      <input
        aria-label="Search notes"
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full sm:w-64 pl-10 pr-8 py-2 border border-gray-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
      />
      {searchTerm && (
        <Button
          onClick={() => onSearchChange("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-100 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function BoardSelector({ currentBoardId = '', currentBoard, boards = [], showAllNotes = true, showArchive = true, onBoardChange }: BoardSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.board-dropdown')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  const handleBoardSelect = (boardId: string) => {
    setShowDropdown(false);
    if (onBoardChange) {
      onBoardChange(boardId);
    } else {
      router.push(`/boards/${boardId}`);
    }
  };

  const getCurrentBoardName = () => {
    if (currentBoardId === "all-notes") return "All notes";
    if (currentBoardId === "archive") return "Archive";
    return currentBoard?.name || "";
  };

  return (
    <div className="relative board-dropdown flex-1 sm:flex-none">
      <Button
        onClick={() => setShowDropdown(!showDropdown)}
        variant="outline"
        className="flex items-center justify-between space-x-2 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-300 dark:border-zinc-700 w-full sm:w-auto"
      >
        <span className="text-sm font-medium">{getCurrentBoardName()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
      </Button>

      {showDropdown && (
        <div className="fixed sm:absolute left-0 mt-1 w-full sm:w-64 bg-white dark:bg-zinc-900 rounded border border-gray-300 dark:border-zinc-700 z-50 max-h-80 overflow-y-auto">
          <div className="py-1">
            {showAllNotes && (
              <button
                onClick={() => handleBoardSelect("all-notes")}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                  currentBoardId === "all-notes"
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                All notes
              </button>
            )}

            {showArchive && (
              <button
                onClick={() => handleBoardSelect("archive")}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                  currentBoardId === "archive"
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                Archive
              </button>
            )}

            {(showAllNotes || showArchive) && boards.length > 0 && (
              <div className="border-t border-gray-300 dark:border-zinc-700 my-1"></div>
            )}

            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleBoardSelect(board.id)}
                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                  currentBoardId === board.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {board.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function NavigationBar({
  variant,
  user,
  logoHref = "/dashboard",
  logoText = "Gumboard",
  showBetaBadge = true,
  boardSelector,
  search,
  filter,
  actionButtons = [],
  showSettingsButton = false,
  settingsHref,
  showPublicBadge = false,
  additionalContent,
  className = "",
}: NavigationBarProps) {
  const isFlexWrap = variant === "board";

  return (
    <nav className={`bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 ${className}`}>
      <div className={`flex ${isFlexWrap ? 'flex-wrap sm:flex-nowrap' : ''} justify-between items-center ${isFlexWrap ? 'h-auto sm:h-18 p-2 sm:p-0' : 'h-18 px-4 sm:px-6 lg:px-8'}`}>
        <div className={`flex ${isFlexWrap ? 'flex-wrap sm:flex-nowrap' : ''} items-center gap-2 sm:space-x-4 ${isFlexWrap ? 'w-full sm:w-auto' : ''}`}>
          <NavLogo href={logoHref} text={logoText} showBeta={showBetaBadge} />
          
          {variant === "public-board" && boardSelector?.currentBoard && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {boardSelector.currentBoard.name}
              </span>
              {showPublicBadge && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Public
                </span>
              )}
            </div>
          )}
          
          {variant === "board" && boardSelector && <BoardSelector {...boardSelector} />}
          
          {filter && (
            <div className="hidden md:block">
              <FilterPopover
                startDate={filter.startDate}
                endDate={filter.endDate}
                onDateRangeChange={filter.onDateRangeChange}
                selectedAuthor={filter.selectedAuthor}
                authors={filter.authors || []}
                onAuthorChange={filter.onAuthorChange}
                className="min-w-fit"
              />
            </div>
          )}
          
          {additionalContent}
        </div>

        <div className="flex items-center space-x-3 pr-2">
          {search && <NavSearch {...search} />}
          
          <div className="flex items-center space-x-3">
            {actionButtons.map((button, index) => (
              <Button
                key={index}
                onClick={button.onClick}
                variant={button.variant === "primary" ? "default" : "outline"}
                size="sm"
                className={`flex items-center space-x-2 py-4.5 ${
                  button.variant === "primary" 
                    ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    : "border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-zinc-800"
                } ${button.hideOnMobile ? "hidden sm:flex" : ""} ${button.className || ""}`}
              >
                {button.icon}
                <span className={button.hideOnMobile ? "hidden sm:inline" : ""}>{button.label}</span>
              </Button>
            ))}
            
            {showSettingsButton && (
              <Button asChild variant="outline" size="sm" className="border-gray-300 dark:border-zinc-700">
                <Link href={settingsHref || `/settings`} className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </Button>
            )}
          </div>
          
          {user && <ProfileDropdown user={user} />}
        </div>
      </div>
    </nav>
  );
}