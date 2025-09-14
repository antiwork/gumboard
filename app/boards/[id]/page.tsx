"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  Search,
  Copy,
  Trash2,
  X,
  EllipsisVertical,
  XIcon,
  StickyNote,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { BetaBadge } from "@/components/ui/beta-badge";
import { FilterPopover } from "@/components/ui/filter-popover";
import { Note as NoteCard } from "@/components/note";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// Use shared types from components
import type { Note, Board, User } from "@/components/note";
import { useTheme } from "next-themes";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { toast } from "sonner";
import { useUser } from "@/app/contexts/UserContext";
import { getUniqueAuthors, filterAndSortNotes, getBoardColumns } from "@/lib/utils";
import { BoardPageSkeleton } from "@/components/board-skeleton";
import { useBoardColumnMeta } from "@/lib/hooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const { resolvedTheme } = useTheme();
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const columnMeta = useBoardColumnMeta();
  const [notesloading, setNotesLoading] = useState(true);
  const { user, loading: userLoading } = useUser();
  // Inline editing state removed; handled within Note component
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  // Per-item edit and animations are handled inside Note component now
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });
  const pendingDeleteTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [boardSettingsDialog, setBoardSettingsDialog] = useState(false);
  const [boardSettings, setBoardSettings] = useState({
    name: "",
    description: "",
    isPublic: false,
    sendSlackUpdates: true,
  });
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, userLoading, router]);

  const formSchema = z.object({
    name: z.string().min(1, "Board name is required"),
    description: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Update URL with current filter state
  const updateURL = useCallback(
    (
      newSearchTerm?: string,
      newDateRange?: { startDate: Date | null; endDate: Date | null },
      newAuthor?: string | null
    ) => {
      const params = new URLSearchParams();

      const currentSearchTerm = newSearchTerm !== undefined ? newSearchTerm : searchTerm;
      const currentDateRange = newDateRange !== undefined ? newDateRange : dateRange;
      const currentAuthor = newAuthor !== undefined ? newAuthor : selectedAuthor;

      if (currentSearchTerm) {
        params.set("search", currentSearchTerm);
      }

      if (currentDateRange.startDate) {
        params.set("startDate", currentDateRange.startDate.toISOString().split("T")[0]);
      }

      if (currentDateRange.endDate) {
        params.set("endDate", currentDateRange.endDate.toISOString().split("T")[0]);
      }

      if (currentAuthor) {
        params.set("author", currentAuthor);
      }

      const queryString = params.toString();
      const newURL = queryString ? `?${queryString}` : window.location.pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchTerm, dateRange, selectedAuthor, router]
  );

  // Initialize filters from URL parameters
  const initializeFiltersFromURL = () => {
    const urlSearchTerm = searchParams.get("search") || "";
    const urlStartDate = searchParams.get("startDate");
    const urlEndDate = searchParams.get("endDate");
    const urlAuthor = searchParams.get("author");

    setSearchTerm(urlSearchTerm);

    // Parse dates safely
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (urlStartDate) {
      const parsedStartDate = new Date(urlStartDate);
      if (!isNaN(parsedStartDate.getTime())) {
        startDate = parsedStartDate;
      }
    }

    if (urlEndDate) {
      const parsedEndDate = new Date(urlEndDate);
      if (!isNaN(parsedEndDate.getTime())) {
        endDate = parsedEndDate;
      }
    }

    setDateRange({ startDate, endDate });
    setSelectedAuthor(urlAuthor);
  };

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setBoardId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  // Initialize filters from URL on mount
  useEffect(() => {
    initializeFiltersFromURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      updateURL(searchTerm);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm, updateURL]);

  // Get unique authors for dropdown
  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);

  // Get filtered and sorted notes for display
  const filteredNotes = useMemo(
    () => filterAndSortNotes(notes, debouncedSearchTerm, dateRange, selectedAuthor, user),
    [notes, debouncedSearchTerm, dateRange, selectedAuthor, user]
  );

  const columnsData = useMemo(() => {
    return getBoardColumns(columnMeta.count, filteredNotes);
  }, [columnMeta, filteredNotes]);

  const fetchBoardData = async () => {
    try {
      // Fetch all boards for the dropdown
      let allBoardsResponse: Response;
      let notesResponse: Response | undefined;
      let boardResponse: Response | undefined;

      if (boardId === "all-notes") {
        // For all notes view, create a virtual board object and fetch all notes
        [allBoardsResponse, notesResponse] = await Promise.all([
          fetch("/api/boards"),
          fetch(`/api/boards/all-notes/notes`),
        ]);

        setBoard({
          id: "all-notes",
          name: "All notes",
          description: "Notes from all boards",
        });
      } else if (boardId === "archive") {
        [allBoardsResponse, notesResponse] = await Promise.all([
          fetch("/api/boards"),
          fetch(`/api/boards/archive/notes`),
        ]);

        setBoard({
          id: "archive",
          name: "Archive",
          description: "Archived notes from all boards",
        });
      } else {
        [allBoardsResponse, boardResponse, notesResponse] = await Promise.all([
          fetch("/api/boards"),
          fetch(`/api/boards/${boardId}`),
          fetch(`/api/boards/${boardId}/notes`),
        ]);
      }

      if (allBoardsResponse.ok) {
        const { boards } = await allBoardsResponse.json();
        setAllBoards(boards);
      }

      if (boardResponse && boardResponse.ok) {
        const { board } = await boardResponse.json();
        setBoard(board);
        setBoardSettings({
          name: board.name,
          description: board.description || "",
          isPublic: (board as { isPublic?: boolean })?.isPublic ?? false,
          sendSlackUpdates: (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true,
        });
      }

      if (notesResponse && notesResponse.ok) {
        const { notes } = await notesResponse.json();
        setNotes(notes);
      }

      if (boardId && boardId !== "all-notes") {
        try {
          localStorage.setItem("gumboard-last-visited-board", boardId);
        } catch (error) {
          console.warn("Failed to save last visited board:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching board data:", error);
    } finally {
      setNotesLoading(false);
    }
  };

  // Adapter: bridge component Note -> existing update handler
  const handleUpdateNoteFromComponent = async (updatedNote: Note) => {
    // Find the note to get its board ID for all notes view
    const currentNote = notes.find((n) => n.id === updatedNote.id);
    if (!currentNote) return;

    // OPTIMISTIC UPDATE: Update UI immediately
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const handleAddNote = async (targetBoardId?: string) => {
    // For all notes view, ensure a board is selected
    if (boardId === "all-notes" && !targetBoardId) {
      setErrorDialog({
        open: true,
        title: "Board selection required",
        description: "Please select a board to add the note to",
      });
      return;
    }

    try {
      const actualTargetBoardId = boardId === "all-notes" ? targetBoardId : boardId;
      const isAllNotesView = boardId === "all-notes";

      const response = await fetch(
        `/api/boards/${isAllNotesView ? "all-notes" : actualTargetBoardId}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: [],
            ...(isAllNotesView && { boardId: targetBoardId }),
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes((prev) => [...prev, note]);
        if (searchTerm.trim() || dateRange.startDate || dateRange.endDate || selectedAuthor) {
          setSearchTerm("");
          setDebouncedSearchTerm("");
          setDateRange({ startDate: null, endDate: null });
          setSelectedAuthor(null);
          updateURL("", { startDate: null, endDate: null }, null);
        }
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleCopyNote = async (originalNote: Note) => {
    try {
      const targetBoardId = boardId === "all-notes" ? originalNote.boardId : boardId;
      const isAllNotesView = boardId === "all-notes";

      const checklistItems =
        originalNote.checklistItems?.map((item, index) => ({
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: item.content,
          checked: item.checked,
          order: index,
        })) || [];

      const response = await fetch(
        `/api/boards/${isAllNotesView ? "all-notes" : targetBoardId}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            color: originalNote.color,
            checklistItems,
            ...(isAllNotesView && { boardId: targetBoardId }),
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes((prev) => [...prev, note]);
      }
    } catch (error) {
      console.error("Error copying note:", error);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;

    const targetBoardId = noteToDelete.board?.id ?? noteToDelete.boardId;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          setNotes((prev) => [noteToDelete, ...prev]);
          const errorData = await response.json().catch(() => null);
          setErrorDialog({
            open: true,
            title: "Failed to delete note",
            description: errorData?.error || "Failed to delete note",
          });
        }
      } catch (error) {
        console.error("Error deleting note:", error);
        setNotes((prev) => [noteToDelete, ...prev]);
        setErrorDialog({
          open: true,
          title: "Failed to delete note",
          description: "Failed to delete note",
        });
      } finally {
        delete pendingDeleteTimeoutsRef.current[noteId];
      }
    }, 4000);
    pendingDeleteTimeoutsRef.current[noteId] = timeoutId;

    toast("Note deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          const t = pendingDeleteTimeoutsRef.current[noteId];
          if (t) {
            clearTimeout(t);
            delete pendingDeleteTimeoutsRef.current[noteId];
          }
          setNotes((prev) => [noteToDelete, ...prev]);
        },
      },
      duration: 4000,
    });
  };

  const handleArchiveNote = (noteId: string) => {
    const currentNote = notes.find((n) => n.id === noteId);
    if (!currentNote) return;

    const targetBoardId = currentNote.board?.id ?? currentNote.boardId;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    // Archive immediately instead of after 4 seconds
    fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    })
      .then((response) => {
        if (!response.ok) {
          setNotes((prev) => [currentNote, ...prev]);
          setErrorDialog({
            open: true,
            title: "Archive Failed",
            description: "Failed to archive note. Please try again.",
          });
        }
      })
      .catch((error) => {
        console.error("Error archiving note:", error);
        setNotes((prev) => [currentNote, ...prev]);
        setErrorDialog({
          open: true,
          title: "Archive Failed",
          description: "Failed to archive note. Please try again.",
        });
      });

    toast("Note archived", {
      action: {
        label: "Undo",
        onClick: async () => {
          setNotes((prev) => [currentNote, ...prev]);
          try {
            await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archivedAt: null }),
            });
          } catch (error) {
            console.error("Error undoing archive:", error);
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
          }
        },
      },
      duration: 4000,
    });
  };

  const handleUnarchiveNote = (noteId: string) => {
    const currentNote = notes.find((n) => n.id === noteId);
    if (!currentNote) return;

    const targetBoardId = currentNote.board?.id ?? currentNote.boardId;
    if (!targetBoardId) return;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    // Unarchive immediately instead of after 4 seconds
    fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: null }),
    })
      .then((response) => {
        if (!response.ok) {
          setNotes((prev) => [currentNote, ...prev]);
          setErrorDialog({
            open: true,
            title: "Unarchive Failed",
            description: "Failed to unarchive note. Please try again.",
          });
        }
      })
      .catch((error) => {
        console.error("Error unarchiving note:", error);
        setNotes((prev) => [currentNote, ...prev]);
        setErrorDialog({
          open: true,
          title: "Unarchive Failed",
          description: "Failed to unarchive note. Please try again.",
        });
      });

    toast("Note unarchived", {
      action: {
        label: "Undo",
        onClick: async () => {
          setNotes((prev) => [currentNote, ...prev]);
          try {
            await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ archivedAt: new Date().toISOString() }),
            });
          } catch (error) {
            console.error("Error undoing unarchive:", error);
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
          }
        },
      },
      duration: 4000,
    });
  };

  const handleAddBoard = async (values: z.infer<typeof formSchema>) => {
    const { name, description } = values;
    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      if (response.ok) {
        const { board } = await response.json();
        setAllBoards([board, ...allBoards]);
        setShowAddBoard(false);
        router.push(`/boards/${board.id}`);
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to create board",
          description: errorData.error || "Failed to create board",
        });
      }
    } catch (error) {
      console.error("Error creating board:", error);
      setErrorDialog({
        open: true,
        title: "Failed to create board",
        description: "Failed to create board",
      });
    }
  };

  const handleUpdateBoardSettings = async (settings: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    sendSlackUpdates: boolean;
  }) => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const { board } = await response.json();
        setBoard(board);
        setAllBoards((prevBoards) => prevBoards.map((b) => (b.id === board.id ? board : b)));
        setBoardSettings({
          name: board.name,
          description: board.description || "",
          isPublic: (board as { isPublic?: boolean })?.isPublic ?? false,
          sendSlackUpdates: (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true,
        });
        setBoardSettingsDialog(false);
      }
    } catch (error) {
      console.error("Error updating board settings:", error);
    }
  };

  const handleCopyPublicUrl = async () => {
    const publicUrl = `${window.location.origin}/public/boards/${boardId}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublicUrl(true);
      setTimeout(() => setCopiedPublicUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleDeleteBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to delete board",
          description: errorData.error || "Failed to delete board",
        });
      }
    } catch (error) {
      console.error("Error deleting board:", error);
      setErrorDialog({
        open: true,
        title: "Failed to delete board",
        description: "Failed to delete board",
      });
    }
    setDeleteConfirmDialog(false);
  };

  if (userLoading || notesloading) {
    return <BoardPageSkeleton />;
  }

  if (!board && boardId !== "all-notes" && boardId !== "archive") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Board not found</h1>
          <Button asChild>
            <Link href="/">Go to Gumboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-screen bg-zinc-100 dark:bg-zinc-800 bg-dots">
      <div>
        <div className="mx-0.5 md:mx-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center h-auto md:h-16 p-2 md:p-0">
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 md:w-fit grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] md:grid-cols-[auto_auto_1fr_auto_auto] gap-2 items-center auto-rows-auto grid-flow-dense">
            {/* Company Name */}
            <Link href="/dashboard" className="flex-shrink-0 pl-1 w-fit">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                Gumboard
                <BetaBadge />
              </h1>
            </Link>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700 hidden md:block" />

            {/* Board Selector Dropdown */}
            <Popover open={showBoardDropdown} onOpenChange={setShowBoardDropdown}>
              <PopoverTrigger
                asChild
                data-testid="board-dropdown-trigger"
                className="board-dropdown mr-0 min-w-32 sm:max-w-64 col-span-2 sm:col-span-1"
              >
                <Button variant="ghost" className="flex items-center justify-between p-2 w-full">
                  <div className="text-sm font-semibold text-foreground dark:text-zinc-100 truncate">
                    {boardId === "all-notes"
                      ? "All notes"
                      : boardId === "archive"
                        ? "Archive"
                        : board?.name}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showBoardDropdown ? "rotate-180" : ""}`}
                  />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="p-2 max-w-screen md:max-w-72 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-x-hidden"
                align="start"
              >
                <div className="flex flex-col gap-1">
                  <div className="max-h-50 overflow-y-auto overflow-x-hidden">
                    {allBoards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/boards/${b.id}`}
                        data-board-id={b.id}
                        className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-white truncate ${
                          b.id === boardId
                            ? "bg-sky-50 dark:bg-sky-600 text-foreground dark:text-zinc-100 font-semibold"
                            : "text-foreground dark:text-zinc-100"
                        } turncate whitespace-nowrap`}
                      >
                        <div data-board-name={b.name}>{b.name}</div>
                      </Link>
                    ))}
                  </div>

                  {allBoards.length > 0 && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                  )}

                  {/* All Notes Option */}
                  <Link
                    href="/boards/all-notes"
                    className={`rounded-lg font-medium block px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      boardId === "all-notes"
                        ? "bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold"
                        : "text-foreground dark:text-white"
                    }`}
                  >
                    <div>All notes</div>
                  </Link>

                  {/* Archive Option */}
                  <Link
                    href="/boards/archive"
                    className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      boardId === "archive"
                        ? "bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold"
                        : "text-foreground dark:text-white"
                    }`}
                  >
                    <div>All archived</div>
                  </Link>
                  <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddBoard(true);
                      setShowBoardDropdown(false);
                    }}
                    className="flex items-center w-full px-4 py-2"
                  >
                    <span className="font-medium">Create new board</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700 hidden sm:block" />

            {/* Filter Popover */}
            <div className="flex flex-nowrap space-x-1">
              <div className="relative board-dropdown" data-slot="filter-popover">
                <FilterPopover
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onDateRangeChange={(startDate, endDate) => {
                    const newDateRange = { startDate, endDate };
                    setDateRange(newDateRange);
                    updateURL(undefined, newDateRange);
                  }}
                  selectedAuthor={selectedAuthor}
                  authors={uniqueAuthors}
                  onAuthorChange={(authorId) => {
                    setSelectedAuthor(authorId);
                    updateURL(undefined, undefined, authorId);
                  }}
                  className="h-9"
                />
              </div>
              {boardId !== "all-notes" && boardId !== "archive" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBoardSettings({
                      name: board?.name || "",
                      description: board?.description || "",
                      isPublic: (board as { isPublic?: boolean })?.isPublic ?? false,
                      sendSlackUpdates:
                        (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true,
                    });
                    setBoardSettingsDialog(true);
                  }}
                  aria-label="Board settings"
                  title="Board settings"
                  className="flex items-center size-9"
                >
                  <EllipsisVertical className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Right side - Search, Add Note and User dropdown */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 grid grid-cols-[1fr_auto] md:grid-cols-[auto_auto_auto] gap-2 items-center auto-rows-auto grid-flow-dense">
            {/* Search Box */}
            {notes.length > 0 && (
              <div className="relative h-9">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
                </div>
                <input
                  aria-label="Search notes"
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  className="w-full pl-10 pr-8 py-2 border border-zinc-100 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 dark:focus:ring-sky-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
                />
                {searchTerm && (
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setDebouncedSearchTerm("");
                      updateURL("");
                    }}
                    className="absolute top-[5px] right-1 size-7 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-white dark:hover:text-zinc-100 cursor-pointer bg-transparent"
                  >
                    <X className="h-4 w-4 " />
                  </Button>
                )}
              </div>
            )}
            <Button
              onClick={() => {
                if (boardId === "all-notes" && allBoards.length > 0) {
                  handleAddNote(allBoards[0].id);
                } else {
                  handleAddNote();
                }
              }}
              disabled={boardId === "archive"}
              className="col-span-2 md:col-span-1 flex items-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add note</span>
            </Button>

            {/* User Dropdown */}
            <ProfileDropdown user={user} />
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div
        ref={boardRef}
        className="relative w-full min-h-[calc(100vh-236px)] sm:min-h-[calc(100vh-64px)] p-3 md:p-5"
      >
        <div className={`flex gap-${columnMeta.gap}`}>
          {columnsData.map((column, index) => (
            <div key={index} className="flex-1 flex flex-col gap-4">
              {column.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  currentUser={user as User}
                  onUpdate={handleUpdateNoteFromComponent}
                  onDelete={handleDeleteNote}
                  onArchive={boardId !== "archive" ? handleArchiveNote : undefined}
                  onUnarchive={boardId === "archive" ? handleUnarchiveNote : undefined}
                  onCopy={handleCopyNote}
                  showBoardName={boardId === "all-notes" || boardId === "archive"}
                  className="shadow-md shadow-black/10 p-4"
                  style={{
                    backgroundColor: resolvedTheme === "dark" ? "#18181B" : note.color,
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* No Notes Created State */}
        {notes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="mb-4">
              <StickyNote className="w-12 h-12 text-muted-foreground dark:text-zinc-400 mx-auto" />
            </div>

            <h3 className="text-xl font-semibold text-foreground dark:text-zinc-100 mb-2">
              {boardId === "archive" ? "No archived notes" : "No notes yet"}
            </h3>

            <p className="text-muted-foreground dark:text-zinc-400 mb-6 max-w-md">
              {boardId === "archive"
                ? "Notes that you archive will appear here. Archived notes are hidden from your active boards but can be restored anytime."
                : board?.name
                  ? `Start organizing your ideas by creating your first note in ${board.name}.`
                  : "Start organizing your ideas by creating your first note."}
            </p>

            {boardId !== "archive" && (
              <Button
                onClick={() => {
                  if (boardId === "all-notes" && allBoards.length > 0) {
                    handleAddNote(allBoards[0].id);
                  } else {
                    handleAddNote();
                  }
                }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create your first note
              </Button>
            )}
          </div>
        )}

        {/* Filtered Empty State */}
        {filteredNotes.length === 0 &&
          notes.length > 0 &&
          (searchTerm || dateRange.startDate || dateRange.endDate || selectedAuthor) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-500" />
              <div className="text-xl mb-2">No notes found</div>
              <div className="text-sm mb-4 text-center">
                No notes match your current filters
                {searchTerm && <div>Search: &quot;{searchTerm}&quot;</div>}
                {selectedAuthor && (
                  <div>
                    Author: {uniqueAuthors.find((a) => a.id === selectedAuthor)?.name || "Unknown"}
                  </div>
                )}
                {(dateRange.startDate || dateRange.endDate) && (
                  <div>
                    Date range:{" "}
                    {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : "..."} -{" "}
                    {dateRange.endDate ? dateRange.endDate.toLocaleDateString() : "..."}
                  </div>
                )}
              </div>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setDebouncedSearchTerm("");
                  setDateRange({ startDate: null, endDate: null });
                  setSelectedAuthor(null);
                  updateURL("", { startDate: null, endDate: null }, null);
                }}
                variant="default"
              >
                <span>Clear All Filters</span>
              </Button>
            </div>
          )}
      </div>

      <Dialog open={showAddBoard} onOpenChange={setShowAddBoard}>
        <DialogContent className="bg-white dark:bg-zinc-950  sm:max-w-[425px] ">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold mb-4 text-foreground dark:text-zinc-100">
              Create New Board
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-zinc-400">
              Fill out the details to create a new board.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleAddBoard)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter board name"
                        className="border border-zinc-200 dark:border-zinc-800 text-muted-foreground dark:text-zinc-200"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-600" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <textarea
                        placeholder="Enter board description"
                        className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 
                        w-full min-h-[60px] text-base md:text-sm rounded-md px-3 py-2 outline-none 
                        focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 focus:border-blue-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Create board</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ open, title: "", description: "" })}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              {errorDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              {errorDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setErrorDialog({ open: false, title: "", description: "" })}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={boardSettingsDialog} onOpenChange={setBoardSettingsDialog}>
        <AlertDialogContent className="board-settings-modal bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 p-4 lg:p-6">
          <AlertDialogHeader>
            <AlertDialogCancel asChild>
              <Button
                className="absolute right-4 top-3 md:right-4 md:top-5 border-0 p-1"
                aria-label="Close"
                title="close"
              >
                <XIcon className="text-4" />
              </Button>
            </AlertDialogCancel>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Board settings
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Configure settings for &quot;{board?.name}&quot; board.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                Board name
              </label>
              <Input
                type="text"
                value={boardSettings.name}
                onChange={(e) => setBoardSettings((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter board name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                Description (optional)
              </label>
              <Textarea
                value={boardSettings.description}
                onChange={(e) =>
                  setBoardSettings((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter board description"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={boardSettings.isPublic}
                  onCheckedChange={(checked) =>
                    setBoardSettings((prev) => ({ ...prev, isPublic: checked as boolean }))
                  }
                />
                <label
                  htmlFor="isPublic"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground dark:text-zinc-100"
                >
                  Make board public
                </label>
              </div>
              <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-1 ml-6">
                When enabled, anyone with the link can view this board
              </p>

              {boardSettings.isPublic && (
                <div className="ml-6 p-3 bg-gray-50 dark:bg-zinc-800 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-zinc-100">
                        Public link
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-zinc-400 break-all">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/public/boards/${boardId}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      onClick={handleCopyPublicUrl}
                      size="sm"
                      variant="outline"
                      className="ml-3 flex items-center space-x-1"
                    >
                      {copiedPublicUrl ? (
                        <>
                          <span className="text-xs">✓</span>
                          <span className="text-xs">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-xs">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendSlackUpdates"
                checked={boardSettings.sendSlackUpdates}
                onCheckedChange={(checked) =>
                  setBoardSettings((prev) => ({ ...prev, sendSlackUpdates: checked as boolean }))
                }
                className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600"
              />
              <label
                htmlFor="sendSlackUpdates"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground dark:text-zinc-100"
              >
                Send updates to Slack
              </label>
            </div>
            <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-1 ml-6">
              When enabled, note updates will be sent to your organization&apos;s Slack channel
            </p>
          </div>

          <AlertDialogFooter className="flex !flex-row justify-start md:justify-between">
            <Button
              onClick={() => setDeleteConfirmDialog(true)}
              variant="destructive"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden lg:inline">Delete Board</span>
            </Button>

            <AlertDialogAction
              onClick={() => handleUpdateBoardSettings(boardSettings)}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white"
            >
              Save settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete Board
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete &quot;{board?.name}&quot;? This action cannot be
              undone and will permanently delete all notes in this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
