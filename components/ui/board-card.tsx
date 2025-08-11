"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Edit3, Trash2, Copy, StickyNote } from "lucide-react";
import type { DashboardBoard } from "@/app/dashboard/page";
import type { User } from "@/components/note";

interface BoardCardProps {
  board: DashboardBoard;
  user: User | null;
  onEdit: (board: DashboardBoard) => void;
  onDelete: (boardId: string, boardName: string) => void;
  onTogglePublic: (boardId: string, isPublic: boolean) => void;
  onCopyPublicUrl: (boardId: string) => void;
  copiedBoardId: string | null;
  className?: string;
}

export function BoardCard({
  board,
  user,
  onEdit,
  onDelete,
  onTogglePublic,
  onCopyPublicUrl,
  copiedBoardId,
  className,
}: BoardCardProps) {
  const canEdit = user?.id === board.createdBy || !!user?.isAdmin;
  const isCopied = copiedBoardId === board.id;

  const iconBtn =
      "h-8 w-8 p-0 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 transition focus-visible:ring-2 focus-visible:ring-offset-0 rounded-lg";

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link href={`/boards/${board.id}`} className="block group">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-card/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 backdrop-blur-sm",
          "transition-all duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5",
          "focus-within:ring-2 focus-within:ring-blue-500/20",
          "h-48",
          className
        )}
      >
        {/* Notes badge */}
        <div className="absolute top-4 right-4 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200 border border-blue-200/70 dark:border-blue-800/40">
            <StickyNote className="w-3 h-3" />
            <span>{board._count.notes}</span>
            <span>{board._count.notes === 1 ? "note" : "notes"}</span>
          </div>
        </div>

        {/* Edit / Delete (show on hover/focus) */}
        {canEdit && (
          <div className="absolute top-16 right-4 z-10 flex flex-col gap-2 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
            <Button
              onClick={(e) => {
                stop(e);
                onEdit(board);
              }}
              size="sm"
              variant="ghost"
              className={cn(iconBtn, "hover:bg-blue-50 dark:hover:bg-blue-900/20")}
              aria-label="Edit board"
            >
              <Edit3 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
            <Button
              onClick={(e) => {
                stop(e);
                onDelete(board.id, board.name);
              }}
              size="sm"
              variant="ghost"
              className={cn(iconBtn, "hover:bg-red-50 dark:hover:bg-red-900/20")}
              aria-label="Delete board"
            >
              <Trash2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 pt-6 pb-14 h-full flex flex-col min-w-0">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 truncate pr-16">
            {board.name}
          </h3>
          {board.description ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 break-words">
              {board.description}
            </p>
          ) : (
            <p className="text-sm text-zinc-400 italic">No description</p>
          )}
          <div className="flex-1" />
        </div>

        {/* Public/Private toggle */}
        <div className="absolute bottom-4 left-5 z-10" onClick={stop}>
          <div className="flex items-center gap-2">
            <Switch
              checked={board.isPublic}
              onCheckedChange={(v) => onTogglePublic(board.id, v)}
              disabled={!canEdit}
              aria-label={`Make board ${board.isPublic ? "private" : "public"}`}
            />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 select-none">
              {board.isPublic ? "Public" : "Private"}
            </span>
          </div>
        </div>

        {/* Copy public URL (only when public) – appear on hover/focus */}
        {board.isPublic && (
          <div className="absolute bottom-4 right-4 z-10 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
            <Button
              onClick={(e) => {
                stop(e);
                onCopyPublicUrl(board.id);
              }}
              size="sm"
              variant="ghost"
              className={cn(iconBtn, "hover:bg-blue-50 dark:hover:bg-blue-900/20")}
              aria-label="Copy public link"
            >
              {isCopied ? (
                <span className="text-green-600 dark:text-green-400 text-sm leading-none">✓</span>
              ) : (
                <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              )}
            </Button>
          </div>
        )}
      </div>
    </Link>
  );
}
