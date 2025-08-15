"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, Search, Copy, Trash2, Settings, X } from "lucide-react";
import Link from "next/link";
import { BetaBadge } from "@/components/ui/beta-badge";
import { FullPageLoader } from "@/components/ui/loader";
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
import type { Note, Board, User } from "@/components/note";
import { useTheme } from "next-themes";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { toast } from "sonner";
import { useUser } from "@/app/contexts/UserContext";
import {
  getResponsiveConfig,
  getUniqueAuthors,
  calculateGridLayout,
  calculateMobileLayout,
  filterAndSortNotes,
} from "@/lib/utils";

type PositionedNote = Note & { x: number; y: number; width: number; height: number };

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const { resolvedTheme } = useTheme();
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [notesloading, setNotesLoading] = useState(true);
  const { user, loading: userLoading } = useUser();
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null,
  });
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [addingChecklistItem, setAddingChecklistItem] = useState<string | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: "",
    description: "",
  });
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
    if (!userLoading && !user) router.push("/auth/signin");
  }, [user, userLoading, router]);

  // keep URL in sync with filters
  const updateURL = useCallback(
    (
      newSearchTerm?: string,
      newDateRange?: { startDate: Date | null; endDate: Date | null },
      newAuthor?: string | null
    ) => {
      const params = new URLSearchParams();
      const currentSearchTerm = newSearchTerm ?? searchTerm;
      const currentDateRange = newDateRange ?? dateRange;
      const currentAuthor = newAuthor ?? selectedAuthor;

      if (currentSearchTerm) params.set("search", currentSearchTerm);
      if (currentDateRange.startDate) params.set("startDate", currentDateRange.startDate.toISOString().split("T")[0]);
      if (currentDateRange.endDate) params.set("endDate", currentDateRange.endDate.toISOString().split("T")[0]);
      if (currentAuthor) params.set("author", currentAuthor);

      const queryString = params.toString();
      const newURL = queryString ? `?${queryString}` : window.location.pathname;
      router.replace(newURL, { scroll: false });
    },
    [searchTerm, dateRange, selectedAuthor, router]
  );

  // initialize filters from URL once
  const initializeFiltersFromURL = () => {
    const urlSearchTerm = searchParams.get("search") || "";
    const urlStartDate = searchParams.get("startDate");
    const urlEndDate = searchParams.get("endDate");
    const urlAuthor = searchParams.get("author");

    setSearchTerm(urlSearchTerm);

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (urlStartDate) {
      const d = new Date(urlStartDate);
      if (!isNaN(d.getTime())) startDate = d;
    }
    if (urlEndDate) {
      const d = new Date(urlEndDate);
      if (!isNaN(d.getTime())) endDate = d;
    }

    setDateRange({ startDate, endDate });
    setSelectedAuthor(urlAuthor);
  };

  useEffect(() => {
    const init = async () => {
      const resolved = await params;
      setBoardId(resolved.id);
    };
    init();
  }, [params]);

  useEffect(() => {
    initializeFiltersFromURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (boardId) fetchBoardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // close dropdowns on outside click/escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showBoardDropdown || showAddBoard) {
        const target = e.target as Element;
        if (!target.closest(".board-dropdown") && !target.closest(".user-dropdown") && !target.closest(".add-board-modal")) {
          setShowBoardDropdown(false);
          setShowAddBoard(false);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addingChecklistItem) setAddingChecklistItem(null);
        if (showBoardDropdown) setShowBoardDropdown(false);
        if (showAddBoard) {
          setShowAddBoard(false);
          setNewBoardName("");
          setNewBoardDescription("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showBoardDropdown, showAddBoard, addingChecklistItem]);

  // responsive
  useEffect(() => {
    let t: NodeJS.Timeout;
    const check = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth < 768);
        clearTimeout(t);
        t = setTimeout(() => setNotes((prev) => [...prev]), 50);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("resize", check);
      clearTimeout(t);
    };
  }, []);

  // debounce search + update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      updateURL(searchTerm);
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchTerm, updateURL]);

  // authors + filtered notes via shared utils
  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);
  const filteredNotes = useMemo(
    () => filterAndSortNotes(notes, debouncedSearchTerm, dateRange, selectedAuthor, user),
    [notes, debouncedSearchTerm, dateRange, selectedAuthor, user]
  );

  // layout using shared utils (returns positioned notes)
  const layoutNotes = useMemo<PositionedNote[]>(
    () =>
      (isMobile
        ? calculateMobileLayout(filteredNotes, addingChecklistItem)
        : calculateGridLayout(filteredNotes, addingChecklistItem)) as unknown as PositionedNote[],
    [isMobile, filteredNotes, addingChecklistItem]
  );

  const boardHeight = useMemo(() => {
    if (layoutNotes.length === 0) return "calc(100vh - 64px)";
    const maxBottom = Math.max(...layoutNotes.map((n) => n.y + n.height));
    const minHeight = typeof window !== "undefined" && window.innerWidth < 768 ? 500 : 600;
    return `${Math.max(minHeight, maxBottom + 100)}px`;
  }, [layoutNotes]);

  const fetchBoardData = async () => {
    try {
      let allBoardsResponse: Response;
      let notesResponse: Response | undefined;
      let boardResponse: Response | undefined;

      if (boardId === "all-notes") {
        [allBoardsResponse, notesResponse] = await Promise.all([fetch("/api/boards"), fetch(`/api/boards/all-notes/notes`)]);
        setBoard({ id: "all-notes", name: "All notes", description: "Notes from all boards" });
      } else if (boardId === "archive") {
        [allBoardsResponse, notesResponse] = await Promise.all([fetch("/api/boards"), fetch(`/api/boards/archive/notes`)]);
        setBoard({ id: "archive", name: "Archive", description: "Archived notes from all boards" });
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
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.error("Error fetching board data:", e);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleUpdateNoteFromComponent = async (updatedNote: Note) => {
    const current = notes.find((n) => n.id === updatedNote.id);
    if (!current) return;
    setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
  };

  const handleAddNote = async (targetBoardId?: string) => {
    if (boardId === "all-notes" && !targetBoardId) {
      setErrorDialog({ open: true, title: "Board selection required", description: "Please select a board to add the note to" });
      return;
    }
    try {
      const actualTargetBoardId = boardId === "all-notes" ? targetBoardId : boardId;
      const isAllNotesView = boardId === "all-notes";
      const response = await fetch(`/api/boards/${isAllNotesView ? "all-notes" : actualTargetBoardId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistItems: [],
          ...(isAllNotesView && { boardId: targetBoardId }),
        }),
      });
      if (response.ok) {
        const { note } = await response.json();
        setNotes([...notes, note]);
        setAddingChecklistItem(note.id);
      }
    } catch (e) {
      console.error("Error creating note:", e);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;
    const targetBoardId = noteToDelete.board?.id ?? noteToDelete.boardId;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, { method: "DELETE" });
        if (!response.ok) {
          setNotes((prev) => [noteToDelete, ...prev]);
          const errorData = await response.json().catch(() => null);
          setErrorDialog({
            open: true,
            title: "Failed to delete note",
            description: errorData?.error || "Failed to delete note",
          });
        }
      } catch (e) {
        console.error("Error deleting note:", e);
        setNotes((prev) => [noteToDelete, ...prev]);
        setErrorDialog({ open: true, title: "Failed to delete note", description: "Failed to delete note" });
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

  const handleArchiveNote = async (noteId: string) => {
    try {
      const current = notes.find((n) => n.id === noteId);
      if (!current) return;
      const targetBoardId = current.board?.id ?? current.boardId;

      setNotes(notes.filter((n) => n.id !== noteId));

      const response = await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: new Date().toISOString() }),
      });

      if (!response.ok) {
        setNotes([...notes, current]);
        setErrorDialog({ open: true, title: "Archive Failed", description: "Failed to archive note. Please try again." });
      }
    } catch (e) {
      console.error("Error archiving note:", e);
    }
  };

  const handleUnarchiveNote = async (noteId: string) => {
    try {
      const current = notes.find((n) => n.id === noteId);
      if (!current) return;
      const targetBoardId = current.board?.id ?? current.boardId;
      if (!targetBoardId) return;

      setNotes(notes.filter((n) => n.id !== noteId));

      const response = await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: null }),
      });

      if (!response.ok) {
        setNotes([...notes, current]);
        setErrorDialog({ open: true, title: "Unarchive Failed", description: "Failed to unarchive note. Please try again." });
      }
    } catch (e) {
      console.error("Error unarchiving note:", e);
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName, description: newBoardDescription }),
      });
      if (response.ok) {
        const { board } = await response.json();
        setAllBoards([board, ...allBoards]);
        setNewBoardName("");
        setNewBoardDescription("");
        setShowAddBoard(false);
        setShowBoardDropdown(false);
        router.push(`/boards/${board.id}`);
      } else {
        const errorData = await response.json();
        setErrorDialog({ open: true, title: "Failed to create board", description: errorData.error || "Failed to create board" });
      }
    } catch (e) {
      console.error("Error creating board:", e);
      setErrorDialog({ open: true, title: "Failed to create board", description: "Failed to create board" });
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
        setBoardSettings({
          name: board.name,
          description: board.description || "",
          isPublic: (board as { isPublic?: boolean })?.isPublic ?? false,
          sendSlackUpdates: (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true,
        });
        setBoardSettingsDialog(false);
      }
    } catch (e) {
      console.error("Error updating board settings:", e);
    }
  };

  const handleCopyPublicUrl = async () => {
    const publicUrl = `${window.location.origin}/public/boards/${boardId}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublicUrl(true);
      setTimeout(() => setCopiedPublicUrl(false), 2000);
    } catch (e) {
      console.error("Failed to copy URL:", e);
    }
  };

  const handleDeleteBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/dashboard");
      } else {
        const errorData = await response.json();
        setErrorDialog({ open: true, title: "Failed to delete board", description: errorData.error || "Failed to delete board" });
      }
    } catch (e) {
      console.error("Error deleting board:", e);
      setErrorDialog({ open: true, title: "Failed to delete board", description: "Failed to delete board" });
    }
    setDeleteConfirmDialog(false);
  };

  if (userLoading || notesloading) return <FullPageLoader message="Loading board..." />;

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
        <div className="mx-2 flex flex-wrap sm:flex-nowrap justify-between items-center h-auto sm:h-16 p-2 sm:p-0">
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center sm:space-x-3 w-full sm:w-auto">
            {/* Brand */}
            <Link href="/dashboard" className="flex-shrink-0 pl-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                Gumboard <BetaBadge />
              </h1>
            </Link>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />
            {/* Board selector */}
            <div className="relative board-dropdown flex-1 mr-0 sm:flex-none">
              <Button
                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                className={`flex items-center justify-between ${
                  showBoardDropdown ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                } text-foreground dark:text-zinc-100 hover:text-foreground dark:hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-600 rounded-lg px-2 py-2 cursor-pointer w-full sm:w-auto`}
              >
                <div className="text-sm font-semibold">
                  {boardId === "all-notes" ? "All notes" : boardId === "archive" ? "Archive" : board?.name}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground dark:text-zinc-400" />
              </Button>

              {showBoardDropdown && (
                <div className="fixed sm:absolute left-0 mt-1 w-full sm:w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-100 dark:border-zinc-800 z-50 max-h-80 overflow-y-auto">
                  <div className="p-2 flex flex-col gap-1">
                    {allBoards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/boards/${b.id}`}
                        className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600  dark:hover:text-white ${
                          b.id === boardId ? "bg-zinc-100 dark:bg-zinc-800 font-semibold" : ""
                        }`}
                        onClick={() => setShowBoardDropdown(false)}
                      >
                        <div>{b.name}</div>
                      </Link>
                    ))}

                    {allBoards.length > 0 && <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />}

                    <Link
                      href="/boards/all-notes"
                      className={`rounded-lg font-medium block px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600 ${
                        boardId === "all-notes" ? "bg-zinc-100 dark:bg-zinc-800 font-semibold" : ""
                      }`}
                      onClick={() => setShowBoardDropdown(false)}
                    >
                      <div>All notes</div>
                    </Link>

                    <Link
                      href="/boards/archive"
                      className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600 ${
                        boardId === "archive" ? "bg-zinc-100 dark:bg-zinc-800 font-semibold" : ""
                      }`}
                      onClick={() => setShowBoardDropdown(false)}
                    >
                      <div>All archived</div>
                    </Link>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
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

                    {boardId !== "all-notes" && boardId !== "archive" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBoardSettings({
                            name: board?.name || "",
                            description: board?.description || "",
                            isPublic: (board as { isPublic?: boolean })?.isPublic ?? false,
                            sendSlackUpdates: (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true,
                          });
                          setBoardSettingsDialog(true);
                          setShowBoardDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="font-medium">Board settings</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />

            {/* Filters */}
            <div className="relative board-dropdown mr-0" data-slot="filter-popover">
              <FilterPopover
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onDateRangeChange={(startDate, endDate) => {
                  const next = { startDate, endDate };
                  setDateRange(next);
                  updateURL(undefined, next);
                }}
                selectedAuthor={selectedAuthor}
                authors={uniqueAuthors}
                onAuthorChange={(authorId) => {
                  setSelectedAuthor(authorId);
                  updateURL(undefined, undefined, authorId);
                }}
                className="w-fit"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center sm:space-x-3 w-full sm:w-auto gap-2 md:gap-0">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
              </div>
              <input
                aria-label="Search notes"
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-8 py-2 border border-zinc-100 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 dark:focus:ring-sky-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
              />
              {searchTerm && (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    updateURL("");
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              onClick={() => {
                if (boardId === "all-notes" && allBoards.length > 0) {
                  handleAddNote(allBoards[0].id);
                } else {
                  handleAddNote();
                }
              }}
              className="flex items-center justify-center text-white w-fit h-10 sm:w-auto sm:h-auto sm:space-x-2 bg-sky-600 hover:bg-sky-500 transition-all duration-200 cursor-pointer font-medium"
            >
              <span>Add note</span>
            </Button>

            <ProfileDropdown user={user} />
          </div>
        </div>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative w-full"
        style={{ height: boardHeight, minHeight: "calc(100vh - 64px)" }}
      >
        <div className="relative w-full h-full">
          {layoutNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note as Note}
              currentUser={user as User}
              onUpdate={handleUpdateNoteFromComponent}
              onDelete={handleDeleteNote}
              onArchive={boardId !== "archive" ? handleArchiveNote : undefined}
              onUnarchive={boardId === "archive" ? handleUnarchiveNote : undefined}
              showBoardName={boardId === "all-notes" || boardId === "archive"}
              className="shadow-md shadow-black/10"
              style={{
                position: "absolute",
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                padding: `${getResponsiveConfig().notePadding}px`,
                backgroundColor: resolvedTheme === "dark" ? "#18181B" : note.color,
              }}
            />
          ))}
        </div>

        {/* Empty state */}
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
                  <div>Author: {uniqueAuthors.find((a) => a.id === selectedAuthor)?.name || "Unknown"}</div>
                )}
                {(dateRange.startDate || dateRange.endDate) && (
                  <div>
                    Date range: {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : "..."} -{" "}
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
                variant="outline"
                className="flex items-center space-x-2 cursor-pointer"
              >
                <span>Clear All Filters</span>
              </Button>
            </div>
          )}
      </div>

      {/* Modals */}
      {showAddBoard && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/40 dark:bg-black/70 backdrop-blur-sm add-board-modal"
          onClick={() => {
            setShowAddBoard(false);
            setNewBoardName("");
            setNewBoardDescription("");
          }}
        >
          <div
            className="bg-white dark:bg-zinc-950 bg-opacity-95 dark:bg-opacity-95 rounded-xl p-5 sm:p-7 w-full max-w-sm sm:max-w-md shadow-2xl border border-gray-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create new board</h3>
            <form onSubmit={handleAddBoard}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Board name</label>
                  <Input
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Enter board name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <Input
                    type="text"
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    placeholder="Enter board description"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddBoard(false);
                    setNewBoardName("");
                    setNewBoardDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-zinc-100">
                  Create board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ open, title: "", description: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, title: "", description: "" })}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={boardSettingsDialog} onOpenChange={setBoardSettingsDialog}>
        <AlertDialogContent className="p-4 lg:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Board settings</AlertDialogTitle>
            <AlertDialogDescription>Configure settings for &quot;{board?.name}&quot; board.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Board name</label>
              <Input
                type="text"
                value={boardSettings.name}
                onChange={(e) => setBoardSettings((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter board name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Input
                type="text"
                value={boardSettings.description}
                onChange={(e) => setBoardSettings((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter board description"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPublic"
                  checked={boardSettings.isPublic}
                  onCheckedChange={(checked) => setBoardSettings((prev) => ({ ...prev, isPublic: checked as boolean }))}
                />
                <label htmlFor="isPublic" className="text-sm font-medium leading-none">
                  Make board public
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-6">When enabled, anyone with the link can view this board</p>

              {boardSettings.isPublic && (
                <div className="ml-6 p-3 bg-gray-50 dark:bg-zinc-800 rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Public link</p>
                      <p className="text-xs break-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/public/boards/${boardId}` : ""}
                      </p>
                    </div>
                    <Button onClick={handleCopyPublicUrl} size="sm" variant="outline" className="ml-3 flex items-center space-x-1">
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
                className="mt-1"
              />
              <label htmlFor="sendSlackUpdates" className="text-sm font-medium leading-none">
                Send updates to Slack
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              When enabled, note updates will be sent to your organization&apos;s Slack channel
            </p>
          </div>

          <AlertDialogFooter className="flex !flex-row justify-between">
            <Button onClick={() => setDeleteConfirmDialog(true)} variant="destructive" className="mr-auto">
              <Trash2 className="w-4 h-4" />
              Delete <span className="hidden lg:inline">Board</span>
            </Button>
            <div className="flex space-x-2 items-center">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUpdateBoardSettings(boardSettings)}>Save settings</AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{board?.name}&quot;? This action cannot be undone and will permanently
              delete all notes in this board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBoard} className="bg-red-600 hover:bg-red-700">
              Delete Board
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
