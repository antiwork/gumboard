"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { FullPageLoader } from "@/components/ui/loader";
import { FilterPopover } from "@/components/ui/filter-popover";
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
import { cn } from "@/lib/utils";

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
}

interface Board {
  id: string;
  name: string;
  description: string | null;
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

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [boardId, setBoardId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [showDoneNotes, setShowDoneNotes] = useState(true);
  const [addingChecklistItem, setAddingChecklistItem] = useState<string | null>(
    null
  );
  const [newChecklistItemContent, setNewChecklistItemContent] = useState("");
  const [editingChecklistItem, setEditingChecklistItem] = useState<{
    noteId: string;
    itemId: string;
  } | null>(null);
  const [editingChecklistItemContent, setEditingChecklistItemContent] =
    useState("");
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [deleteNoteDialog, setDeleteNoteDialog] = useState<{
    open: boolean;
    noteId: string;
  }>({ open: false, noteId: "" });
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });
  const [boardSettingsDialog, setBoardSettingsDialog] = useState(false);
  const [boardSettings, setBoardSettings] = useState({ sendSlackUpdates: true });
  const boardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Update URL with current filter state
  const updateURL = (
    newSearchTerm?: string,
    newDateRange?: { startDate: Date | null; endDate: Date | null },
    newAuthor?: string | null,
    newShowDone?: boolean
  ) => {
    const params = new URLSearchParams();

    const currentSearchTerm =
      newSearchTerm !== undefined ? newSearchTerm : searchTerm;
    const currentDateRange =
      newDateRange !== undefined ? newDateRange : dateRange;
    const currentAuthor = newAuthor !== undefined ? newAuthor : selectedAuthor;
    const currentShowDone =
      newShowDone !== undefined ? newShowDone : showDoneNotes;

    if (currentSearchTerm) {
      params.set("search", currentSearchTerm);
    }

    if (currentDateRange.startDate) {
      params.set(
        "startDate",
        currentDateRange.startDate.toISOString().split("T")[0]
      );
    }

    if (currentDateRange.endDate) {
      params.set(
        "endDate",
        currentDateRange.endDate.toISOString().split("T")[0]
      );
    }

    if (currentAuthor) {
      params.set("author", currentAuthor);
    }

    if (!currentShowDone) {
      // Only add if not default (true)
      params.set("showDone", "false");
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
    const urlShowDone = searchParams.get("showDone");

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
    // Default to true if not specified, otherwise parse the boolean
    setShowDoneNotes(urlShowDone === null ? true : urlShowDone === "true");
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
  const calculateNoteHeight = (
    note: Note,
    noteWidth?: number,
    notePadding?: number
  ) => {
    const config = getResponsiveConfig();
    const actualNotePadding = notePadding || config.notePadding;
    const actualNoteWidth = noteWidth || config.noteWidth;

    const headerHeight = 76; // User info header + margins (more accurate)
    const paddingHeight = actualNotePadding * 2; // Top and bottom padding
    const minContentHeight = 84; // Minimum content area (3 lines)

    if (note.checklistItems) {
      // For checklist items, calculate height based on number of items
      const itemHeight = 32; // Each checklist item is about 32px tall (text + padding)
      const itemSpacing = 8; // Space between items
      const checklistItemsCount = note.checklistItems.length;
      const addingItemHeight = addingChecklistItem === note.id ? 32 : 0; // Add height for input field

      const checklistHeight =
        checklistItemsCount * itemHeight +
        (checklistItemsCount - 1) * itemSpacing +
        addingItemHeight;
      const totalChecklistHeight = Math.max(minContentHeight, checklistHeight);

      return headerHeight + paddingHeight + totalChecklistHeight + 40; // Extra space for + button
    } else {
      // Original logic for regular notes
      const lines = note.content.split("\n");

      // Estimate character width and calculate text wrapping
      const avgCharWidth = 9; // Average character width in pixels
      const contentWidth = actualNoteWidth - actualNotePadding * 2 - 16; // Note width minus padding and margins
      const charsPerLine = Math.floor(contentWidth / avgCharWidth);

      // Calculate total lines including wrapped text
      let totalLines = 0;
      lines.forEach((line) => {
        if (line.length === 0) {
          totalLines += 1; // Empty line
        } else {
          const wrappedLines = Math.ceil(line.length / charsPerLine);
          totalLines += Math.max(1, wrappedLines);
        }
      });

      // Ensure minimum content
      totalLines = Math.max(3, totalLines);

      // Calculate based on actual text content with wrapping
      const lineHeight = 28; // Line height for readability (leading-7)
      const contentHeight = totalLines * lineHeight;

      return (
        headerHeight + paddingHeight + Math.max(minContentHeight, contentHeight)
      );
    }
  };

  // Helper function to calculate bin-packed layout for desktop
  const calculateGridLayout = () => {
    if (typeof window === "undefined") return [];

    const config = getResponsiveConfig();
    const containerWidth = window.innerWidth - config.containerPadding * 2;
    const noteWidthWithGap = config.noteWidth + config.gridGap;
    const columnsCount = Math.floor(
      (containerWidth + config.gridGap) / noteWidthWithGap
    );
    const actualColumnsCount = Math.max(1, columnsCount);

    // Calculate the actual available width and adjust note width to fill better
    const availableWidthForNotes =
      containerWidth - (actualColumnsCount - 1) * config.gridGap;
    const calculatedNoteWidth = Math.floor(
      availableWidthForNotes / actualColumnsCount
    );
    // Ensure notes don't get too narrow or too wide based on screen size
    const minWidth = config.noteWidth - 40;
    const maxWidth = config.noteWidth + 80;
    const adjustedNoteWidth = Math.max(
      minWidth,
      Math.min(maxWidth, calculatedNoteWidth)
    );

    // Use full width with minimal left offset
    const offsetX = config.containerPadding;

    // Bin-packing algorithm: track the bottom Y position of each column
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(
      config.containerPadding
    );

    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(
        note,
        adjustedNoteWidth,
        config.notePadding
      );

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
    const availableWidthForNotes =
      containerWidth - (actualColumnsCount - 1) * config.gridGap;
    const noteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);

    // Bin-packing for mobile with fewer columns
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(
      config.containerPadding
    );

    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(
        note,
        noteWidth,
        config.notePadding
      );

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
      const x =
        config.containerPadding + bestColumn * (noteWidth + config.gridGap);
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
      if (showBoardDropdown || showUserDropdown || showAddBoard) {
        const target = event.target as Element;
        if (
          !target.closest(".board-dropdown") &&
          !target.closest(".user-dropdown") &&
          !target.closest(".add-board-modal")
        ) {
          setShowBoardDropdown(false);
          setShowUserDropdown(false);
          setShowAddBoard(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingNote) {
          setEditingNote(null);
          setEditContent("");
        }
        if (addingChecklistItem) {
          setAddingChecklistItem(null);
          setNewChecklistItemContent("");
        }
        if (editingChecklistItem) {
          setEditingChecklistItem(null);
          setEditingChecklistItemContent("");
        }
        if (showBoardDropdown) {
          setShowBoardDropdown(false);
        }
        if (showUserDropdown) {
          setShowUserDropdown(false);
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
  }, [
    showBoardDropdown,
    showUserDropdown,
    showAddBoard,
    editingNote,
    addingChecklistItem,
    editingChecklistItem,
  ]);

  useEffect(() => {
    if (!editingChecklistItem) {
      // Clear all pending timeouts when exiting edit mode
      editDebounceMap.current.forEach((timeout) => clearTimeout(timeout));
      editDebounceMap.current.clear();
    }
  }, [editingChecklistItem]);

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

  // Get unique authors from notes
  const getUniqueAuthors = (notes: Note[]) => {
    const authorsMap = new Map<
      string,
      { id: string; name: string; email: string }
    >();

    notes.forEach((note) => {
      if (!authorsMap.has(note.user.id)) {
        authorsMap.set(note.user.id, {
          id: note.user.id,
          name: note.user.name || note.user.email.split("@")[0],
          email: note.user.email,
        });
      }
    });

    return Array.from(authorsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  };

  // Filter notes based on search term, date range, author, and done status
  const filterAndSortNotes = (
    notes: Note[],
    searchTerm: string,
    dateRange: { startDate: Date | null; endDate: Date | null },
    authorId: string | null,
    showDone: boolean,
    currentUser: User | null
  ): Note[] => {
    let filteredNotes = notes;

    // Filter by done status
    if (!showDone) {
      filteredNotes = filteredNotes.filter((note) => !note.done);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredNotes = filteredNotes.filter((note) => {
        const authorName = (note.user.name || note.user.email).toLowerCase();
        const noteContent = note.content.toLowerCase();
        return authorName.includes(search) || noteContent.includes(search);
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
          new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            23,
            59,
            59,
            999
          );

        if (dateRange.startDate && dateRange.endDate) {
          return (
            noteDate >= startOfDay(dateRange.startDate) &&
            noteDate <= endOfDay(dateRange.endDate)
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

      // Second priority: done status (undone notes first) if showing done notes
      if (showDone && a.done !== b.done) {
        return a.done ? 1 : -1; // Undone notes (false) come first
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
    () =>
      filterAndSortNotes(
        notes,
        searchTerm,
        dateRange,
        selectedAuthor,
        showDoneNotes,
        user
      ),
    [notes, searchTerm, dateRange, selectedAuthor, showDoneNotes, user]
  );
  const layoutNotes = useMemo(
    () => (isMobile ? calculateMobileLayout() : calculateGridLayout()),
    [isMobile, filteredNotes, calculateMobileLayout, calculateGridLayout]
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
      const allBoardsResponse = await fetch("/api/boards");
      if (allBoardsResponse.ok) {
        const { boards } = await allBoardsResponse.json();
        setAllBoards(boards);
      }

      if (boardId === "all-notes") {
        // For all notes view, create a virtual board object and fetch all notes
        setBoard({
          id: "all-notes",
          name: "All notes",
          description: "Notes from all boards",
        });

        // Fetch notes from all boards
        const notesResponse = await fetch(`/api/boards/all-notes/notes`);
        if (notesResponse.ok) {
          const { notes } = await notesResponse.json();
          setNotes(notes);
        }
      } else {
        // Fetch current board info
        const boardResponse = await fetch(`/api/boards/${boardId}`);
        if (boardResponse.status === 401) {
          router.push("/auth/signin");
          return;
        }
        if (boardResponse.ok) {
          const { board } = await boardResponse.json();
          setBoard(board);
          setBoardSettings({ sendSlackUpdates: (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true });
        }

        // Fetch notes for specific board
        const notesResponse = await fetch(`/api/boards/${boardId}/notes`);
        if (notesResponse.ok) {
          const { notes } = await notesResponse.json();
          setNotes(notes);
        }
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
      const actualTargetBoardId =
        boardId === "all-notes" ? targetBoardId : boardId;
      const isAllNotesView = boardId === "all-notes";

      const response = await fetch(
        `/api/boards/${isAllNotesView ? "all-notes" : actualTargetBoardId}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: "",
            checklistItems: [],
            ...(isAllNotesView && { boardId: targetBoardId }),
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes([...notes, note]);
        setAddingChecklistItem(note.id);
        setNewChecklistItemContent("");
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      // Find the note to get its board ID for all notes view
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote) return;
      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      // Store original content for potential rollback
      const originalContent = currentNote.content;

      // OPTIMISTIC UPDATE: Update UI immediately
      const optimisticNote = {
        ...currentNote,
        content: content,
      };

      setNotes(notes.map((n) => (n.id === noteId ? optimisticNote : n)));
      setEditingNote(null);
      setEditContent("");

      // Send to server in background
      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        }
      );

      if (response.ok) {
        // Server succeeded, confirm with actual server response
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
      } else {
        // Server failed, revert to original content
        console.error("Server error, reverting optimistic update");
        const revertedNote = { ...currentNote, content: originalContent };
        setNotes(notes.map((n) => (n.id === noteId ? revertedNote : n)));
        
        // Re-enable editing with original content
        setEditingNote(noteId);
        setEditContent(originalContent);

        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update note",
          description: errorData.error || "Failed to update note",
        });
      }
    } catch (error) {
      console.error("Error updating note:", error);
      
      // Revert optimistic update on network error
      const currentNote = notes.find((n) => n.id === noteId);
      if (currentNote) {
        // We need to restore the original content, but we've lost it
        // In a more robust implementation, we'd store it in state
        setEditingNote(noteId);
        setEditContent(currentNote.content); // Use current content as fallback
      }
      
      setErrorDialog({
        open: true,
        title: "Connection Error", 
        description: "Failed to save note. Please try again.",
      });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setDeleteNoteDialog({
      open: true,
      noteId,
    });
  };

  const confirmDeleteNote = async () => {
    try {
      // Find the note to get its board ID for all notes view
      const currentNote = notes.find((n) => n.id === deleteNoteDialog.noteId);
      const targetBoardId =
        boardId === "all-notes" && currentNote?.board?.id
          ? currentNote.board.id
          : boardId;

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${deleteNoteDialog.noteId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== deleteNoteDialog.noteId));
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to delete note",
          description: errorData.error || "Failed to delete note",
        });
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      setErrorDialog({
        open: true,
        title: "Failed to delete note",
        description: "Failed to delete note",
      });
    }
  };


  const handleSignOut = async () => {
    await signOut();
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

  const handleUpdateBoardSettings = async (settings: { sendSlackUpdates: boolean }) => {
    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const { board } = await response.json();
        setBoard(board);
        setBoardSettings({ sendSlackUpdates: board.sendSlackUpdates });
        setBoardSettingsDialog(false);
      }
    } catch (error) {
      console.error("Error updating board settings:", error);
    }
  };

  const handleAddChecklistItem = async (noteId: string) => {
    if (!newChecklistItemContent.trim()) return;

    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote) return;

      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      const newItem: ChecklistItem = {
        id: `item-${Date.now()}`,
        content: newChecklistItemContent,
        checked: false,
        order: (currentNote.checklistItems || []).length,
      };

      const updatedItems = [...(currentNote.checklistItems || []), newItem];

      // Check if all items are checked to mark note as done
      const allItemsChecked = updatedItems.every((item) => item.checked);

      // OPTIMISTIC UPDATE
      const optimisticNote = {
        ...currentNote,
        checklistItems: updatedItems,
        done: allItemsChecked,
      };

      setNotes(notes.map((n) => (n.id === noteId ? optimisticNote : n)));
      setNewChecklistItemContent("");
    
      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
            done: allItemsChecked,
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setNewChecklistItemContent("");
      } else {
        setNotes(notes.map((n) => (n.id === noteId ? currentNote : n)));
        setAddingChecklistItem(noteId);
        setNewChecklistItemContent(newItem.content);

        setErrorDialog({
          open: true,
          title: "Failed to Add Item",
          description: "Failed to add checklist item. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      
      // Revert optimistic update on network error
      const currentNote = notes.find((n) => n.id === noteId);
      if (currentNote) {
        setNotes(notes.map((n) => (n.id === noteId ? currentNote : n)));
        // Re-enable adding state for retry
        setAddingChecklistItem(noteId);
        setNewChecklistItemContent(newChecklistItemContent);
      }
      
      setErrorDialog({
        open: true,
        title: "Connection Error",
        description: "Failed to add item. Please check your connection.",
      });
    }
  };

  const handleToggleChecklistItem = async (noteId: string, itemId: string) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote || !currentNote.checklistItems) return;

      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      // OPTIMISTIC UPDATE
      const updatedItems = currentNote.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );

      const sortedItems = [
        ...updatedItems
          .filter((item) => !item.checked)
          .sort((a, b) => a.order - b.order),
        ...updatedItems
          .filter((item) => item.checked)
          .sort((a, b) => a.order - b.order),
      ];

      const allItemsChecked = sortedItems.every((item) => item.checked);

      // OPTIMISTIC UPDATE
      const optimisticNote = {
        ...currentNote,
        checklistItems: sortedItems,
        done: allItemsChecked,
      };

      setNotes(notes.map((n) => (n.id === noteId ? optimisticNote : n)));

      setAnimatingItems((prev) => new Set([...prev, itemId]));

      setTimeout(() => {
        setAnimatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 200);

      // Send to server in background
      fetch(`/api/boards/${targetBoardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: sortedItems,
          done: allItemsChecked,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            console.error("Server error, reverting optimistic update");
            setNotes(notes.map((n) => (n.id === noteId ? currentNote : n)));
            
            setErrorDialog({
              open: true,
              title: "Update Failed",
              description: "Failed to update checklist item. Please try again.",
            });
          } else {
            const { note } = await response.json();
            setNotes(notes.map((n) => (n.id === noteId ? note : n)));
          }
        })
        .catch((error) => {
          console.error("Error toggling checklist item:", error);
          setNotes(notes.map((n) => (n.id === noteId ? currentNote : n)));
          
          setErrorDialog({
            open: true,
            title: "Connection Error",
            description: "Failed to sync changes. Please check your connection.",
          });
        });
    } catch (error) {
      console.error("Error toggling checklist item:", error);
    }
  };

  const handleDeleteChecklistItem = async (noteId: string, itemId: string) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote || !currentNote.checklistItems) return;

      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      // Store the item being deleted for potential rollback
      const deletedItem = currentNote.checklistItems.find((item) => item.id === itemId);
      if (!deletedItem) return;

      const updatedItems = currentNote.checklistItems.filter(
        (item) => item.id !== itemId
      );

      // Check if all remaining items are checked to mark note as done
      const allItemsChecked =
        updatedItems.length > 0
          ? updatedItems.every((item) => item.checked)
          : false;

      // OPTIMISTIC UPDATE: Update UI immediately
      const optimisticNote = {
        ...currentNote,
        checklistItems: updatedItems,
        done: allItemsChecked,
      };

      setNotes(notes.map((n) => (n.id === noteId ? optimisticNote : n)));

      // Send to server in background
      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
            done: allItemsChecked,
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
      } else {
        console.error("Server error, reverting optimistic update");
        setNotes(notes.map((n) => (n.id === noteId ? currentNote : n)));

        setErrorDialog({
          open: true,
          title: "Failed to Delete Item",
          description: "Failed to delete checklist item. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      
      // Revert optimistic update on network error
      const currentNote = notes.find((n) => n.id === noteId);
      if (currentNote) {
        setNotes(notes.map((n) => (n.id === noteId ? currentNote : n)));
      }
      
      setErrorDialog({
        open: true,
        title: "Connection Error",
        description: "Failed to delete item. Please check your connection.",
      });
    }
  };

  const handleEditChecklistItem = useCallback(async (
    noteId: string,
    itemId: string,
    content: string
  ) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote || !currentNote.checklistItems) return;

      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      const updatedItems = currentNote.checklistItems.map((item) =>
        item.id === itemId ? { ...item, content } : item
      );

      // Check if all items are checked to mark note as done
      const allItemsChecked = updatedItems.every((item) => item.checked);

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: updatedItems,
            done: allItemsChecked,
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setEditingChecklistItem(null);
        setEditingChecklistItemContent("");
      }
    } catch (error) {
      console.error("Error editing checklist item:", error);
    }
  }, [notes]);

  const editDebounceMap = useRef(new Map<string, NodeJS.Timeout>());
  const EDIT_DEBOUNCE_DURATION = 1000;

  const debouncedEditChecklistItem = useCallback((
    noteId: string,
    itemId: string,
    content: string
  ) => {
    const key = `${noteId}-${itemId}`;
    
    const existingTimeout = editDebounceMap.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      handleEditChecklistItem(noteId, itemId, content);
      editDebounceMap.current.delete(key);
    }, EDIT_DEBOUNCE_DURATION);
    
    editDebounceMap.current.set(key, timeout);
  }, [handleEditChecklistItem, boardId]);

  const handleToggleAllChecklistItems = async (noteId: string) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote || !currentNote.checklistItems) return;

      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      // Check if all items are checked
      const allChecked = currentNote.checklistItems.every(
        (item) => item.checked
      );

      // Toggle all items to opposite state
      const updatedItems = currentNote.checklistItems.map((item) => ({
        ...item,
        checked: !allChecked,
      }));

      // Sort items: unchecked first, then checked
      const sortedItems = [
        ...updatedItems
          .filter((item) => !item.checked)
          .sort((a, b) => a.order - b.order),
        ...updatedItems
          .filter((item) => item.checked)
          .sort((a, b) => a.order - b.order),
      ];

      // The note should be marked as done if all items are checked
      const noteIsDone = !allChecked; // If all were checked before, we're unchecking them (note becomes undone)
      // If not all were checked before, we're checking them all (note becomes done)

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checklistItems: sortedItems,
            done: noteIsDone,
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
      }
    } catch (error) {
      console.error("Error toggling all checklist items:", error);
    }
  };

  const handleSplitChecklistItem = async (
    noteId: string,
    itemId: string,
    content: string,
    cursorPosition: number
  ) => {
    try {
      const currentNote = notes.find((n) => n.id === noteId);
      if (!currentNote || !currentNote.checklistItems) return;

      const targetBoardId =
        boardId === "all-notes" && currentNote.board?.id
          ? currentNote.board.id
          : boardId;

      const firstHalf = content.substring(0, cursorPosition).trim();
      const secondHalf = content.substring(cursorPosition).trim();

      // Update current item with first half
      const updatedItems = currentNote.checklistItems.map((item) =>
        item.id === itemId ? { ...item, content: firstHalf } : item
      );

      // Find the current item's order to insert new item after it
      const currentItem = currentNote.checklistItems.find(
        (item) => item.id === itemId
      );
      const currentOrder = currentItem?.order || 0;

      // Create new item with second half
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: secondHalf,
        checked: false,
        order: currentOrder + 0.5,
      };

      const allItems = [...updatedItems, newItem].sort(
        (a, b) => a.order - b.order
      );

      // Update the note with both changes
      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistItems: allItems,
          }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setEditingChecklistItem({ noteId, itemId: newItem.id });
        setEditingChecklistItemContent(secondHalf);
      }
    } catch (error) {
      console.error("Error splitting checklist item:", error);
    }
  };

  if (loading) {
    return <FullPageLoader message="Loading board..." />;
  }

  if (!board && boardId !== "all-notes") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Board not found</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen max-w-screen bg-background dark:bg-zinc-950">
      <div className="bg-card dark:bg-zinc-900 border-b border-border dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            {/* Company Name */}
            <Link
              href="/dashboard"
              className="flex-shrink-0 pl-4 sm:pl-2 lg:pl-4"
            >
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                Gumboard
              </h1>
            </Link>

            {/* Board Selector Dropdown */}
            <div className="relative board-dropdown block">
              <button
                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                className="flex items-center border border-border dark:border-zinc-800 space-x-2 text-foreground dark:text-zinc-100 hover:text-foreground dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 rounded-md px-3 py-2 cursor-pointer"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground dark:text-zinc-100">
                    {boardId === "all-notes" ? "All notes" : board?.name}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground dark:text-zinc-400 transition-transform ${
                    showBoardDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showBoardDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-border dark:border-zinc-800 z-50 max-h-80 overflow-y-auto">
                  <div className="py-1">
                    {/* All Notes Option */}
                    <Link
                      href="/boards/all-notes"
                      className={`block px-4 py-2 text-sm hover:bg-accent dark:hover:bg-zinc-800 ${
                        boardId === "all-notes"
                          ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                          : "text-foreground dark:text-zinc-100"
                      }`}
                      onClick={() => setShowBoardDropdown(false)}
                    >
                      <div className="font-medium">All notes</div>
                      <div className="text-xs text-muted-foreground dark:text-zinc-400 mt-1">
                        Notes from all boards
                      </div>
                    </Link>
                    {allBoards.length > 0 && (
                      <div className="border-t border-border dark:border-zinc-800 my-1"></div>
                    )}
                    {allBoards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/boards/${b.id}`}
                        className={`block px-4 py-2 text-sm hover:bg-accent dark:hover:bg-zinc-800 ${
                          b.id === boardId
                            ? "bg-blue-50 dark:bg-zinc-900/70 text-blue-700 dark:text-blue-300"
                            : "text-foreground dark:text-zinc-100"
                        }`}
                        onClick={() => setShowBoardDropdown(false)}
                      >
                        <div className="font-medium">{b.name}</div>
                        {b.description && (
                          <div className="text-xs text-muted-foreground dark:text-zinc-400 mt-1">
                            {b.description}
                          </div>
                        )}
                      </Link>
                    ))}
                    {allBoards.length > 0 && (
                      <div className="border-t border-border dark:border-zinc-800 my-1"></div>
                    )}
                    <button
                      onClick={() => {
                        setShowAddBoard(true);
                        setShowBoardDropdown(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <span className="font-medium">Create new board</span>
                    </button>
                    {boardId !== "all-notes" && (
                      <button
                        onClick={() => {
                          setBoardSettings({ sendSlackUpdates: (board as { sendSlackUpdates?: boolean })?.sendSlackUpdates ?? true });
                          setBoardSettingsDialog(true);
                          setShowBoardDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-foreground dark:text-zinc-100 hover:bg-accent dark:hover:bg-zinc-800"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="font-medium">Board settings</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Popover */}
            <div className="block">
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
                showCompleted={showDoneNotes}
                onShowCompletedChange={(show) => {
                  setShowDoneNotes(show);
                  updateURL(undefined, undefined, undefined, show);
                }}
                className="min-w-fit"
              />
            </div>
          </div>

          {/* Right side - Search, Add Note and User dropdown */}
          <div className="flex items-center space-x-2 px-3 ">
            {/* Search Box */}
            <div className="relative block">
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
                  updateURL(e.target.value);
                }}
                className="w-64 pl-10 pr-4 py-2 border border-border dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    updateURL("");
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-zinc-100"
                >
                  ×
                </button>
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
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer font-medium"
            >
              <Pencil className="w-4 h-4" />
            </Button>

            {/* User Dropdown */}
            <div className="relative user-dropdown">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 text-foreground dark:text-gray-200 hover:text-foreground dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-md px-2 py-1"
              >
                <div className="w-8 h-8 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name
                      ? user.name.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium hidden md:inline">
                  {user?.name?.split(" ")[0] || "User"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground dark:text-gray-400 transition-transform ${
                    showUserDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 min-w-fit bg-white dark:bg-gray-800 rounded-md shadow-lg border border-border dark:border-gray-600 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-muted-foreground dark:text-gray-400 border-b border-border dark:border-gray-600">
                      {user?.email}
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-foreground dark:text-gray-200 hover:bg-accent dark:hover:bg-gray-700"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-foreground dark:text-gray-200 hover:bg-accent dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div
        ref={boardRef}
        className="relative w-full bg-gray-50 dark:bg-zinc-950"
        style={{
          height: boardHeight,
          minHeight: "calc(100vh - 64px)", // Account for header height
        }}
      >
        {/* Search Results Info */}
        {(searchTerm ||
          dateRange.startDate ||
          dateRange.endDate ||
          selectedAuthor ||
          showDoneNotes) && (
          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/50 border-b border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {filteredNotes.length === 1
                  ? `1 note found`
                  : `${filteredNotes.length} notes found`}
              </span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200">
                  Search: &quot;{searchTerm}&quot;
                </span>
              )}
              {selectedAuthor && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200">
                  Author:{" "}
                  {uniqueAuthors.find((a) => a.id === selectedAuthor)?.name ||
                    "Unknown"}
                </span>
              )}
              {(dateRange.startDate || dateRange.endDate) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200">
                  Date:{" "}
                  {dateRange.startDate
                    ? dateRange.startDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "..."}{" "}
                  -{" "}
                  {dateRange.endDate
                    ? dateRange.endDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "..."}
                </span>
              )}
              {showDoneNotes && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200">
                  Completed notes shown
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setDateRange({ startDate: null, endDate: null });
                  setSelectedAuthor(null);
                  setShowDoneNotes(true);
                  updateURL(
                    "",
                    { startDate: null, endDate: null },
                    null,
                    true
                  );
                }}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-xs underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="relative w-full h-full">
          {layoutNotes.map((note) => (
            <div
              key={note.id}
              className={`absolute rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border note-background ${
                note.done ? "opacity-80" : ""
              }`}
              style={{
                backgroundColor:
                  typeof window !== "undefined" &&
                  window.matchMedia &&
                  window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? `${note.color}20`
                    : note.color,
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                padding: `${getResponsiveConfig().notePadding}px`,
              }}
            >
              {/* User Info Header */}
              <div className="flex items-start justify-between mb-4 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-800">
                    <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-semibold">
                      {note.user.name
                        ? note.user.name.charAt(0).toUpperCase()
                        : note.user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-20">
                      {note.user.name
                        ? note.user.name.split(" ")[0]
                        : note.user.email.split("@")[0]}
                    </span>
                    <div className="flex flex-col">
                      {boardId === "all-notes" && note.board && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 opacity-80 font-medium truncate max-w-20">
                          {note.board.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Show edit/delete buttons for note author or admin */}
                  {(user?.id === note.user.id || user?.isAdmin) && (
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  {/* Beautiful checkbox for done status - show to author or admin */}
                  {(user?.id === note.user.id || user?.isAdmin) && (
                    <div className="flex items-center">
                      <Checkbox
                        checked={note.done}
                        onCheckedChange={() => {
                          handleToggleAllChecklistItems(note.id);
                        }}
                        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                        title={
                          note.done
                            ? "Uncheck all items"
                            : "Check all items"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {editingNote === note.id ? (
                <div className="flex-1 min-h-0">
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setEditContent(newValue);
                    }}
                    className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7 text-gray-800 dark:text-gray-200"
                    placeholder="Enter note content..."
                    onBlur={() => handleUpdateNote(note.id, editContent)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        handleUpdateNote(note.id, editContent);
                      }
                      if (e.key === "Escape") {
                        setEditingNote(null);
                        setEditContent("");
                      }
                      if (e.key === "Backspace" && editContent.trim() === "") {
                        handleDeleteNote(note.id);
                      }
                    }}
                    onFocus={(e) => {
                      const length = e.target.value.length;
                      e.target.setSelectionRange(length, length);
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="overflow-y-auto space-y-1 flex-1">
                    {/* Checklist Items */}
                    {note.checklistItems?.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center group/item rounded gap-3 transition-all duration-200 ${
                        animatingItems.has(item.id) ? "animate-pulse" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() =>
                          handleToggleChecklistItem(note.id, item.id)
                        }
                        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                      />

                      {/* Content */}
                      {editingChecklistItem?.noteId === note.id &&
                        editingChecklistItem?.itemId === item.id ? (
                          <Input
                            type="text"
                            value={editingChecklistItemContent}
                            onChange={(e) => {
                              setEditingChecklistItemContent(e.target.value);
                              debouncedEditChecklistItem(
                                note.id,
                                item.id,
                                e.target.value
                              );
                            }}
                            className={cn(
                              "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0",
                              item.checked &&
                                "text-slate-500 dark:text-zinc-500 line-through"
                            )}
                            onBlur={() => {
                              const key = `${note.id}-${item.id}`;
                              const existingTimeout = editDebounceMap.current.get(key);
                              if (existingTimeout) {
                                clearTimeout(existingTimeout);
                                editDebounceMap.current.delete(key);
                              }
                              // Save immediately
                              handleEditChecklistItem(
                                note.id,
                                item.id,
                                editingChecklistItemContent
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const target = e.target as HTMLInputElement;
                                const cursorPosition =
                                  target.selectionStart || 0;
                                handleSplitChecklistItem(
                                  note.id,
                                  item.id,
                                  editingChecklistItemContent,
                                  cursorPosition
                                );
                              }
                              if (e.key === "Escape") {
                                setEditingChecklistItem(null);
                                setEditingChecklistItemContent("");
                              }
                              if (
                                e.key === "Backspace" &&
                                editingChecklistItemContent.trim() === ""
                              ) {
                                e.preventDefault();

                                const currentNote = notes.find(
                                  (n) => n.id === note.id
                                );
                                if (currentNote?.checklistItems) {
                                  const currentItem =
                                    currentNote.checklistItems.find(
                                      (i) => i.id === item.id
                                    );
                                  if (currentItem) {
                                    const sortedItems = [
                                      ...currentNote.checklistItems,
                                    ].sort((a, b) => a.order - b.order);
                                    const currentIndex = sortedItems.findIndex(
                                      (i) => i.id === item.id
                                    );

                                    if (currentIndex > 0) {
                                      const previousItem =
                                        sortedItems[currentIndex - 1];

                                      handleDeleteChecklistItem(
                                        note.id,
                                        item.id
                                      );

                                      setTimeout(() => {
                                        setEditingChecklistItem({
                                          noteId: note.id,
                                          itemId: previousItem.id,
                                        });
                                        setEditingChecklistItemContent(
                                          previousItem.content
                                        );
                                      }, 0);
                                    } else {
                                      handleDeleteChecklistItem(
                                        note.id,
                                        item.id
                                      );
                                    }
                                  } else {
                                    handleDeleteChecklistItem(note.id, item.id);
                                  }
                                } else {
                                  handleDeleteChecklistItem(note.id, item.id);
                                }
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex-1 text-sm leading-6 cursor-pointer transition-all duration-200",
                              item.checked
                                ? "text-slate-500 dark:text-zinc-500 line-through"
                                : "text-gray-800 dark:text-gray-200"
                            )}
                            onClick={() => {
                              if (user?.id === note.user.id || user?.isAdmin) {
                                setEditingChecklistItem({
                                  noteId: note.id,
                                  itemId: item.id,
                                });
                                setEditingChecklistItemContent(item.content);
                              }
                            }}
                          >
                            {item.content}
                          </span>
                        )}

                      {/* Delete button */}
                      {(user?.id === note.user.id || user?.isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
                          onClick={() =>
                            handleDeleteChecklistItem(note.id, item.id)
                          }
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    ))}

                  {/* Add new item input */}
                  {addingChecklistItem === note.id && (
                    <div className="flex items-center group/item rounded gap-3 transition-all duration-200">
                      <Checkbox
                        checked={false}
                        disabled
                        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                      />
                      <Input
                        type="text"
                        value={newChecklistItemContent}
                        onChange={(e) =>
                          setNewChecklistItemContent(e.target.value)
                        }
                        className="flex-1 bg-transparent border-none text-sm leading-6 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="Add new item..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddChecklistItem(note.id);
                          }
                          if (e.key === "Escape") {
                            setAddingChecklistItem(null);
                            setNewChecklistItemContent("");
                          }
                          if (
                            e.key === "Backspace" &&
                            newChecklistItemContent.trim() === ""
                          ) {
                            setAddingChecklistItem(null);
                            setNewChecklistItemContent("");
                          }
                        }}
                        onBlur={() => {
                          if (newChecklistItemContent.trim()) {
                            handleAddChecklistItem(note.id);
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  )}
                  </div>

                  {/* Add task button - everpresent for checklist notes and authorized users */}
                  {(user?.id === note.user.id || user?.isAdmin) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingChecklistItem(note.id);
                        }}
                        className="mt-2 justify-start text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-gray-100 text-sm opacity-70 hover:opacity-100"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add task
                      </Button>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 &&
          notes.length > 0 &&
          (searchTerm ||
            dateRange.startDate ||
            dateRange.endDate ||
            selectedAuthor ||
            !showDoneNotes) && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
              <Search className="w-12 h-12 mb-4 text-gray-400 dark:text-gray-500" />
              <div className="text-xl mb-2">No notes found</div>
              <div className="text-sm mb-4 text-center">
                No notes match your current filters
                {searchTerm && <div>Search: &quot;{searchTerm}&quot;</div>}
                {selectedAuthor && (
                  <div>
                    Author:{" "}
                    {uniqueAuthors.find((a) => a.id === selectedAuthor)?.name ||
                      "Unknown"}
                  </div>
                )}
                {(dateRange.startDate || dateRange.endDate) && (
                  <div>
                    Date range:{" "}
                    {dateRange.startDate
                      ? dateRange.startDate.toLocaleDateString()
                      : "..."}{" "}
                    -{" "}
                    {dateRange.endDate
                      ? dateRange.endDate.toLocaleDateString()
                      : "..."}
                  </div>
                )}
                {!showDoneNotes && <div>Completed notes are hidden</div>}
              </div>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setDateRange({ startDate: null, endDate: null });
                  setSelectedAuthor(null);
                  setShowDoneNotes(true);
                  updateURL(
                    "",
                    { startDate: null, endDate: null },
                    null,
                    true
                  );
                }}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <span>Clear All Filters</span>
              </Button>
            </div>
          )}

        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
            <div className="text-xl mb-2">No notes yet</div>
            <div className="text-sm mb-4">
              Click &ldquo;Add Note&rdquo; to get started
            </div>
            <Button
              onClick={() => {
                if (boardId === "all-notes" && allBoards.length > 0) {
                  handleAddNote(allBoards[0].id);
                } else {
                  handleAddNote();
                }
              }}
              className="flex items-center space-x-2"
            >
              <Pencil className="w-4 h-4" />
              <span>Add Your First Note</span>
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
            className="bg-white dark:bg-zinc-950 bg-opacity-95 dark:bg-opacity-95 rounded-xl p-5 sm:p-7 w-full max-w-sm sm:max-w-md shadow-2xl border border-border dark:border-zinc-800"
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
                    className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700"
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
                    className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700"
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
                  className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-zinc-100"
                >
                  Create board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteNoteDialog.open}
        onOpenChange={(open) => setDeleteNoteDialog({ open, noteId: "" })}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete note
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete this note? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100 border border-border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteNote}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) =>
          setErrorDialog({ open, title: "", description: "" })
        }
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
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
              onClick={() =>
                setErrorDialog({ open: false, title: "", description: "" })
              }
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={boardSettingsDialog} onOpenChange={setBoardSettingsDialog}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Board settings
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Configure settings for &quot;{board?.name}&quot; board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendSlackUpdates"
                checked={boardSettings.sendSlackUpdates}
                onCheckedChange={(checked) => 
                  setBoardSettings({ sendSlackUpdates: checked as boolean })
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

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleUpdateBoardSettings(boardSettings)}>
              Save settings
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
