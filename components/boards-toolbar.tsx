"use client";

import * as React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type SortOption =
  | "updatedAt|desc"
  | "title|asc"
  | "title|desc"
  | "notesCount|desc"
  | "notesCount|asc";

interface BoardsToolbarProps {
  // Sort props
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;

  // Tag filter props
  selectedTags: string[];
  availableTags: string[];
  onTagsChange: (tags: string[]) => void;

  // Clear filters
  onClearFilters: () => void;

  // Result count
  resultCount: number;
  totalCount: number;

  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updatedAt|desc", label: "Last updated" },
  { value: "title|asc", label: "Alphabetical (A–Z)" },
  { value: "title|desc", label: "Alphabetical (Z–A)" },
  { value: "notesCount|desc", label: "Notes (most)" },
  { value: "notesCount|asc", label: "Notes (least)" },
];

export function BoardsToolbar({
  sortBy,
  onSortChange,
  selectedTags,
  availableTags,
  onTagsChange,
  onClearFilters,
  resultCount,
  totalCount,
  className,
}: BoardsToolbarProps) {
  const [isTagsOpen, setIsTagsOpen] = useState(false);

  const isFiltered = selectedTags.length > 0 || sortBy !== "updatedAt|desc";

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 mb-6", className)}>
      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap dark:text-white">
          Sort by
        </Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] bg-white border-gray-300 text-black dark:bg-zinc-900 dark:border-zinc-700 dark:text-white">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300 text-black dark:bg-zinc-900 dark:border-zinc-700 dark:text-white">
            {SORT_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap dark:text-white">
            Tags
          </Label>
          <Popover open={isTagsOpen} onOpenChange={setIsTagsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-between min-w-[140px] bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600"
                onClick={() => setIsTagsOpen(!isTagsOpen)}
              >
                <span className="truncate">
                  {selectedTags.length === 0
                    ? "All tags"
                    : selectedTags.length === 1
                      ? selectedTags[0]
                      : `${selectedTags.length} selected`}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-3 bg-white border-gray-300 text-black shadow-md dark:bg-zinc-900 dark:border-zinc-700 dark:text-white"
              align="start"
            >
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Select tags to filter by
                </Label>
                <ScrollArea className="h-48">
                  <div className="space-y-2 pr-3">
                    {availableTags.map((tag) => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={() => handleTagToggle(tag)}
                        />
                        <Label
                          htmlFor={`tag-${tag}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {tag}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Selected Tags as Chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20 dark:text-white dark:border-primary/40"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="inline-flex items-center justify-center w-3 h-3 text-primary hover:text-primary/80 dark:text-white dark:hover:text-primary-foreground/80"
              >
                <X className="w-2 h-2" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Result Count and Clear Filters */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap dark:text-white">
          {resultCount === totalCount
            ? `${totalCount} boards`
            : `${resultCount} of ${totalCount} boards`}
        </span>

        {isFiltered && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
