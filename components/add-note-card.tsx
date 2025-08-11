"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface AddNoteCardProps {
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AddNoteCard({ onClick, className, style }: AddNoteCardProps) {
  useTheme();

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-zinc-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
        className
      )}
      style={style}
    >
      <div className="flex flex-col items-center justify-center space-y-3 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
        <div className="p-3 rounded-full bg-gray-200/50 dark:bg-gray-700/50 group-hover:bg-blue-200/50 dark:group-hover:bg-blue-800/50 transition-all duration-200">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-sm font-medium">Add new note</span>
      </div>
    </div>
  );
}
