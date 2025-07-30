"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Edit3,
  ChevronDown,
  Settings,
  LogOut,
  Search,
  User,
  ArrowUpDown,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { FullPageLoader } from "@/components/ui/loader";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  useKeyboardShortcuts,
  type KeyboardShortcut,
} from "@/lib/hooks/useKeyboardShortcuts";

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

type SortOption = "created-desc" | "created-asc" | "author-name";

const SORT_OPTIONS = [
  {
    value: "created-desc" as SortOption,
    label: "Newest first",
    description: "Created at (descending)",
  },
  {
    value: "created-asc" as SortOption,
    label: "Oldest first",
    description: "Created at (ascending)",
  },
  {
    value: "author-name" as SortOption,
    label: "Author name",
    description: "Alphabetical by name",
  },
] as const;

export default function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("#fef3c7");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showBoardDropdown, setShowBoardDropdown] = useState(false);
  const [allBoards, setAllBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState<string>("");
  const [isAllNotes, setIsAllNotes] = useState(false);
  const [noteType, setNoteType] = useState<"text" | "checklist">("text");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null,
  });
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("created-desc");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showDoneNotes, setShowDoneNotes] = useState(false);
  const [addingChecklistItem, setAddingChecklistItem] = useState<string | null>(
    null,
  );
  const [newChecklistItemContent, setNewChecklistItemContent] = useState("");
  const [editingChecklistItem, setEditingChecklistItem] = useState<{
    noteId: string;
    itemId: string;
  } | null>(null);
  const [editingChecklistItemContent, setEditingChecklistItemContent] =
    useState("");
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isMac, setIsMac] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Update URL with current filter state
  const updateURL = (
    newSearchTerm?: string,
    newDateRange?: { startDate: Date | null; endDate: Date | null },
    newAuthor?: string | null,
    newSort?: SortOption,
    newShowDone?: boolean,
  ) => {
    const params = new URLSearchParams();

    const currentSearchTerm =
      newSearchTerm !== undefined ? newSearchTerm : searchTerm;
    const currentDateRange =
      newDateRange !== undefined ? newDateRange : dateRange;
    const currentAuthor = newAuthor !== undefined ? newAuthor : selectedAuthor;
    const currentSort = newSort !== undefined ? newSort : sortBy;
    const currentShowDone =
      newShowDone !== undefined ? newShowDone : showDoneNotes;

    if (currentSearchTerm) {
      params.set("search", currentSearchTerm);
    }
    if (currentDateRange.startDate) {
      params.set("startDate", currentDateRange.startDate.toISOString());
    }
    if (currentDateRange.endDate) {
      params.set("endDate", currentDateRange.endDate.toISOString());
    }
    if (currentAuthor) {
      params.set("author", currentAuthor);
    }
    if (currentSort !== "created-desc") {
      params.set("sort", currentSort);
    }
    if (currentShowDone) {
      params.set("showDone", "true");
    }

    const queryString = params.toString();
    const newURL = queryString ? `?${queryString}` : window.location.pathname;
    router.replace(newURL, { scroll: false });
  };

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "n",
      action: () => {
        setShowAddNote(true);
      },
      description: "Create new note",
    },
    {
      key: "k",
      ctrl: true,
      action: () => {
        const searchInput = isMobile
          ? mobileSearchInputRef.current
          : searchInputRef.current;
        searchInput?.focus();
        searchInput?.select();
      },
      description: "Search",
    },
    {
      key: "Escape",
      action: () => {
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
        if (showAuthorDropdown) {
          setShowAuthorDropdown(false);
        }
        if (showSortDropdown) {
          setShowSortDropdown(false);
        }
        if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        }
      },
      description: "Cancel/Close",
    },
    {
      key: "?",
      shift: true,
      action: () => {
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
      },
      description: "Show keyboard shortcuts",
    },
  ];

  useKeyboardShortcuts(shortcuts);

  // Initialize filters from URL parameters
  const initializeFiltersFromURL = () => {
    const urlSearchTerm = searchParams.get("search") || "";
    const urlStartDate = searchParams.get("startDate");
    const urlEndDate = searchParams.get("endDate");
    const urlAuthor = searchParams.get("author");
    const urlSort = (searchParams.get("sort") as SortOption) || "created-desc";
    const urlShowDone = searchParams.get("showDone");

    setSearchTerm(urlSearchTerm);

    if (urlStartDate || urlEndDate) {
      setDateRange({
        startDate: urlStartDate ? new Date(urlStartDate) : null,
        endDate: urlEndDate ? new Date(urlEndDate) : null,
      });
    }

    if (urlAuthor) {
      setSelectedAuthor(urlAuthor);
    }

    setSortBy(urlSort);
    setShowDoneNotes(urlShowDone === "true");
  };

  // Function to determine if we're on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const colors = [
    "#fef3c7", // yellow
    "#fce7f3", // pink
    "#dbeafe", // blue
    "#dcfce7", // green
    "#fed7d7", // red
    "#e0e7ff", // indigo
    "#f3e8ff", // purple
    "#fef4e6", // orange
  ];

  const sortNotes = (notesToSort: Note[]): Note[] => {
    const sorted = [...notesToSort];

    switch (sortBy) {
      case "created-desc":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case "created-asc":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      case "author-name":
        return sorted.sort((a, b) => {
          const nameA =
            a.user.name?.toLowerCase() || a.user.email.toLowerCase();
          const nameB =
            b.user.name?.toLowerCase() || b.user.email.toLowerCase();
          return nameA.localeCompare(nameB);
        });
      default:
        return sorted;
    }
  };

  const filteredNotes = sortNotes(
    notes.filter((note) => {
      // Filter by search term
      if (
        searchTerm &&
        !note.content.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Filter by date range
      if (dateRange.startDate || dateRange.endDate) {
        const noteDate = new Date(note.createdAt);
        if (dateRange.startDate && noteDate < dateRange.startDate) {
          return false;
        }
        if (dateRange.endDate) {
          const endOfDay = new Date(dateRange.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (noteDate > endOfDay) {
            return false;
          }
        }
      }

      // Filter by author
      if (selectedAuthor && note.user.id !== selectedAuthor) {
        return false;
      }

      // Filter by done status
      if (!showDoneNotes && note.done) {
        return false;
      }

      return true;
    }),
  );

  const clearAllFilters = () => {
    setSearchTerm("");
    setDateRange({ startDate: null, endDate: null });
    setSelectedAuthor(null);
    setSortBy("created-desc");
    setShowDoneNotes(false);
    updateURL(
      "",
      { startDate: null, endDate: null },
      null,
      "created-desc",
      false,
    );
  };

  const hasActiveFilters =
    searchTerm ||
    dateRange.startDate ||
    dateRange.endDate ||
    selectedAuthor ||
    sortBy !== "created-desc" ||
    showDoneNotes;

  // Handle adding a new note
  const handleAddNote = async (boardIdOverride?: string) => {
    if (!noteContent.trim()) return;

    const targetBoardId = boardIdOverride || boardId;
    if (!targetBoardId || targetBoardId === "all-notes") {
      alert("Please select a board to add a note");
      return;
    }

    try {
      const response = await fetch(`/api/boards/${targetBoardId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: noteContent,
          color: noteColor,
          isChecklist: noteType === "checklist",
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes([note, ...notes]);
        setNoteContent("");
        setShowAddNote(false);
        setNoteType("text");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to create note");
      }
    } catch (error) {
      console.error("Error creating note:", error);
      alert("Failed to create note");
    }
  };

  // Handle deleting a note
  const handleDeleteNote = async (noteId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== noteId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note");
    }
  };

  // Handle updating a note
  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editContent,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setEditingNote(null);
        setEditContent("");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update note");
      }
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note");
    }
  };

  // Handle toggling done status
  const handleToggleDone = async (
    noteId: string,
    currentDone: boolean,
    event?: React.MouseEvent,
  ) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          done: !currentDone,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update note");
      }
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note");
    }
  };

  // Initialize boardId from params
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setBoardId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    initializeFiltersFromURL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsMac(
      typeof window !== "undefined" &&
        navigator.platform.toLowerCase().includes("mac"),
    );
  }, []);

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showBoardDropdown ||
        showUserDropdown ||
        showAuthorDropdown ||
        showSortDropdown
      ) {
        const target = event.target as Element;
        if (
          !target.closest(".board-dropdown") &&
          !target.closest(".user-dropdown") &&
          !target.closest(".author-dropdown") &&
          !target.closest(".sort-dropdown")
        ) {
          setShowBoardDropdown(false);
          setShowUserDropdown(false);
          setShowAuthorDropdown(false);
          setShowSortDropdown(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (editingNote) {
          setEditingNote(null);
          setEditContent("");
        }
        if (showBoardDropdown) {
          setShowBoardDropdown(false);
        }
        if (showUserDropdown) {
          setShowUserDropdown(false);
        }
        if (showAuthorDropdown) {
          setShowAuthorDropdown(false);
        }
        if (showSortDropdown) {
          setShowSortDropdown(false);
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
    editingNote,
    showAuthorDropdown,
    showSortDropdown,
  ]);

  const uniqueAuthors = Array.from(
    new Map(notes.map((note) => [note.user.id, note.user])).values(),
  );

  // Handler for signing out
  const handleSignOut = async () => {
    await signOut();
  };

  // Add this function to handle adding checklist items
  const handleAddChecklistItem = async (noteId: string) => {
    if (!newChecklistItemContent.trim()) return;

    try {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      const currentItems = note.checklistItems || [];
      const newItem = {
        id: `item-${Date.now()}`,
        content: newChecklistItemContent,
        checked: false,
        order: currentItems.length,
      };

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: [...currentItems, newItem],
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setNewChecklistItemContent("");
        setAddingChecklistItem(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to add checklist item");
      }
    } catch (error) {
      console.error("Error adding checklist item:", error);
      alert("Failed to add checklist item");
    }
  };

  // Add this function to handle toggling checklist items
  const handleToggleChecklistItem = async (
    noteId: string,
    itemId: string,
    checked: boolean,
  ) => {
    // Add to animating items
    setAnimatingItems((prev) => new Set(prev).add(itemId));

    try {
      const note = notes.find((n) => n.id === noteId);
      if (!note || !note.checklistItems) return;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId ? { ...item, checked: !checked } : item,
      );

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: updatedItems,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));

        // Remove from animating items after animation completes
        setTimeout(() => {
          setAnimatingItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }, 300);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update checklist item");
        // Remove from animating items on error
        setAnimatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error updating checklist item:", error);
      alert("Failed to update checklist item");
      // Remove from animating items on error
      setAnimatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Add this function to handle deleting checklist items
  const handleDeleteChecklistItem = async (noteId: string, itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const note = notes.find((n) => n.id === noteId);
      if (!note || !note.checklistItems) return;

      const updatedItems = note.checklistItems.filter(
        (item) => item.id !== itemId,
      );

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: updatedItems,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete checklist item");
      }
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      alert("Failed to delete checklist item");
    }
  };

  // Add this function to handle updating checklist item content
  const handleUpdateChecklistItem = async (noteId: string, itemId: string) => {
    if (!editingChecklistItemContent.trim()) return;

    try {
      const note = notes.find((n) => n.id === noteId);
      if (!note || !note.checklistItems) return;

      const updatedItems = note.checklistItems.map((item) =>
        item.id === itemId
          ? { ...item, content: editingChecklistItemContent }
          : item,
      );

      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistItems: updatedItems,
        }),
      });

      if (response.ok) {
        const { note } = await response.json();
        setNotes(notes.map((n) => (n.id === noteId ? note : n)));
        setEditingChecklistItem(null);
        setEditingChecklistItemContent("");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update checklist item");
      }
    } catch (error) {
      console.error("Error updating checklist item:", error);
      alert("Failed to update checklist item");
    }
  };

  // Extract unique users from notes
  useEffect(() => {
    const uniqueUsersMap = new Map();
    notes.forEach((note) => {
      if (!uniqueUsersMap.has(note.user.id)) {
        uniqueUsersMap.set(note.user.id, note.user);
      }
    });
    setUsers(Array.from(uniqueUsersMap.values()));
  }, [notes]);

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

      // Check if viewing all notes
      if (boardId === "all-notes") {
        setIsAllNotes(true);
        setBoard({
          id: "all-notes",
          name: "All Notes",
          description: "View notes from all boards",
        });

        // Fetch all boards for the board dropdown
        const boardsResponse = await fetch("/api/boards");
        if (boardsResponse.ok) {
          const { boards } = await boardsResponse.json();
          setAllBoards(boards);
        }

        // Fetch all notes
        const notesResponse = await fetch("/api/boards/all-notes/notes");
        if (notesResponse.ok) {
          const { notes } = await notesResponse.json();
          setNotes(notes);
        }
      } else {
        setIsAllNotes(false);

        // Fetch all boards for the board dropdown
        const boardsResponse = await fetch("/api/boards");
        if (boardsResponse.ok) {
          const { boards } = await boardsResponse.json();
          setAllBoards(boards);
        }

        // Fetch specific board
        const boardResponse = await fetch(`/api/boards/${boardId}`);
        if (boardResponse.ok) {
          const { board } = await boardResponse.json();
          setBoard(board);
        }

        // Fetch notes for this board
        const notesResponse = await fetch(`/api/boards/${boardId}/notes`);
        if (notesResponse.ok) {
          const { notes } = await notesResponse.json();
          setNotes(notes);
        }
      }
    } catch (error) {
      console.error("Error fetching board data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FullPageLoader message="Loading board..." />;
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Board not found
          </h2>
          <p className="text-gray-600 mb-4">
            The board you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Board Selector */}
          <div className="flex items-center">
            <Link
              href="/dashboard"
              className="text-2xl font-bold text-blue-600 pl-4 sm:pl-6 lg:pl-8"
            >
              Gumboard
            </Link>

            {/* Board Selector Dropdown */}
            <div className="relative ml-8 board-dropdown">
              <button
                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
              >
                <span className="text-sm font-medium">{board.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showBoardDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="py-1">
                    {/* All Notes option */}
                    <button
                      onClick={() => {
                        router.push("/boards/all-notes");
                        setShowBoardDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${boardId === "all-notes" ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                    >
                      <div>
                        <div className="font-medium">All Notes</div>
                        <div className="text-xs text-gray-500">
                          View notes from all boards
                        </div>
                      </div>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Individual boards */}
                    {allBoards.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          router.push(`/boards/${b.id}`);
                          setShowBoardDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${b.id === boardId ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                      >
                        <div>
                          <div className="font-medium">{b.name}</div>
                          {b.description && (
                            <div className="text-xs text-gray-500">
                              {b.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Search, Add Note and User dropdown */}
          <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
            {/* Search Box */}
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  updateURL(e.target.value);
                }}
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm"
              />
            </div>

            {/* Add Note Button - Only show if not viewing all notes or if a board is selected */}
            {(!isAllNotes || allBoards.length > 0) && (
              <Button
                onClick={() => {
                  if (boardId === "all-notes" && allBoards.length > 0) {
                    // If on all notes page, add to the first board
                    handleAddNote(allBoards[0].id);
                  } else {
                    setShowAddNote(true);
                  }
                }}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Note</span>
              </Button>
            )}

            {/* User Dropdown */}
            <div className="relative user-dropdown">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name
                      ? user.name.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                      {user?.email}
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                      Back to Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
      </nav>

      {/* Mobile Search and Filters Bar */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-3 sm:hidden">
        {/* Title and Filter Toggle */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{board.name}</h2>
        </div>

        {/* Mobile Search Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            ref={mobileSearchInputRef}
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              updateURL(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm"
          />
        </div>

        {/* Mobile Filter Row */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              updateURL(undefined, range);
            }}
          />

          {/* Author Filter */}
          <div className="relative author-dropdown">
            <button
              onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
              className={`flex items-center space-x-1 px-3 py-1.5 text-sm border rounded-md whitespace-nowrap ${
                selectedAuthor
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700"
              } hover:bg-gray-50`}
            >
              <User className="w-4 h-4" />
              <span>
                {selectedAuthor
                  ? users.find((u) => u.id === selectedAuthor)?.name ||
                    "Unknown"
                  : "All Authors"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showAuthorDropdown && (
              <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedAuthor(null);
                    setShowAuthorDropdown(false);
                    updateURL(undefined, undefined, null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  All Authors
                </button>
                {uniqueAuthors.map((author) => (
                  <button
                    key={author.id}
                    onClick={() => {
                      setSelectedAuthor(author.id);
                      setShowAuthorDropdown(false);
                      updateURL(undefined, undefined, author.id);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {author.name || author.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative sort-dropdown">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>
                {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSortDropdown && (
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSortDropdown(false);
                      updateURL(undefined, undefined, undefined, option.value);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      sortBy === option.value
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show Done Toggle */}
          <button
            onClick={() => {
              const newShowDone = !showDoneNotes;
              setShowDoneNotes(newShowDone);
              updateURL(
                undefined,
                undefined,
                undefined,
                undefined,
                newShowDone,
              );
            }}
            className={`flex items-center space-x-1 px-3 py-1.5 text-sm border rounded-md whitespace-nowrap ${
              showDoneNotes
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-gray-300 text-gray-700"
            } hover:bg-gray-50`}
          >
            {showDoneNotes ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span>{showDoneNotes ? "Showing Done" : "Hiding Done"}</span>
          </button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Desktop Filters Bar */}
      <div className="hidden sm:block bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
                updateURL(undefined, range);
              }}
            />

            {/* Author Filter */}
            <div className="relative author-dropdown">
              <button
                onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                className={`flex items-center space-x-1 px-3 py-1.5 text-sm border rounded-md ${
                  selectedAuthor
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700"
                } hover:bg-gray-50`}
              >
                <User className="w-4 h-4" />
                <span>
                  {selectedAuthor
                    ? users.find((u) => u.id === selectedAuthor)?.name ||
                      "Unknown"
                    : "All Authors"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showAuthorDropdown && (
                <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedAuthor(null);
                      setShowAuthorDropdown(false);
                      updateURL(undefined, undefined, null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    All Authors
                  </button>
                  {uniqueAuthors.map((author) => (
                    <button
                      key={author.id}
                      onClick={() => {
                        setSelectedAuthor(author.id);
                        setShowAuthorDropdown(false);
                        updateURL(undefined, undefined, author.id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {author.name || author.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative sort-dropdown">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>
                  {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showSortDropdown && (
                <div className="absolute left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortDropdown(false);
                        updateURL(
                          undefined,
                          undefined,
                          undefined,
                          option.value,
                        );
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        sortBy === option.value
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700"
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Show Done Toggle */}
            <button
              onClick={() => {
                const newShowDone = !showDoneNotes;
                setShowDoneNotes(newShowDone);
                updateURL(
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  newShowDone,
                );
              }}
              className={`flex items-center space-x-1 px-3 py-1.5 text-sm border rounded-md ${
                showDoneNotes
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-white border-gray-300 text-gray-700"
              } hover:bg-gray-50`}
            >
              {showDoneNotes ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
              <span>{showDoneNotes ? "Showing Done" : "Hiding Done"}</span>
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-gray-500">
            {filteredNotes.length}{" "}
            {filteredNotes.length === 1 ? "note" : "notes"}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
        {/* Add Note Modal */}
        {showAddNote && (
          <div
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddNote(false);
              setNoteContent("");
              setNoteType("text");
            }}
          >
            <div
              className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg p-6 w-full max-w-md shadow-2xl drop-shadow-2xl border border-white border-opacity-30"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Add New Note</h3>

              {/* Note Type Toggle */}
              <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setNoteType("text")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    noteType === "text"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Text Note
                </button>
                <button
                  type="button"
                  onClick={() => setNoteType("checklist")}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    noteType === "checklist"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Checklist
                </button>
              </div>

              <textarea
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder={
                  noteType === "checklist"
                    ? "Enter checklist title..."
                    : "Enter your note..."
                }
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
                autoFocus
              />

              {/* Color Selector */}
              <div className="flex space-x-2 mb-4 mt-4">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNoteColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      noteColor === color
                        ? "border-gray-800"
                        : "border-gray-300"
                    } hover:border-gray-500 transition-colors`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddNote(false);
                    setNoteContent("");
                    setNoteType("text");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAddNote()}
                  title={`Add note (${isMac ? "⌘" : "Ctrl"}+Enter)`}
                >
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Grid */}
        <div
          ref={boardRef}
          className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-4 space-y-4"
        >
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`break-inside-avoid mb-4 bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-all duration-200 ${
                note.done ? "opacity-60" : ""
              }`}
              style={{ backgroundColor: note.color }}
              onClick={() => {
                if (editingNote !== note.id && !note.isChecklist) {
                  setEditingNote(note.id);
                  setEditContent(note.content);
                }
              }}
            >
              {/* Note Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-xs text-gray-600">
                    {note.user.name || note.user.email}
                    {isAllNotes && note.board && (
                      <span className="ml-1">• {note.board.name}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Action Buttons */}
                <div
                  className="flex items-center space-x-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleToggleDone(note.id, note.done)}
                    className={`p-1 rounded hover:bg-gray-200 hover:bg-opacity-50 ${
                      note.done ? "text-green-600" : "text-gray-400"
                    }`}
                    title={note.done ? "Mark as undone" : "Mark as done"}
                  >
                    {note.done ? "✓" : "○"}
                  </button>
                  {!note.isChecklist && (
                    <button
                      onClick={() => {
                        setEditingNote(note.id);
                        setEditContent(note.content);
                      }}
                      className="p-1 rounded hover:bg-gray-200 hover:bg-opacity-50 text-gray-600"
                      title="Edit note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {(user?.id === note.user.id || user?.isAdmin) && (
                    <button
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="p-1 rounded hover:bg-gray-200 hover:bg-opacity-50 text-gray-600 hover:text-red-500"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Note Content */}
              {editingNote === note.id ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                    rows={4}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingNote(null);
                        setEditContent("");
                      }
                    }}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingNote(null);
                        setEditContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateNote(note.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : note.isChecklist ? (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {note.content}
                  </h3>

                  {/* Checklist Items */}
                  {note.checklistItems && note.checklistItems.length > 0 && (
                    <div className="space-y-1">
                      {note.checklistItems
                        .sort((a, b) => a.order - b.order)
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center group transition-all duration-300 ${
                              animatingItems.has(item.id) ? "scale-105" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() =>
                                handleToggleChecklistItem(
                                  note.id,
                                  item.id,
                                  item.checked,
                                )
                              }
                              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            {editingChecklistItem?.noteId === note.id &&
                            editingChecklistItem?.itemId === item.id ? (
                              <div
                                className="flex-1 flex items-center space-x-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editingChecklistItemContent}
                                  onChange={(e) =>
                                    setEditingChecklistItemContent(
                                      e.target.value,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleUpdateChecklistItem(
                                        note.id,
                                        item.id,
                                      );
                                    } else if (e.key === "Escape") {
                                      setEditingChecklistItem(null);
                                      setEditingChecklistItemContent("");
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    handleUpdateChecklistItem(note.id, item.id)
                                  }
                                  className="text-green-600 hover:text-green-700"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingChecklistItem(null);
                                    setEditingChecklistItemContent("");
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-between group">
                                <span
                                  className={`text-sm ${item.checked ? "line-through text-gray-500" : "text-gray-900"} transition-all duration-200`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      user?.id === note.user.id ||
                                      user?.isAdmin
                                    ) {
                                      setEditingChecklistItem({
                                        noteId: note.id,
                                        itemId: item.id,
                                      });
                                      setEditingChecklistItemContent(
                                        item.content,
                                      );
                                    }
                                  }}
                                >
                                  {item.content}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  {(user?.id === note.user.id ||
                                    user?.isAdmin) && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingChecklistItem({
                                            noteId: note.id,
                                            itemId: item.id,
                                          });
                                          setEditingChecklistItemContent(
                                            item.content,
                                          );
                                        }}
                                        className="p-1 rounded hover:bg-gray-200 hover:bg-opacity-50 text-gray-600"
                                        title="Edit item"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteChecklistItem(
                                            note.id,
                                            item.id,
                                          );
                                        }}
                                        className="p-1 rounded hover:bg-gray-200 hover:bg-opacity-50 text-gray-600 hover:text-red-500"
                                        title="Delete item"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Add Item Input */}
                  {(user?.id === note.user.id || user?.isAdmin) && (
                    <div className="mt-3">
                      {addingChecklistItem === note.id ? (
                        <div
                          className="flex items-center space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={newChecklistItemContent}
                            onChange={(e) =>
                              setNewChecklistItemContent(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddChecklistItem(note.id);
                              } else if (e.key === "Escape") {
                                setAddingChecklistItem(null);
                                setNewChecklistItemContent("");
                              }
                            }}
                            placeholder="Add item..."
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddChecklistItem(note.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => {
                              setAddingChecklistItem(null);
                              setNewChecklistItemContent("");
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingChecklistItem(note.id);
                          }}
                          className="w-full text-left text-sm text-gray-500 hover:text-gray-700 py-1"
                        >
                          + Add item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-gray-900">
                  {note.content}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Pencil className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters
                ? "No notes match your filters"
                : "No notes yet"}
            </h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters or clearing them to see all notes."
                : `Get started by creating your first note ${isAllNotes && allBoards.length === 0 ? "after creating a board" : ""}.`}
            </p>
            {hasActiveFilters ? (
              <Button onClick={clearAllFilters} variant="outline">
                Clear Filters
              </Button>
            ) : (
              (!isAllNotes || allBoards.length > 0) && (
                <Button
                  onClick={() => {
                    if (boardId === "all-notes" && allBoards.length > 0) {
                      handleAddNote(allBoards[0].id);
                    } else {
                      setShowAddNote(true);
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Your First Note</span>
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowKeyboardShortcuts(false)}
        >
          <div
            className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg p-6 w-full max-w-md shadow-2xl drop-shadow-2xl border border-white border-opacity-30"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-700">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                    {shortcut.ctrl && (isMac ? "⌘ + " : "Ctrl + ")}
                    {shortcut.shift && (isMac ? "⇧ + " : "Shift + ")}
                    {shortcut.alt && (isMac ? "⌥ + " : "Alt + ")}
                    {shortcut.key === " "
                      ? "Space"
                      : shortcut.key === "?"
                        ? "?"
                        : shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Button
                onClick={() => setShowKeyboardShortcuts(false)}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
