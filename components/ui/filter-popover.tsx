"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, User } from "lucide-react";
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
          "flex items-center space-x-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-800 rounded-md bg-card dark:bg-zinc-900 hover:bg-accent dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 focus:border-transparent transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 dark:ring-zinc-600 border-transparent"
        )}
      >
        <Filter className="w-4 h-4 text-muted-foreground dark:text-zinc-400" />
        <span className="text-foreground dark:text-zinc-100">
          Filter
          {getFilterCount() > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
              {getFilterCount()}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground dark:text-zinc-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="fixed sm:absolute left-0 w-full sm:w-80 mt-2 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-gray-200 dark:border-zinc-800 z-50 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground dark:text-zinc-100">Filters</h3>
            </div>

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
