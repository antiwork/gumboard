import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Note, Board } from "@/components/note";
import {
  getUniqueAuthors,
  calculateGridLayout,
  calculateMobileLayout,
  filterAndSortNotes,
} from "@/lib/utils";

interface UseBoardOptions {
  readonly?: boolean;
  enableFilters?: boolean;
  enableUrlSync?: boolean;
  enableUserFeatures?: boolean;
  isPublicView?: boolean; // Add this flag
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export function useBoard(boardId: string | null, options: UseBoardOptions = {}) {
  const {
    readonly = false,
    enableFilters = true,
    enableUrlSync = false,
    enableUserFeatures = true,
    isPublicView = false,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();

  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allBoards, setAllBoards] = useState<Board[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);

  const filteredNotes = useMemo(
    () => filterAndSortNotes(notes, debouncedSearchTerm, dateRange, selectedAuthor, null),
    [notes, debouncedSearchTerm, dateRange, selectedAuthor]
  );

  const layoutNotes = useMemo(
    () =>
      isMobile
        ? calculateMobileLayout(filteredNotes, null)
        : calculateGridLayout(filteredNotes, null),
    [isMobile, filteredNotes]
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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    const newDateRange = { startDate, endDate };
    setDateRange(newDateRange);

    if (enableUrlSync) {
      updateURL(undefined, newDateRange);
    }
  };

  const handleAuthorChange = (authorId: string | null) => {
    setSelectedAuthor(authorId);

    if (enableUrlSync) {
      updateURL(undefined, undefined, authorId);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setDateRange({ startDate: null, endDate: null });
    setSelectedAuthor(null);

    if (enableUrlSync) {
      updateURL("", { startDate: null, endDate: null }, null);
    }
  };

  const updateURL = (
    newSearchTerm?: string,
    newDateRange?: DateRange,
    newAuthor?: string | null
  ) => {
    if (!enableUrlSync) return;

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

  const initializeFiltersFromURL = () => {
    if (!enableUrlSync) return;

    const urlSearchTerm = searchParams.get("search") || "";
    const urlStartDate = searchParams.get("startDate");
    const urlEndDate = searchParams.get("endDate");
    const urlAuthor = searchParams.get("author");

    setSearchTerm(urlSearchTerm);

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

  const fetchBoardData = async () => {
    if (!boardId) return;

    try {
      setLoading(true);
      setError(null);

      // For public view, don't allow special board IDs
      if (isPublicView && (boardId === "all-notes" || boardId === "archive")) {
        setBoard(null);
        setLoading(false);
        return;
      }

      let boardResponse: Response | undefined;
      let notesResponse: Response;
      let allBoardsResponse: Response | undefined;

      if (isPublicView) {
        const boardResponse = await fetch(`/api/boards/${boardId}`);

        if (boardResponse.status === 404 || boardResponse.status === 403) {
          setBoard(null);
          setLoading(false);
          return;
        }

        if (boardResponse.status === 401) {
          router.push("/auth/signin");
          return;
        }

        if (boardResponse.ok) {
          const { board } = await boardResponse.json();
          if (board.isPublic) {
            setBoard(board);
          } else {
            setBoard(null);
            setLoading(false);
            return;
          }
        }

        if (board || boardResponse.ok) {
          const notesResponse = await fetch(`/api/boards/${boardId}/notes`);
          if (notesResponse.ok) {
            const { notes } = await notesResponse.json();
            setNotes(notes);
          }
        }
      } else {
        if (boardId === "all-notes") {
          boardResponse = undefined;
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
          boardResponse = undefined;
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

        if (allBoardsResponse && allBoardsResponse.ok) {
          const { boards } = await allBoardsResponse.json();
          setAllBoards(boards);
        }

        if (boardResponse && boardResponse.ok) {
          const { board } = await boardResponse.json();
          setBoard(board);

          if (boardId && boardId !== "all-notes" && boardId !== "archive") {
            try {
              localStorage.setItem("gumboard-last-visited-board", boardId);
            } catch (error) {
              console.warn("Failed to save last visited board:", error);
            }
          }
        }

        if (notesResponse && notesResponse.ok) {
          const { notes } = await notesResponse.json();
          setNotes(notes);
        }
      }
    } catch (error) {
      console.error("Error fetching board data:", error);
      setError("Failed to load board data");
      setBoard(null);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (enableUrlSync) {
        updateURL(searchTerm);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (enableUrlSync) {
      initializeFiltersFromURL();
    }
  }, [enableUrlSync]);

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
    }
  }, [boardId]);

  return {
    board,
    notes,
    loading,
    error,
    isMobile,
    searchTerm,
    dateRange,
    selectedAuthor,
    boardRef,
    allBoards,

    setBoard,
    setNotes,
    setLoading,
    setAllBoards,

    filteredNotes,
    layoutNotes,
    boardHeight,
    uniqueAuthors,

    handleSearchChange,
    handleDateRangeChange,
    handleAuthorChange,
    clearAllFilters,

    setSearchTerm,
    setDateRange,
    setSelectedAuthor,
    fetchBoardData,

    readonly,
    enableFilters,
    enableUrlSync,
    enableUserFeatures,
  };
}
