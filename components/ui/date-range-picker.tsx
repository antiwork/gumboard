"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onDateRangeChange?: (startDate: Date | null, endDate: Date | null) => void;
  className?: string;
  disabled?: boolean;
}

function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  disabled = false,
}: DateRangePickerProps) {
  const [internalStartDate, setInternalStartDate] = useState<Date | null>(startDate || null);
  const [internalEndDate, setInternalEndDate] = useState<Date | null>(endDate || null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isStartPopoverOpen, setIsStartPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);

  const formatDate = (date: Date | null) => (date ? format(date, "LLL dd, y") : "");

  const getDisplayText = () => {
    if (internalStartDate && internalEndDate) {
      return `${formatDate(internalStartDate)} - ${formatDate(internalEndDate)}`;
    } else if (internalStartDate) {
      return `${formatDate(internalStartDate)} - ...`;
    } else if (internalEndDate) {
      return `... - ${formatDate(internalEndDate)}`;
    }
    return "Select date range";
  };

  const handleStartCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setInternalStartDate(date);
      if (internalEndDate && isAfter(date, internalEndDate)) {
        setInternalEndDate(null);
        onDateRangeChange?.(date, null);
      } else {
        onDateRangeChange?.(date, internalEndDate);
      }
    }
    setIsStartPopoverOpen(false);
  };

  const handleEndCalendarSelect = (date: Date | undefined) => {
    if (date && internalStartDate && isAfter(internalStartDate, date)) return;
    setInternalEndDate(date || null);
    onDateRangeChange?.(internalStartDate, date || null);
    setIsEndPopoverOpen(false);
  };

  const handleClear = () => {
    setInternalStartDate(null);
    setInternalEndDate(null);
    onDateRangeChange?.(null, null);
    setIsFilterDropdownOpen(false);
  };

  const handleApply = () => setIsFilterDropdownOpen(false);

  useEffect(() => {
    setInternalStartDate(startDate || null);
    setInternalEndDate(endDate || null);
  }, [startDate, endDate]);

  return (
    <Popover open={isFilterDropdownOpen} onOpenChange={setIsFilterDropdownOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="date-range-trigger"
          disabled={disabled}
          className={cn(
            "flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-500 focus:border-transparent transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <CalendarIcon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
          <span className="text-gray-700 dark:text-zinc-200 truncate max-w-48 lg:max-w-64">
            {getDisplayText()}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-500 dark:text-zinc-400 transition-transform",
              isFilterDropdownOpen && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-50 p-4"
        align="start"
      >
        <div className="space-y-4">
          <div className="space-y-3">
            {/* Start Date */}
            <div>
              <span className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                Start Date
              </span>
              <Popover open={isStartPopoverOpen} onOpenChange={setIsStartPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="start-date-btn"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !internalStartDate && "text-muted-foreground"
                    )}
                  >
                    {internalStartDate
                      ? format(internalStartDate, "LLL dd, y")
                      : "Pick a start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 text-muted-foreground dark:text-zinc-200">
                  <Calendar
                    mode="single"
                    selected={internalStartDate || undefined}
                    month={internalStartDate || undefined}
                    onSelect={handleStartCalendarSelect}
                    modifiersClassNames={{
                      outside: "text-gray-400 opacity-50 pointer-events-none",
                    }}
                    classNames={{
                      day: "hover:bg-sky-500 transition-colors duration-200 rounded",
                      disabled: "opacity-50 cursor-not-allowed hover:bg-transparent",
                      selected: "bg-sky-500 text-white hover:bg-sky-600",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div>
              <span className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                End Date
              </span>
              <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    data-testid="end-date-btn"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !internalEndDate && "text-muted-foreground"
                    )}
                  >
                    {internalEndDate ? format(internalEndDate, "LLL dd, y") : "Pick an end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 text-muted-foreground dark:text-zinc-200">
                  <Calendar
                    mode="single"
                    selected={internalEndDate || undefined}
                    month={internalEndDate || internalStartDate || undefined}
                    onSelect={handleEndCalendarSelect}
                    disabled={(date) =>
                      internalStartDate ? isAfter(internalStartDate, date) : false
                    }
                    modifiersClassNames={{
                      outside: "text-gray-400 opacity-50 pointer-events-none",
                    }}
                    classNames={{
                      day: "hover:bg-sky-500 hover:text-white transition-colors rounded",
                      disabled: "opacity-50 cursor-not-allowed hover:bg-transparent",
                      selected: "bg-sky-500 text-white hover:bg-sky-600",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center dark:border-zinc-700">
            <Button
              data-testid="clear-btn"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-gray-600 dark:text-zinc-300"
            >
              Clear
            </Button>
            <Button
              data-testid="apply-btn"
              size="sm"
              onClick={handleApply}
              className="bg-sky-600 text-white dark:bg-zinc-800 hover:bg-sky-500 dark:hover:bg-zinc-700"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
