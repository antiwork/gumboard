"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
// Use shared types from components
import type { Note, Board, User } from "@/components/note";
import { useTheme } from "next-themes";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { toast } from "sonner";

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const { resolvedTheme } = useTheme();
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Inline editing state removed; handled within Note component
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
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
  const [addingChecklistItem, setAddingChecklistItem] = useState<string | null>(null);
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

  // Update URL with current filter state
  const updateURL = (
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
  };

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

  // Enhanced responsive grid configuration
  const getResponsiveConfig = () => {
    if (typeof window === "undefined")
      return {
        noteWidth: 320,
        gridGap: 20,
        containerPadding: 20,
        notePadding: 16,
      };

    const width = window.innerWidth;

    // Ultra-wide screens (1920px+)
    if (width >= 1920) {
      return {
        noteWidth: 340,
        gridGap: 24,
        containerPadding: 32,
        notePadding: 18,
      };
    }
    // Large desktop (1200px-1919px)
    else if (width >= 1200) {
      return {
        noteWidth: 320,
        gridGap: 20,
        containerPadding: 24,
        notePadding: 16,
      };
    }
    // Medium desktop/laptop (768px-1199px)
    else if (width >= 768) {
      return {
        noteWidth: 300,
        gridGap: 16,
        containerPadding: 20,
        notePadding: 16,
      };
    }
    // Small tablet (600px-767px)
    else if (width >= 600) {
      return {
        noteWidth: 280,
        gridGap: 16,
        containerPadding: 16,
        notePadding: 14,
      };
    }
    // Mobile (less than 600px)
    else {
      return {
        noteWidth: 260,
        gridGap: 12,
        containerPadding: 12,
        notePadding: 12,
      };
    }
  };

  // Helper function to calculate note height based on content
  const calculateNoteHeight = (note: Note, noteWidth?: number, notePadding?: number) => {
    const config = getResponsiveConfig();
    const actualNotePadding = notePadding || config.notePadding;

    const headerHeight = 60; // User info header + margins
    const paddingHeight = actualNotePadding * 2; // Top and bottom padding
    const minContentHeight = 60; // Minimum content area

    // All notes now use checklist items - calculate height based on number of items
    const itemHeight = 32; // Use 32px for textarea-based items (slightly larger than main's 28px)
    const itemSpacing = 4; // Space between items (space-y-1 = 4px)
    const checklistItemsCount = note.checklistItems?.length || 0;
    const addingItemHeight = addingChecklistItem === note.id ? 32 : 0; // Add height for input field
    const addTaskButtonHeight = 36; // Height for the "Add task" button including margin

    const checklistHeight =
      checklistItemsCount * itemHeight +
      (checklistItemsCount > 0 ? (checklistItemsCount - 1) * itemSpacing : 0) +
      addingItemHeight;
    const totalChecklistHeight = Math.max(minContentHeight, checklistHeight);

    return headerHeight + paddingHeight + totalChecklistHeight + addTaskButtonHeight;
  };

  // Helper function to calculate bin-packed layout for desktop
  const calculateGridLayout = () => {
    if (typeof window === "undefined") return [];

    const config = getResponsiveConfig();
    const containerWidth = window.innerWidth - config.containerPadding * 2;
    const noteWidthWithGap = config.noteWidth + config.gridGap;
    const columnsCount = Math.floor((containerWidth + config.gridGap) / noteWidthWithGap);
    const actualColumnsCount = Math.max(1, columnsCount);

    // Calculate the actual available width and adjust note width to fill better
    const availableWidthForNotes = containerWidth - (actualColumnsCount - 1) * config.gridGap;
    const calculatedNoteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);
    // Ensure notes don't get too narrow or too wide based on screen size
    const minWidth = config.noteWidth - 40;
    const maxWidth = config.noteWidth + 80;
    const adjustedNoteWidth = Math.max(minWidth, Math.min(maxWidth, calculatedNoteWidth));

    // Use full width with minimal left offset
    const offsetX = config.containerPadding;

    // Bin-packing algorithm: track the bottom Y position of each column
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(config.containerPadding);

    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(note, adjustedNoteWidth, config.notePadding);

      // Find the column with the lowest bottom position
      let bestColumn = 0;
      let minBottom = columnBottoms[0];

      for (let col = 1; col < actualColumnsCount; col++) {
        if (columnBottoms[col] < minBottom) {
          minBottom = columnBottoms[col];
          bestColumn = col;
        }
      }

      // Place the note in the best column
      const x = offsetX + bestColumn * (adjustedNoteWidth + config.gridGap);
      const y = columnBottoms[bestColumn];

      // Update the column bottom position
      columnBottoms[bestColumn] = y + noteHeight + config.gridGap;

      return {
        ...note,
        x,
        y,
        width: adjustedNoteWidth,
        height: noteHeight,
      };
    });
  };

  // Helper function to calculate mobile layout (optimized single/double column)
  const calculateMobileLayout = () => {
    if (typeof window === "undefined") return [];

    const config = getResponsiveConfig();
    const containerWidth = window.innerWidth - config.containerPadding * 2;
    const minNoteWidth = config.noteWidth - 20; // Slightly smaller minimum for mobile
    const columnsCount = Math.floor(
      (containerWidth + config.gridGap) / (minNoteWidth + config.gridGap)
    );
    const actualColumnsCount = Math.max(1, columnsCount);

    // Calculate note width for mobile
    const availableWidthForNotes = containerWidth - (actualColumnsCount - 1) * config.gridGap;
    const noteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);

    // Bin-packing for mobile with fewer columns
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(config.containerPadding);

    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(note, noteWidth, config.notePadding);

      // Find the column with the lowest bottom position
      let bestColumn = 0;
      let minBottom = columnBottoms[0];

      for (let col = 1; col < actualColumnsCount; col++) {
        if (columnBottoms[col] < minBottom) {
          minBottom = columnBottoms[col];
          bestColumn = col;
        }
      }

      // Place the note in the best column
      const x = config.containerPadding + bestColumn * (noteWidth + config.gridGap);
      const y = columnBottoms[bestColumn];

      // Update the column bottom position
      columnBottoms[bestColumn] = y + noteHeight + config.gridGap;

      return {
        ...note,
        x,
        y,
        width: noteWidth,
        height: noteHeight,
      };
    });
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

  // Close dropdowns when clicking outside and handle escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBoardDropdown || showAddBoard) {
        const target = event.target as Element;
        if (
          !target.closest(".board-dropdown") &&
          !target.closest(".user-dropdown") &&
          !target.closest(".add-board-modal")
        ) {
          setShowBoardDropdown(false);
          setShowAddBoard(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (addingChecklistItem) {
          setAddingChecklistItem(null);
        }
        if (showBoardDropdown) {
          setShowBoardDropdown(false);
        }
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

  // Removed debounce cleanup effect; editing is scoped to Note

  // Enhanced responsive handling with debounced resize and better breakpoints
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const checkResponsive = () => {
      if (typeof window !== "undefined") {
        const width = window.innerWidth;
        setIsMobile(width < 768); // Tablet breakpoint

        // Force re-render of notes layout after screen size change
        // This ensures notes are properly repositioned
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          // Trigger a state update to force re-calculation of note positions
          setNotes((prevNotes) => [...prevNotes]);
        }, 50); // Debounce resize events - reduced for real-time feel
      }
    };

    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => {
      window.removeEventListener("resize", checkResponsive);
      clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      updateURL(searchTerm);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get unique authors from notes
  const getUniqueAuthors = (notes: Note[]) => {
    const authorsMap = new Map<string, { id: string; name: string; email: string }>();

    notes.forEach((note) => {
      if (!authorsMap.has(note.user.id)) {
        authorsMap.set(note.user.id, {
          id: note.user.id,
          name: note.user.name || note.user.email.split("@")[0],
          email: note.user.email,
        });
      }
    });

    return Array.from(authorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Filter notes based on search term, date range, and author
  const filterAndSortNotes = (
    notes: Note[],
    searchTerm: string,
    dateRange: { startDate: Date | null; endDate: Date | null },
    authorId: string | null,
    currentUser: User | null
  ): Note[] => {
    let filteredNotes = notes;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredNotes = filteredNotes.filter((note) => {
        const authorName = (note.user.name || note.user.email).toLowerCase();
        // Search in checklist items content
        const checklistContent =
          note.checklistItems?.map((item) => item.content.toLowerCase()).join(" ") || "";
        return authorName.includes(search) || checklistContent.includes(search);
      });
    }

    // Filter by author
    if (authorId) {
      filteredNotes = filteredNotes.filter((note) => note.user.id === authorId);
    }

    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filteredNotes = filteredNotes.filter((note) => {
        const noteDate = new Date(note.createdAt);
        const startOfDay = (date: Date) =>
          new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = (date: Date) =>
          new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

        if (dateRange.startDate && dateRange.endDate) {
          return (
            noteDate >= startOfDay(dateRange.startDate) && noteDate <= endOfDay(dateRange.endDate)
          );
        } else if (dateRange.startDate) {
          return noteDate >= startOfDay(dateRange.startDate);
        } else if (dateRange.endDate) {
          return noteDate <= endOfDay(dateRange.endDate);
        }
        return true;
      });
    }

    // Sort notes with user priority (current user's notes first) and then by creation date (newest first)
    filteredNotes.sort((a, b) => {
      // First priority: logged-in user's notes come first
      if (currentUser) {
        const aIsCurrentUser = a.user.id === currentUser.id;
        const bIsCurrentUser = b.user.id === currentUser.id;

        if (aIsCurrentUser && !bIsCurrentUser) {
          return -1; // a (current user's note) comes first
        }
        if (!aIsCurrentUser && bIsCurrentUser) {
          return 1; // b (current user's note) comes first
        }
      }

      // Third priority: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filteredNotes;
  };

  // Get unique authors for dropdown
  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);

  // Get filtered and sorted notes for display
  const filteredNotes = useMemo(
    () => filterAndSortNotes(notes, debouncedSearchTerm, dateRange, selectedAuthor, user),
    [notes, debouncedSearchTerm, dateRange, selectedAuthor, user]
  );
  const layoutNotes = useMemo(
    () => (isMobile ? calculateMobileLayout() : calculateGridLayout()),
    [isMobile, calculateMobileLayout, calculateGridLayout]
  );

  const boardHeight = useMemo(() => {
    if (layoutNotes.length === 0) {
      return "calc(100vh - 64px)";
    }
    const maxBottom = Math.max(...layoutNotes.map((note) => note.y + note.height));
    const minHeight = typeof window !== "undefined" && window.innerWidth < 768 ? 500 : 600;
    const calculatedHeight = Math.max(minHeight, maxBottom + 100);
    return `${calculatedHeight}px`;
  }, [layoutNotes]);

  const fetchBoardData = async () => {
    try {
      // Get user info first to check authentication
      const userResponse = await fetch("/api/user");
      if (userResponse.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

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

        // Set virtual board immediately
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
      setLoading(false);
    }
  };

  // Adapter: bridge component Note -> existing update handler
  const handleUpdateNoteFromComponent = async (updatedNote: Note) => {
    // Find the note to get its board ID for all notes view
    const currentNote = notes.find((n) => n.id === updatedNote.id);
    if (!currentNote) return;

    // OPTIMISTIC UPDATE: Update UI immediately
    setNotes(notes.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
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
        setNotes([...notes, note]);
        setAddingChecklistItem(note.id);
      }
    } catch (error) {
      console.error("Error creating note:", error);
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

  const handleArchiveNote = async (noteId: string) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote) return;

      const targetBoardId = currentNote?.board?.id ?? currentNote.boardId;

      setNotes(notes.filter((n) => n.id !== noteId));

      const response = await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: new Date().toISOString() }),
      });

      if (!response.ok) {
        // Revert on error
        setNotes([...notes, currentNote]);
        setErrorDialog({
          open: true,
          title: "Archive Failed",
          description: "Failed to archive note. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error archiving note:", error);
    }
  };
  const handleUnarchiveNote = async (noteId: string) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote) return;

      const targetBoardId = currentNote.board?.id ?? currentNote.boardId;
      if (!targetBoardId) return;

      setNotes(notes.filter((n) => n.id !== noteId));

      const response = await fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivedAt: null }),
      });

      if (!response.ok) {
        setNotes([...notes, currentNote]);
        setErrorDialog({
          open: true,
          title: "Unarchive Failed",
          description: "Failed to unarchive note. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error unarchiving note:", error);
    }
  };

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
        }),
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

  if (loading) {
    return <FullPageLoader message="Loading board..." />;
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
        <div className="mx-2 flex flex-wrap sm:flex-nowrap justify-between items-center h-auto sm:h-16 p-2 sm:p-0">
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center sm:space-x-3 w-full sm:w-auto">
            {/* Company Name */}
            <Link href="/dashboard" className="flex-shrink-0 pl-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                Gumboard
                <BetaBadge />
              </h1>
            </Link>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />
            {/* Board Selector Dropdown */}
            <div className="relative board-dropdown flex-1 mr-0 sm:flex-none">
              <Button
                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                className={`flex items-center justify-between ${showBoardDropdown ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"} text-foreground dark:text-zinc-100 hover:text-foreground dark:hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-600 rounded-lg px-2 py-2 cursor-pointer w-full sm:w-auto`}
              >
                <div>
                  <div className="text-sm font-semibold text-foreground dark:text-zinc-100">
                    {boardId === "all-notes"
                      ? "All notes"
                      : boardId === "archive"
                        ? "Archive"
                        : board?.name}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground dark:text-zinc-400 transition-transform }`}
                />
              </Button>

              {showBoardDropdown && (
                <div className="fixed sm:absolute left-0 mt-1 w-full sm:w-64 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-100 dark:border-zinc-800 z-50 max-h-80 overflow-y-auto">
                  <div className="p-2 flex flex-col gap-1">
                    {/* Boards */}
                    {allBoards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/boards/${b.id}`}
                        className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600  dark:hover:text-white ${
                          b.id === boardId
                            ? "bg-zinc-100 dark:bg-zinc-800 text-foreground dark:text-zinc-100 font-semibold"
                            : "text-foreground dark:text-zinc-100"
                        }`}
                        onClick={() => setShowBoardDropdown(false)}
                      >
                        <div>{b.name}</div>
                      </Link>
                    ))}

                    {allBoards.length > 0 && (
                      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>
                    )}

                    {/* All Notes Option */}
                    <Link
                      href="/boards/all-notes"
                      className={`rounded-lg font-medium block px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600 ${
                        boardId === "all-notes"
                          ? "bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold"
                          : "text-foreground dark:text-white"
                      }`}
                      onClick={() => setShowBoardDropdown(false)}
                    >
                      <div>All notes</div>
                    </Link>

                    {/* Archive Option */}
                    <Link
                      href="/boards/archive"
                      className={`rounded-lg block font-medium px-3 py-1.5 text-sm hover:text-white hover:bg-sky-600 dark:hover:bg-sky-600 ${
                        boardId === "archive"
                          ? "bg-zinc-100 dark:bg-zinc-800 dark:text-white font-semibold"
                          : "text-foreground dark:text-white"
                      }`}
                      onClick={() => setShowBoardDropdown(false)}
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
                    {boardId !== "all-notes" && boardId !== "archive" && (
                      <Button
                        variant="outline"
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

            {/* Filter Popover */}
            <div className="relative board-dropdown mr-0">
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
                className="w-fit"
              />
            </div>
          </div>

          {/* Right side - Search, Add Note and User dropdown */}
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center sm:space-x-3 w-full sm:w-auto gap-2 md:gap-0">
            {/* Search Box */}
            <div className="relative flex-1 sm:flex-none min-w-[150px]">
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
                className="w-full sm:w-64 pl-10 pr-8 py-2 border border-zinc-100 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-600 dark:focus:ring-sky-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
              />
              {searchTerm && (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    updateURL("");
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-100 cursor-pointer"
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

            {/* User Dropdown */}
            <ProfileDropdown user={user} />
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div
        ref={boardRef}
        className="relative w-full"
        style={{
          height: boardHeight,
          minHeight: "calc(100vh - 64px)", // Account for header height
        }}
      >
        {/* Notes */}
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

        {/* Empty State */}
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
                variant="outline"
                className="flex items-center space-x-2 cursor-pointer"
              >
                <span>Clear All Filters</span>
              </Button>
            </div>
          )}
      </div>

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
            <h3 className="text-lg font-semibold mb-4 text-foreground dark:text-zinc-100">
              Create new board
            </h3>
            <form onSubmit={handleAddBoard}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                    Board name
                  </label>
                  <Input
                    type="text"
                    value={newBoardName}
                    onChange={(e) => setNewBoardName(e.target.value)}
                    placeholder="Enter board name"
                    required
                    className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                    Description (optional)
                  </label>
                  <Input
                    type="text"
                    value={newBoardDescription}
                    onChange={(e) => setNewBoardDescription(e.target.value)}
                    placeholder="Enter board description"
                    className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
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
                  className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-zinc-100 dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-zinc-100"
                >
                  Create board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
          <AlertDialogHeader>
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
                className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-zinc-200 mb-1">
                Description (optional)
              </label>
              <Input
                type="text"
                value={boardSettings.description}
                onChange={(e) =>
                  setBoardSettings((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter board description"
                className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-gray-200 dark:border-zinc-700"
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

          <AlertDialogFooter className="flex justify-between">
            <Button
              onClick={() => setDeleteConfirmDialog(true)}
              variant="destructive"
              className="mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Board
            </Button>
            <div className="flex space-x-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleUpdateBoardSettings(boardSettings)}>
                Save settings
              </AlertDialogAction>
            </div>
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
