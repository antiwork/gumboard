"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Edit3, Plus, Trash2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

interface Note {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  isChecklist?: boolean;
  checklistItems?: ChecklistItem[];
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  board?: {
    id: string;
    name: string;
  };
  x: number;
  y: number;
  width: number;
  height: number;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  organization: {
    name: string;
  } | null;
}

const taskItemVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: 0.2 } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15 } },
};

interface NoteCardProps {
  note: Note;
  user: User | null;
  boardId: string;
  editingNote: string | null;
  editContent: string;
  addingChecklistItem: string | null;
  newChecklistItemContent: string;
  editingChecklistItem: { noteId: string; itemId: string } | null;
  editingChecklistItemContent: string;
  animatingItems: Set<string>;
  onNoteClick: (note: Note, e: React.MouseEvent) => void;
  onEditNote: (noteId: string, content: string) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleDone: (noteId: string, currentDone: boolean) => void;
  onToggleAllChecklistItems: (noteId: string) => void;
  onAddChecklistItem: (noteId: string) => void;
  onToggleChecklistItem: (noteId: string, itemId: string) => void;
  onDeleteChecklistItem: (noteId: string, itemId: string) => void;
  onEditChecklistItem: (noteId: string, itemId: string, content: string) => void;
  onSplitChecklistItem: (noteId: string, itemId: string, content: string, cursorPosition: number) => void;
  onSetEditingNote: (noteId: string | null) => void;
  onSetEditContent: (content: string) => void;
  onSetAddingChecklistItem: (noteId: string | null) => void;
  onSetNewChecklistItemContent: (content: string) => void;
  onSetEditingChecklistItem: (item: { noteId: string; itemId: string } | null) => void;
  onSetEditingChecklistItemContent: (content: string) => void;
}

