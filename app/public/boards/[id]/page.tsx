"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";
import { BetaBadge } from "@/components/ui/beta-badge";
import { FullPageLoader } from "@/components/ui/loader";
import { FilterPopover } from "@/components/ui/filter-popover";
import type { Note, Board } from "@/components/note";
import { Note as NoteCard } from "@/components/note";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { useUser } from "@/app/contexts/UserContext";
import {
  getResponsiveConfig,
  getUniqueAuthors,
  calculateGridLayout,
  calculateMobileLayout,
  filterAndSortNotes,
} from "@/lib/utils";

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
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
  const { user } = useUser();

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
        }
      }

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
  };

  const uniqueAuthors = useMemo(() => getUniqueAuthors(notes), [notes]);

  const filteredNotes = useMemo(
    () => filterAndSortNotes(notes, searchTerm, dateRange, selectedAuthor, null),
    [notes, searchTerm, dateRange, selectedAuthor]
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

  if (loading) {
    return <FullPageLoader message="Loading board..." />;
  }

  if (!board) {
    return (
      <div className="min-h-screen dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Board not found</h1>
          <p className="text-muted-foreground mb-4">
            This board doesn&apos;t exist or is not publicly accessible.
          </p>

          <Button asChild variant="outline">
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
          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center w-full sm:w-auto">
            <Link href="/" className="flex-shrink-0 pl-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                Gumboard
                <BetaBadge />
              </h1>
            </Link>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />
            <div className="flex-1 mr-0 sm:flex-none">
              <div className="text-sm font-semibold text-foreground dark:text-zinc-100">
                {board.name}
              </div>
            </div>
            <div className="h-6 w-px m-1.5 bg-zinc-100 dark:bg-zinc-700" />
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Public
            </span>

            <div className="board-dropdown mr-0 pl-4" data-slot="filter-popover">
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
                className="w-fit"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 rounded-lg dark:border-zinc-800 mt-2 py-2 px-3 flex flex-wrap sm:flex-nowrap items-center sm:space-x-3 w-full sm:w-auto">
            <div className="flex justify-between gap-2 items-center w-full sm:w-auto">
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
              </div>
              {user ? (
                <ProfileDropdown user={user} />
              ) : (
                <Link href="/auth/signin">
                  <Button variant="outline" size="sm">
                    Sign in
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative w-full"
        style={{
          height: boardHeight,
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div className="relative w-full h-full">
          {layoutNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note as Note}
              readonly={true}
              className="shadow-md shadow-black/10 absolute"
              style={{
                position: "absolute",
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                padding: `${getResponsiveConfig().notePadding}px`,
              }}
            />
          ))}
        </div>

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
