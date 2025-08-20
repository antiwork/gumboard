import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Note, Board } from "@/components/note";
import {
  getUniqueAuthors,
  calculateGridLayout,
  calculateMobileLayout,
  filterAndSortNotes,
} from "@/lib/utils";
import { User } from "@/types/types";

interface UseBoardDataOptions {
  boardId: string | null;
  isPublicView?: boolean;
  currentUser?: User | null;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export function useBoardData({ boardId, isPublicView = false, currentUser }: UseBoardDataOptions) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);

  const router = useRouter();

  // Responsive handling
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

  // Search debouncing (only for private boards that support URL updates)
  useEffect(() => {
    if (!isPublicView) {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setDebouncedSearchTerm(searchTerm);
    }
  }, [searchTerm, isPublicView]);

  // Fetch board data
  const fetchBoardData = useCallback(async () => {
    if (!boardId) return;

    try {
      setLoading(true);

      const boardResponse = await fetch(`/api/boards/${boardId}`);

      // Handle different response statuses
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

        // For public view, only set board if it's actually public
        if (isPublicView) {
          if (board.isPublic) {
            setBoard(board);
          } else {
            setBoard(null);
            setLoading(false);
            return;
          }
        } else {
          setBoard(board);
        }
      }

      // Fetch notes
      const notesResponse = await fetch(`/api/boards/${boardId}/notes`);
      if (notesResponse.ok) {
        const { notes } = await notesResponse.json();
        setNotes(notes);
      }
    } catch (error) {
      console.error("Error fetching board data:", error);
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [boardId, isPublicView, router]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Computed values
  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);

  const filteredNotes = useMemo(
    () =>
      filterAndSortNotes(
        notes,
        isPublicView ? searchTerm : debouncedSearchTerm,
        dateRange,
        selectedAuthor,
        isPublicView ? null : currentUser
      ),
    [notes, searchTerm, debouncedSearchTerm, dateRange, selectedAuthor, currentUser, isPublicView]
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

  // Filter actions
  const updateSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const updateDateRange = useCallback((newDateRange: DateRange) => {
    setDateRange(newDateRange);
  }, []);

  const updateAuthor = useCallback((authorId: string | null) => {
    setSelectedAuthor(authorId);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setDateRange({ startDate: null, endDate: null });
    setSelectedAuthor(null);
  }, []);

  return {
    // State
    board,
    notes,
    loading,
    isMobile,
    searchTerm,
    debouncedSearchTerm,
    dateRange,
    selectedAuthor,

    // Computed
    uniqueAuthors,
    filteredNotes,
    layoutNotes,
    boardHeight,

    // Actions
    updateSearch,
    updateDateRange,
    updateAuthor,
    clearFilters,
    refetchData: fetchBoardData,

    // Internal state setters (for compatibility)
    setNotes,
    setBoard,
  };
}
