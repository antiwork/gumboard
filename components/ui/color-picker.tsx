"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  className?: string;
}

const predefinedColors = [
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1", // Indigo
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#a855f7", // Purple
  "#64748b", // Slate
  "#374151", // Gray
  "#1f2937", // Dark Gray
  "#000000", // Black
];

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          data-testid="color-picker-trigger"
          className={cn(
            "w-[200px] justify-start gap-2 border-gray-200 dark:border-zinc-800",
            className
          )}
        >
          <div
            className="w-4 h-4 rounded border border-gray-300 dark:border-zinc-600 flex-shrink-0"
            style={{ backgroundColor: value || "#e5e7eb" }}
          />
          {value ? (
            <span className="text-sm">{value.toUpperCase()}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Select color...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
        <div className="grid grid-cols-4 gap-2">
          {predefinedColors.map((color, index) => (
            <Button
              key={color}
              variant="outline"
              size="sm"
              data-testid={`color-option-${index}`}
              className={cn(
                "w-12 h-12 p-0 border-gray-200 dark:border-zinc-700 hover:border-gray-400 dark:hover:border-zinc-500",
                value === color && "ring-2 ring-blue-500 ring-offset-2"
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
            >
              {value === color && <Check className="w-4 h-4 text-white drop-shadow-lg" />}
            </Button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
          <Button
            variant="outline"
            size="sm"
            data-testid="color-clear"
            className="w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            Clear Color
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
