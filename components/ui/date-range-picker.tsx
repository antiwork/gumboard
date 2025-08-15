"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";

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
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalStartDate, setInternalStartDate] = useState<Date | null>(startDate || null);
  const [internalEndDate, setInternalEndDate] = useState<Date | null>(endDate || null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const parseDateFromInput = (dateString: string): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString + "T00:00:00");
    return isNaN(date.getTime()) ? null : date;
  };

  const handleStartDateChange = (dateString: string) => {
    const date = parseDateFromInput(dateString);
    setInternalStartDate(date);
    if (date && internalEndDate && date > internalEndDate) {
      setInternalEndDate(null);
      onDateRangeChange?.(date, null);
    } else {
      onDateRangeChange?.(date, internalEndDate);
    }
  };

  const handleEndDateChange = (dateString: string) => {
    const date = parseDateFromInput(dateString);
    if (date && internalStartDate && internalStartDate > date) {
      return;
    }
    setInternalEndDate(date);
    onDateRangeChange?.(internalStartDate, date);
  };

  const handleClear = () => {
    setInternalStartDate(null);
    setInternalEndDate(null);
    onDateRangeChange?.(null, null);
    setIsOpen(false);
  };

  const handleApply = () => {
    setIsOpen(false);
  };

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
          "flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-500 focus:border-transparent transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 dark:ring-zinc-500 border-transparent"
        )}
      >
        <Calendar className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
        <span className="text-gray-700 dark:text-zinc-200 truncate max-w-48 lg:max-w-64">
          {getDisplayText()}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 dark:text-zinc-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </Button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-gray-200 dark:border-zinc-700 z-50 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                Select Date Range
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formatDateForInput(internalStartDate)}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={formatDateForInput(internalEndDate)}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={formatDateForInput(internalStartDate)}
                  className="w-full dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-zinc-700">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-gray-600 dark:text-zinc-300 hover:text-gray-800 dark:hover:text-zinc-100"
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-blue-600 text-white dark:bg-zinc-800 hover:bg-blue-700 dark:hover:bg-zinc-700"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { DateRangePicker };
