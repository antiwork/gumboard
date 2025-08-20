"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FullPageLoader } from "@/components/ui/loader";
import type { Note, Board } from "@/components/note";
import { Note as NoteCard } from "@/components/note";
import { useUser } from "@/app/contexts/UserContext";
import { BoardTopbar } from "@/components/board-topbar";
import { getUniqueAuthors, filterAndSortNotes, getBoardColumns } from "@/lib/utils";
import { useBoardColumnMeta } from "@/lib/hooks";

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const columnMeta = useBoardColumnMeta();
  const [boardId, setBoardId] = useState<string | null>(null);
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
      // Set board to null to trigger the not-found UI
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

  const columnsData = useMemo(() => {
    return getBoardColumns(columnMeta.count, filteredNotes);
  }, [columnMeta, filteredNotes]);

  if (loading) {
    return <FullPageLoader message="Loading board..." />;
  }

  if (!board) {
    return (
      <div className="min-h-screen dark:bg-zinc-950 dark:text-zinc-100 flex items-center justify-center ">
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
      <div className="">
        <BoardTopbar
          boardId={boardId}
          board={board}
          user={user}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateRange={dateRange}
          setDateRange={setDateRange}
          selectedAuthor={selectedAuthor}
          setSelectedAuthor={setSelectedAuthor}
          uniqueAuthors={uniqueAuthors}
          isPublic={true}
        />
      </div>

      <div ref={boardRef} className="relative min-h-[calc(100vh-65px)] p-3 md:p-5 w-full">
        <div className={`flex gap-${columnMeta.gap}`}>
          {columnsData.map((column, index) => (
            <div key={index} className="flex-1 flex flex-col gap-4">
              {column.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note as Note}
                  readonly={true}
                  className="shadow-md shadow-black/10 p-4"
                />
              ))}
            </div>
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