export function NoteCard({
  note,
  user,
  boardId,
  editingNote,
  editContent,
  addingChecklistItem,
  newChecklistItemContent,
  editingChecklistItem,
  editingChecklistItemContent,
  animatingItems,
  onNoteClick,
  onEditNote,
  onDeleteNote,
  onToggleDone,
  onToggleAllChecklistItems,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onEditChecklistItem,
  onSplitChecklistItem,
  onSetEditingNote,
  onSetEditContent,
  onSetAddingChecklistItem,
  onSetNewChecklistItemContent,
  onSetEditingChecklistItem,
  onSetEditingChecklistItemContent,
}: NoteCardProps) {
  return (
    <div
      className={`absolute select-none group transition-all duration-200 flex flex-col ${
        note.done ? "opacity-80" : ""
      }`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
      }}
      onClick={(e) => onNoteClick(note, e)}
    >
      <div
        className={cn(
          "flex flex-col gap-4 rounded-xl p-4 transition-all h-full",
          "bg-white dark:bg-zinc-900",
          note.color
        )}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-white dark:border-zinc-800">
              <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                {note.user.name
                  ? note.user.name.charAt(0).toUpperCase()
                  : note.user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                {note.user.name
                  ? note.user.name.split(" ")[0]
                  : note.user.email.split("@")[0]}
              </span>
              <div className="flex flex-col">
                {!note.isChecklist && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 opacity-70">
                    {new Date(note.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year:
                          new Date(note.createdAt).getFullYear() !==
                          new Date().getFullYear()
                            ? "numeric"
                            : undefined,
                      }
                    )}
                  </span>
                )}
                {boardId === "all-notes" && note.board && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 opacity-80 font-medium truncate max-w-20">
                    {note.board.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(user?.id === note.user.id || user?.isAdmin) && (
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!note.isChecklist && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetEditingNote(note.id);
                      onSetEditContent(note.content);
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                    <span className="sr-only">Edit note</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteNote(note.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete note</span>
                </Button>
              </div>
            )}
            {(user?.id === note.user.id || user?.isAdmin) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (note.isChecklist) {
                    onToggleAllChecklistItems(note.id);
                  } else {
                    onToggleDone(note.id, note.done);
                  }
                }}
                className={`
                  relative w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-110 z-10
                  ${
                    note.done
                      ? "bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600 text-white shadow-lg opacity-100"
                      : "bg-white dark:bg-gray-800 bg-opacity-60 dark:bg-opacity-60 border-gray-400 dark:border-gray-500 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 opacity-30 group-hover:opacity-100"
                  }
                `}
                title={
                  note.isChecklist
                    ? note.done
                      ? "Uncheck all items"
                      : "Check all items"
                    : note.done
                      ? "Mark as not done"
                      : "Mark as done"
                }
                type="button"
                style={{ pointerEvents: "auto" }}
              >
                {note.done && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {editingNote === note.id && !note.isChecklist ? (
          <div className="flex-1 min-h-0">
            <textarea
              value={editContent}
              onChange={(e) => {
                const newValue = e.target.value;
                onSetEditContent(newValue);
              }}
              className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7 text-zinc-900 dark:text-zinc-100"
              placeholder="Enter note content..."
              onBlur={() => onEditNote(note.id, editContent)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  onEditNote(note.id, editContent);
                }
                if (e.key === "Escape") {
                  onSetEditingNote(null);
                  onSetEditContent("");
                }
                if (e.key === "Backspace" && editContent.trim() === "") {
                  onDeleteNote(note.id);
                }
              }}
              onFocus={(e) => {
                const length = e.target.value.length;
                e.target.setSelectionRange(length, length);
              }}
              autoFocus
            />
          </div>
        ) : note.isChecklist ? (
          <div className="flex flex-col gap-2 flex-1 overflow-hidden">
            <AnimatePresence>
              {note.checklistItems?.map((item) => (
                <motion.div
                  key={item.id}
                  className={`flex items-center gap-3 ${
                    animatingItems.has(item.id) ? "animate-pulse" : ""
                  }`}
                  variants={taskItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Checkbox
                    id={`task-${item.id}`}
                    checked={item.checked}
                    onCheckedChange={() => onToggleChecklistItem(note.id, item.id)}
                    className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                  />

                  {editingChecklistItem?.noteId === note.id &&
                  editingChecklistItem?.itemId === item.id ? (
                    <Input
                      type="text"
                      value={editingChecklistItemContent}
                      onChange={(e) =>
                        onSetEditingChecklistItemContent(e.target.value)
                      }
                      className={cn(
                        "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0"
                      )}
                      onBlur={() =>
                        onEditChecklistItem(
                          note.id,
                          item.id,
                          editingChecklistItemContent
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const target = e.target as HTMLInputElement;
                          const cursorPosition = target.selectionStart || 0;
                          onSplitChecklistItem(
                            note.id,
                            item.id,
                            editingChecklistItemContent,
                            cursorPosition
                          );
                        }
                        if (e.key === "Escape") {
                          onSetEditingChecklistItem(null);
                          onSetEditingChecklistItemContent("");
                        }
                        if (
                          e.key === "Backspace" &&
                          editingChecklistItemContent.trim() === ""
                        ) {
                          onDeleteChecklistItem(note.id, item.id);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex-1 text-sm cursor-pointer",
                        item.checked
                          ? "text-slate-500 dark:text-zinc-500 line-through"
                          : "text-zinc-900 dark:text-zinc-100"
                      )}
                      onClick={() => {
                        if (user?.id === note.user.id || user?.isAdmin) {
                          onSetEditingChecklistItem({
                            noteId: note.id,
                            itemId: item.id,
                          });
                          onSetEditingChecklistItemContent(item.content);
                        }
                      }}
                    >
                      {item.content || (
                        <span className="text-zinc-400 dark:text-zinc-500 italic">
                          Click to edit...
                        </span>
                      )}
                    </span>
                  )}

                  {(user?.id === note.user.id || user?.isAdmin) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-50 hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
                      onClick={() => onDeleteChecklistItem(note.id, item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Delete task</span>
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {addingChecklistItem === note.id && (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border-2 border-slate-500 dark:border-zinc-600 flex-shrink-0 bg-white dark:bg-zinc-800 bg-opacity-60 dark:bg-opacity-60"></div>
                <Input
                  type="text"
                  value={newChecklistItemContent}
                  onChange={(e) => onSetNewChecklistItemContent(e.target.value)}
                  className={cn(
                    "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  )}
                  placeholder="Add new item..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onAddChecklistItem(note.id);
                    }
                    if (e.key === "Escape") {
                      onSetAddingChecklistItem(null);
                      onSetNewChecklistItemContent("");
                    }
                    if (
                      e.key === "Backspace" &&
                      newChecklistItemContent.trim() === ""
                    ) {
                      onSetAddingChecklistItem(null);
                      onSetNewChecklistItemContent("");
                    }
                  }}
                  onBlur={() => {
                    if (newChecklistItemContent.trim()) {
                      onAddChecklistItem(note.id);
                      onSetAddingChecklistItem(null);
                    } else {
                      onSetAddingChecklistItem(null);
                      onSetNewChecklistItemContent("");
                    }
                  }}
                  autoFocus
                />
              </div>
            )}

            {(user?.id === note.user.id || user?.isAdmin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetAddingChecklistItem(note.id)}
                className="mt-1 justify-start text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add task
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <p
              className={cn(
                "text-base whitespace-pre-wrap break-words leading-7 m-0 p-0 flex-1 transition-all duration-200",
                note.done
                  ? "text-zinc-500 dark:text-zinc-400 opacity-70 line-through"
                  : "text-zinc-900 dark:text-zinc-100"
              )}
            >
              {note.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}