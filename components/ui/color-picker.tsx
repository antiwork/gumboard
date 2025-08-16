"use client";

import * as React from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NOTE_COLORS } from "@/lib/constants";

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ColorPicker({
  currentColor,
  onColorChange,
  disabled,
  className,
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleColorSelect = (color: string) => {
    onColorChange(color);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-md transition-colors duration-150",
                className
              )}
              disabled={disabled}
              aria-label="Change note color"
            >
              <Palette className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Change note color</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-44 p-4" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Choose color</div>
          <div className="grid grid-cols-4 gap-2">
            {NOTE_COLORS.map((color) => (
              <Button
                key={color}
                onClick={() => handleColorSelect(color)}
                variant="ghost"
                size="icon"
                className={cn(
                  "w-8 h-8 p-0 transition-colors duration-150",
                  "border border-transparent",
                  currentColor === color
                    ? "border-gray-800 dark:border-gray-200"
                    : "hover:border-gray-400 dark:hover:border-gray-500"
                )}
                style={{ backgroundColor: color }}
                disabled={disabled}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
