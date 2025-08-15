"use client";

import * as React from "react";
import { useState } from "react";
import { ListFilter, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "./date-range-picker";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface FilterPopoverProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;

  selectedAuthor?: string | null;
  authors: Array<{ id: string; name: string; email: string; image?: string | null }>;
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
  const getFilterCount = () => {
    let count = 0;
    if (startDate || endDate) count++;
    if (selectedAuthor) count++;
    return count;
  };

  const filterCount = getFilterCount();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex items-center text-sm gap-0 rounded-md py-2 cursor-pointer w-full sm:w-auto",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <ListFilter className="w-4 h-4 mr-1 text-muted-foreground" />
            <span className="text-foreground">
              {filterCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-md">
                  {filterCount}
                </span>
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full sm:w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-xs font-medium text-muted-foreground dark:text-zinc-200">
                Date range
              </Label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={onDateRangeChange}
              />
            </div>

            <div className="space-y-2">
              <Label className="block text-xs font-medium text-muted-foreground dark:text-zinc-100">
                Author
              </Label>
              <ScrollArea className="h-auto rounded-md dark:text-zinc-100">
                <div className="space-y-1 p-1">
                  <Button
                    data-slot="all-authors-button"
                    variant="ghost"
                    onClick={() => onAuthorChange?.(null)}
                    className={cn(
                      "w-full justify-start text-left flex items-center space-x-3 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      !selectedAuthor &&
                        "bg-blue-50  hover:bg-blue-50 text-sky-600 dark:text-zinc-200 dark:bg-zinc-800"
                    )}
                  >
                    <User className="w-4 h-4 " />
                    <span className="font-medium">All authors</span>
                  </Button>
                  {authors.map((author) => (
                    <Button
                      key={author.id}
                      variant="ghost"
                      onClick={() => onAuthorChange?.(author.id)}
                      className={cn(
                        "w-full justify-start text-left flex items-center space-x-3 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        selectedAuthor === author.id &&
                          "bg-blue-50 dark:bg-zinc-800 hover:bg-blue-50 text-blue-600 dark:text-zinc-200"
                      )}
                    >
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={author.image || ""} />
                        <AvatarFallback>
                          <div className="w-6 h-6 bg-sky-600 text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-white">
                              {author.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{author.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{author.email}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { FilterPopover };
