"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { ListFilter, User } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "./button";

const cn = (...classes: (string | undefined | null | false)[]) => {
  return clsx(classes.filter(Boolean));
};
import { DateRangePicker } from "./date-range-picker";

interface FilterPopoverProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;

  selectedAuthor?: string | null;
  authors: Array<{ id: string; name: string; email: string }>;
  onAuthorChange?: (authorId: string | null) => void;

  className?: string;
  disabled?: boolean;
}

function FilterPopover({
  startDate,
  endDate,
  onDateRangeChange,
  selectedAuthor,
  authors,
  onAuthorChange,
  className,
  disabled = false,
}: FilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getFilterCount = () => {
    let count = 0;
    if (startDate || endDate) count++;
    if (selectedAuthor) count++;
    return count;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center text-sm gap-0 rounded-md py-2 cursor-pointer w-full sm:w-auto text-foreground dark:text-zinc-100 transition-colors",
          isOpen ? "bg-zinc-100 dark:bg-zinc-900/50" : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-zinc-600",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ListFilter className="w-4 h-4 mr-1 text-muted-foreground dark:text-zinc-400" />
        <span className="text-foreground dark:text-zinc-100">
          {getFilterCount() > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-400 rounded-md">
              {getFilterCount()}
            </span>
          )}
        </span>
      </Button>

      {isOpen && (
        <div className="fixed sm:absolute left-0 w-full sm:w-80 mt-1 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-100 dark:border-zinc-800 z-50 p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-300">
                Date range
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={onDateRangeChange}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground dark:text-zinc-300">
                Author
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                <Button
                  onClick={() => onAuthorChange?.(null)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent dark:hover:bg-zinc-800 flex items-center space-x-3",
                    !selectedAuthor
                      ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                      : "text-foreground dark:text-zinc-100"
                  )}
                >
                  <User className="w-4 h-4 text-muted-foreground dark:text-zinc-400" />
                  <span className="font-medium">All authors</span>
                </Button>
                {authors.map((author) => (
                  <Button
                    key={author.id}
                    onClick={() => onAuthorChange?.(author.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent dark:hover:bg-zinc-800 flex items-center space-x-3",
                      selectedAuthor === author.id
                        ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                        : "text-foreground dark:text-zinc-100"
                    )}
                  >
                    <div className="w-6 h-6 bg-blue-500 dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-white">
                        {author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{author.name}</div>
                      <div className="text-xs text-muted-foreground dark:text-zinc-400 truncate">
                        {author.email}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { FilterPopover };
