"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pencil,
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
import { NoteCard } from "@/components/note-card";
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
  const [showDoneNotes, setShowDoneNotes] = useState(false);
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

    if (currentShowDone) {
      // Only add if not default (false)
      params.set("showDone", "true");
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
    // Default to false if not specified, otherwise parse the boolean
    setShowDoneNotes(urlShowDone === null ? false : urlShowDone === "true");
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

    if (note.isChecklist && note.checklistItems) {
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

  const isEditingRef = useRef(false);

  useEffect(() => {
    isEditingRef.current = editingNote !== null;
  }, [editingNote]);
  useEffect(() => {
    let cancelled = false;
    const inFlight = { v: false };
  
    const tick = async () => {
      if (cancelled || isEditingRef.current || inFlight.v) return;
      inFlight.v = true;
      try {
        await fetchBoardData();
      } finally {
        inFlight.v = false;
      }
    };
  
    const id = setInterval(tick, 5_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [boardId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showBoardDropdown ||
        showUserDropdown ||
        showAddBoard
      ) {
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
    let resizeTimeout: NodeJS.Timeout;

    const checkResponsive = () => {
      if (typeof window !== "undefined") {
        const width = window.innerWidth;
        setIsMobile(width < 768);

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          setNotes((prevNotes) => [...prevNotes]);
        }, 50);
      }
    };

    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => {
      window.removeEventListener("resize", checkResponsive);
      clearTimeout(resizeTimeout);
    };
  }, []);

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

  const filterAndSortNotes = (
    notes: Note[],
    searchTerm: string,
    dateRange: { startDate: Date | null; endDate: Date | null },
    authorId: string | null,
    showDone: boolean,
    currentUser: User | null
  ): Note[] => {
    let filteredNotes = notes;

    if (!showDone) {
      filteredNotes = filteredNotes.filter((note) => {
        if (note.isChecklist) {
          return true;
        }
        return !note.done;
      });
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredNotes = filteredNotes.filter((note) => {
        const authorName = (note.user.name || note.user.email).toLowerCase();
        const noteContent = note.content.toLowerCase();
        return authorName.includes(search) || noteContent.includes(search);
      });
    }

    if (authorId) {
      filteredNotes = filteredNotes.filter((note) => note.user.id === authorId);
    }

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

    filteredNotes.sort((a, b) => {
      if (currentUser) {
        const aIsCurrentUser = a.user.id === currentUser.id;
        const bIsCurrentUser = b.user.id === currentUser.id;

        if (aIsCurrentUser && !bIsCurrentUser) {
          return -1;
        }
        if (!aIsCurrentUser && bIsCurrentUser) {
          return 1;
        }
      }

      if (showDone && a.done !== b.done) {
        return a.done ? 1 : -1;
      }

      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return filteredNotes;
  };

  const uniqueAuthors = getUniqueAuthors(notes);

  const filteredNotes = filterAndSortNotes(
    notes,
    searchTerm,
    dateRange,
    selectedAuthor,
    showDoneNotes,
    user
  );

  const fetchBoardData = async () => {
    try {
      const userResponse = await fetch("/api/user");
      if (userResponse.status === 401) {
        router.push("/auth/signin");
        return;
      }

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData);
      }

      const allBoardsResponse = await fetch("/api/boards");
      if (allBoardsResponse.ok) {
        const { boards } = await allBoardsResponse.json();
        setAllBoards(boards);
      }

      if (boardId === "all-notes") {
        setBoard({
          id: "all-notes",
          name: "All notes",
          description: "Notes from all boards",
        });

        const notesResponse = await fetch(`/api/boards/all-notes/notes`);
        if (notesResponse.ok) {
          const { notes } = await notesResponse.json();
          setNotes(notes);
        }
      } else {
        const boardResponse = await fetch(`/api/boards/${boardId}`);
        if (boardResponse.status === 401) {
          router.push("/auth/signin");
          return;
        }
        if (boardResponse.ok) {
          const { board } = await boardResponse.json();
          setBoard(board);
        }

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
            isChecklist: true,
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
      const targetBoardId =
        boardId === "all-notes" && currentNote?.board?.id
          ? currentNote.board.id
          : boardId;

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
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setEditingNote(null);
        setEditContent("");
      } else {
        const errorData = await response.json();
        setErrorDialog({
          open: true,
          title: "Failed to update note",
          description: errorData.error || "Failed to update note",
        });
      }
    } catch (error) {
      console.error("Error updating note:", error);
      setErrorDialog({
        open: true,
        title: "Failed to update note",
        description: "Failed to update note",
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

  const handleToggleDone = async (noteId: string, currentDone: boolean) => {
    try {
      // Find the note to get its board ID for all notes view
      const currentNote = notes.find((n) => n.id === noteId);
      const targetBoardId =
        boardId === "all-notes" && currentNote?.board?.id
          ? currentNote.board.id
          : boardId;

      const response = await fetch(
        `/api/boards/${targetBoardId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ done: !currentDone }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
      }
    } catch (error) {
      console.error("Error toggling note done status:", error);
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
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
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

      const updatedItems = currentNote.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );

      // Add item to animating set for visual feedback
      setAnimatingItems((prev) => new Set([...prev, itemId]));

      // Small delay to show animation before reordering
      setTimeout(() => {
        // Sort items: unchecked first, then checked
        const sortedItems = [
          ...updatedItems
            .filter((item) => !item.checked)
            .sort((a, b) => a.order - b.order),
          ...updatedItems
            .filter((item) => item.checked)
            .sort((a, b) => a.order - b.order),
        ];

        // Check if all items are checked to mark note as done
        const allItemsChecked = sortedItems.every((item) => item.checked);

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
          .then((response) => response.json())
          .then(({ note }) => {
            setNotes(notes.map((n) => (n.id === noteId ? note : n)));
            // Remove from animating set after update
            setAnimatingItems((prev) => {
              const newSet = new Set(prev);
              newSet.delete(itemId);
              return newSet;
            });
          });
      }, 200);
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

      const updatedItems = currentNote.checklistItems.filter(
        (item) => item.id !== itemId
      );

      // Check if all remaining items are checked to mark note as done
      const allItemsChecked =
        updatedItems.length > 0
          ? updatedItems.every((item) => item.checked)
          : false;

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
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const handleEditChecklistItem = async (
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
  };

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

      if (!secondHalf) {
        await handleEditChecklistItem(noteId, itemId, firstHalf);

        const currentItem = currentNote.checklistItems.find(
          (item) => item.id === itemId
        );
        const currentOrder = currentItem?.order || 0;

        const newItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: "",
          checked: false,
          order: currentOrder + 0.5,
        };

        const allItems = [...currentNote.checklistItems, newItem].sort(
          (a, b) => a.order - b.order
        );

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
          setEditingChecklistItemContent("");
        }
        return;
      }

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

  const layoutNotes = isMobile
    ? calculateMobileLayout()
    : calculateGridLayout();

  // Calculate the total height needed for the board area
  const calculateBoardHeight = () => {
    if (layoutNotes.length === 0) {
      return "calc(100vh - 64px)"; // Default minimum height when no notes
    }

    // Find the bottommost note position
    const maxBottom = Math.max(
      ...layoutNotes.map((note) => note.y + note.height)
    );
    const minHeight =
      typeof window !== "undefined" && window.innerWidth < 768 ? 500 : 600; // Different min heights for mobile/desktop
    const calculatedHeight = Math.max(minHeight, maxBottom + 100); // Add 100px padding at bottom

    return `${calculatedHeight}px`;
  };

  return (
    <div className="min-h-screen max-w-screen bg-background dark:bg-zinc-950">
      <div className="bg-card dark:bg-zinc-900 border-b border-border dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="flex-shrink-0 pl-4 sm:pl-2 lg:pl-4"
            >
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                Gumboard
              </h1>
            </Link>

            <div className="relative board-dropdown hidden md:block">
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
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:block">
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
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
              </div>
              <input
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

      {/* Mobile Board Title */}
      <div className="md:hidden bg-card dark:bg-gray-800 border-b border-border dark:border-gray-700 px-4 py-3 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground dark:text-gray-200">
            {boardId === "all-notes" ? "All notes" : board?.name}
          </h2>
          {boardId === "all-notes" ? (
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Notes from all boards
            </p>
          ) : (
            board?.description && (
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {board.description}
              </p>
            )
          )}
        </div>

        {/* Mobile Search Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              updateURL(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 border border-border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm bg-background dark:bg-gray-700 text-foreground dark:text-gray-200 placeholder:text-muted-foreground dark:placeholder:text-gray-400 shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                updateURL("");
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-gray-200"
            >
              ×
            </button>
          )}
        </div>

        {/* Mobile Filter Popover */}
        <div className="md:hidden">
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
            className="w-full"
          />
        </div>
      </div>
      {/* Board Area */}
      <div
        ref={boardRef}
        className="relative w-full bg-gray-50 dark:bg-zinc-950"
        style={{
          height: calculateBoardHeight(),
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
                  setShowDoneNotes(false);
                  updateURL(
                    "",
                    { startDate: null, endDate: null },
                    null,
                    false
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
            <NoteCard
              key={note.id}
              note={note}
              user={user}
              boardId={boardId ?? ""}
              editingNote={editingNote}
              editContent={editContent}
              addingChecklistItem={addingChecklistItem}
              newChecklistItemContent={newChecklistItemContent}
              editingChecklistItem={editingChecklistItem}
              editingChecklistItemContent={editingChecklistItemContent}
              animatingItems={animatingItems}
              onNoteClick={(note, e) => {
                // Allow editing if user is the note author or admin
                if (user?.id === note.user.id || user?.isAdmin) {
                  // Check if click was on background (not on existing content)
                  const target = e.target as HTMLElement;
                  const isBackgroundClick = target.classList.contains('note-background') || 
                                          target.closest('.note-background') === e.currentTarget;
                  
                  if (note.isChecklist && isBackgroundClick && addingChecklistItem !== note.id) {
                    // Create new checklist item on background click
                    setAddingChecklistItem(note.id);
                  } else if (!note.isChecklist || !isBackgroundClick) {
                    setEditingNote(note.id);
                    setEditContent(note.content);
                  }
                }
              }}
              onEditNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onToggleDone={handleToggleDone}
              onToggleAllChecklistItems={handleToggleAllChecklistItems}
              onAddChecklistItem={handleAddChecklistItem}
              onToggleChecklistItem={handleToggleChecklistItem}
              onDeleteChecklistItem={handleDeleteChecklistItem}
              onEditChecklistItem={handleEditChecklistItem}
              onSplitChecklistItem={handleSplitChecklistItem}
              onSetEditingNote={setEditingNote}
              onSetEditContent={setEditContent}
              onSetAddingChecklistItem={setAddingChecklistItem}
              onSetNewChecklistItemContent={setNewChecklistItemContent}
              onSetEditingChecklistItem={setEditingChecklistItem}
              onSetEditingChecklistItemContent={setEditingChecklistItemContent}
            />
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
                  setShowDoneNotes(false);
                  updateURL(
                    "",
                    { startDate: null, endDate: null },
                    null,
                    false
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

      <AlertDialog open={deleteNoteDialog.open} onOpenChange={(open) => setDeleteNoteDialog({ open, noteId: "" })}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-border dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground dark:text-zinc-100">
              Delete note
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-zinc-400">
              Are you sure you want to delete this note? This action cannot be undone.
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

      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ open, title: "", description: "" })}>
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
              onClick={() => setErrorDialog({ open: false, title: "", description: "" })}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
