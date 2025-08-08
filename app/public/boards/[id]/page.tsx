"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";
import { FullPageLoader } from "@/components/ui/loader";
import { FilterPopover } from "@/components/ui/filter-popover";
import type { Note, Board } from "@/components/note";

export default function PublicBoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
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
  const boardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const getResponsiveConfig = () => {
    if (typeof window === "undefined")
      return {
        noteWidth: 320,
        gridGap: 20,
        containerPadding: 20,
        notePadding: 16,
      };

    const width = window.innerWidth;

    if (width >= 1920) {
      return {
        noteWidth: 340,
        gridGap: 24,
        containerPadding: 32,
        notePadding: 18,
      };
    } else if (width >= 1200) {
      return {
        noteWidth: 320,
        gridGap: 20,
        containerPadding: 24,
        notePadding: 16,
      };
    } else if (width >= 768) {
      return {
        noteWidth: 300,
        gridGap: 16,
        containerPadding: 20,
        notePadding: 16,
      };
    } else if (width >= 600) {
      return {
        noteWidth: 280,
        gridGap: 16,
        containerPadding: 16,
        notePadding: 14,
      };
    } else {
      return {
        noteWidth: 260,
        gridGap: 12,
        containerPadding: 12,
        notePadding: 12,
      };
    }
  };

  const calculateNoteHeight = (
    note: Note,
    noteWidth?: number,
    notePadding?: number
  ) => {
    const config = getResponsiveConfig();
    const actualNotePadding = notePadding || config.notePadding;
    const actualNoteWidth = noteWidth || config.noteWidth;

    const headerHeight = 76;
    const paddingHeight = actualNotePadding * 2;
    const minContentHeight = 84;

    if (note.checklistItems) {
      const itemHeight = 32;
      const itemSpacing = 8;
      const checklistItemsCount = note.checklistItems.length;

      const checklistHeight =
        checklistItemsCount * itemHeight +
        (checklistItemsCount - 1) * itemSpacing;
      const totalChecklistHeight = Math.max(minContentHeight, checklistHeight);

      return headerHeight + paddingHeight + totalChecklistHeight + 40;
    } else {
      const lines = note.content.split("\n");
      const avgCharWidth = 9;
      const contentWidth = actualNoteWidth - actualNotePadding * 2 - 16;
      const charsPerLine = Math.floor(contentWidth / avgCharWidth);

      let totalLines = 0;
      lines.forEach((line) => {
        if (line.length === 0) {
          totalLines += 1;
        } else {
          const wrappedLines = Math.ceil(line.length / charsPerLine);
          totalLines += Math.max(1, wrappedLines);
        }
      });

      totalLines = Math.max(3, totalLines);
      const lineHeight = 28;
      const contentHeight = totalLines * lineHeight;

      return (
        headerHeight + paddingHeight + Math.max(minContentHeight, contentHeight)
      );
    }
  };

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
    authorId: string | null
  ): Note[] => {
    let filteredNotes = notes;

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
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return filteredNotes;
  };

  const calculateGridLayout = () => {
    if (typeof window === "undefined") return [];

    const config = getResponsiveConfig();
    const containerWidth = window.innerWidth - config.containerPadding * 2;
    const noteWidthWithGap = config.noteWidth + config.gridGap;
    const columnsCount = Math.floor(
      (containerWidth + config.gridGap) / noteWidthWithGap
    );
    const actualColumnsCount = Math.max(1, columnsCount);

    const availableWidthForNotes =
      containerWidth - (actualColumnsCount - 1) * config.gridGap;
    const calculatedNoteWidth = Math.floor(
      availableWidthForNotes / actualColumnsCount
    );
    const minWidth = config.noteWidth - 40;
    const maxWidth = config.noteWidth + 80;
    const adjustedNoteWidth = Math.max(
      minWidth,
      Math.min(maxWidth, calculatedNoteWidth)
    );

    const offsetX = config.containerPadding;
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(
      config.containerPadding
    );

    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(
        note,
        adjustedNoteWidth,
        config.notePadding
      );

      let bestColumn = 0;
      let minBottom = columnBottoms[0];

      for (let col = 1; col < actualColumnsCount; col++) {
        if (columnBottoms[col] < minBottom) {
          minBottom = columnBottoms[col];
          bestColumn = col;
        }
      }

      const x = offsetX + bestColumn * (adjustedNoteWidth + config.gridGap);
      const y = columnBottoms[bestColumn];

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

  const calculateMobileLayout = () => {
    if (typeof window === "undefined") return [];

    const config = getResponsiveConfig();
    const containerWidth = window.innerWidth - config.containerPadding * 2;
    const minNoteWidth = config.noteWidth - 20;
    const columnsCount = Math.floor(
      (containerWidth + config.gridGap) / (minNoteWidth + config.gridGap)
    );
    const actualColumnsCount = Math.max(1, columnsCount);

    const availableWidthForNotes =
      containerWidth - (actualColumnsCount - 1) * config.gridGap;
    const noteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);

    const columnBottoms: number[] = new Array(actualColumnsCount).fill(
      config.containerPadding
    );

    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(
        note,
        noteWidth,
        config.notePadding
      );

      let bestColumn = 0;
      let minBottom = columnBottoms[0];

      for (let col = 1; col < actualColumnsCount; col++) {
        if (columnBottoms[col] < minBottom) {
          minBottom = columnBottoms[col];
          bestColumn = col;
        }
      }

      const x =
        config.containerPadding + bestColumn * (noteWidth + config.gridGap);
      const y = columnBottoms[bestColumn];

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

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
    }
  }, [boardId]);

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

  const fetchBoardData = async () => {
    try {
      const boardResponse = await fetch(`/api/boards/${boardId}`);
      if (boardResponse.status === 404) {
        setBoard(null);
        setLoading(false);
        return;
      }
      if (boardResponse.status === 401 || boardResponse.status === 403) {
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
    } catch (error) {
      console.error("Error fetching board data:", error);
    } finally {
      setLoading(false);
    }
  };

  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);

  const filteredNotes = useMemo(
    () =>
      filterAndSortNotes(
        notes,
        searchTerm,
        dateRange,
        selectedAuthor
      ),
    [notes, searchTerm, dateRange, selectedAuthor]
  );

  const layoutNotes = useMemo(
    () => (isMobile ? calculateMobileLayout() : calculateGridLayout()),
    [isMobile, filteredNotes, calculateMobileLayout, calculateGridLayout]
  );

  const boardHeight = useMemo(() => {
    if (layoutNotes.length === 0) {
      return "calc(100vh - 64px)";
    }

    const maxBottom = Math.max(
      ...layoutNotes.map((note) => note.y + note.height)
    );
    const minHeight =
      typeof window !== "undefined" && window.innerWidth < 768 ? 500 : 600;
    const calculatedHeight = Math.max(minHeight, maxBottom + 100);

    return `${calculatedHeight}px`;
  }, [layoutNotes]);

  if (loading) {
    return <FullPageLoader message="Loading board..." />;
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Board not found</h1>
          <p className="text-muted-foreground mb-4">
            This board doesn&apos;t exist or is not publicly accessible.
          </p>
          <Link href="/">
            <Button>Go to Gumboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-screen bg-background dark:bg-zinc-950">
      <div className="bg-card dark:bg-zinc-900 border-b border-border dark:border-zinc-800 shadow-sm">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex-shrink-0 pl-4 sm:pl-2 lg:pl-4">
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                Gumboard
              </h1>
            </Link>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm font-semibold text-foreground dark:text-zinc-100">
                {board.name}
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Public
              </span>
            </div>

            <div className="hidden md:block">
              <FilterPopover
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onDateRangeChange={(startDate, endDate) => {
                  setDateRange({ startDate, endDate });
                }}
                selectedAuthor={selectedAuthor}
                authors={uniqueAuthors}
                onAuthorChange={(authorId) => {
                  setSelectedAuthor(authorId);
                }}
                className="min-w-fit"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 px-3">
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
              </div>
              <input
                aria-label="Search notes"
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 border border-border dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-zinc-600 focus:border-transparent text-sm bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder:text-zinc-400"
              />
            </div>

            <Link href="/auth/signin">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: boardHeight }} ref={boardRef}>
        {layoutNotes.map((note) => (
          <div
            key={note.id}
            className="absolute transition-all duration-300 ease-out"
            style={{
              left: `${note.x}px`,
              top: `${note.y}px`,
              width: `${note.width}px`,
              height: `${note.height}px`,
            }}
          >
            <div
              className={`h-full rounded-lg shadow-md border-2 p-4 ${note.color} transition-all duration-200`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {note.user.name
                        ? note.user.name.charAt(0).toUpperCase()
                        : note.user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {note.user.name || note.user.email.split("@")[0]}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex-1 overflow-hidden">
                {note.checklistItems ? (
                  <div className="space-y-2">
                    {note.checklistItems
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            disabled
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span
                            className={`text-sm flex-1 ${
                              item.checked
                                ? "line-through text-gray-500 dark:text-gray-400"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {item.content}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredNotes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No notes found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || selectedAuthor || dateRange.startDate || dateRange.endDate
                  ? "Try adjusting your filters to see more notes."
                  : "This board doesn't have any notes yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
