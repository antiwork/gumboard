"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FullPageLoader } from "@/components/ui/loader";
import { BoardHeader } from "@/components/board-header";
import { BoardNotesDisplay } from "@/components/board-notes-display";
import { BoardLayout } from "@/components/board-layout";
import { useUser } from "@/app/contexts/UserContext";
import { useBoardData } from "@/lib/hooks/useBoardData";
import { useTheme } from "next-themes";

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [boardId, setBoardId] = useState<string | null>(null);
  const { user } = useUser();
  const { resolvedTheme } = useTheme();

  // Use shared hook for all board logic
  const {
    board,
    loading,
    searchTerm,
    dateRange,
    selectedAuthor,
    uniqueAuthors,
    filteredNotes,
    layoutNotes,
    boardHeight,
    updateSearch,
    updateDateRange,
    updateAuthor,
    clearFilters,
  } = useBoardData({
    boardId,
    isPublicView: true,
    currentUser: user,
  });

  // Initialize board ID from params
  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setBoardId(resolvedParams.id);
    };
    initializeParams();
  }, [params]);

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
    <BoardLayout isPublicView={true}>
      <BoardHeader
        board={board}
        isPublicView={true}
        user={user}
        searchTerm={searchTerm}
        onSearchChange={updateSearch}
        dateRange={dateRange}
        onDateRangeChange={updateDateRange}
        selectedAuthor={selectedAuthor}
        authors={uniqueAuthors}
        onAuthorChange={updateAuthor}
      />

      <BoardNotesDisplay
        layoutNotes={layoutNotes}
        filteredNotes={filteredNotes}
        boardHeight={boardHeight}
        searchTerm={searchTerm}
        selectedAuthor={selectedAuthor}
        dateRange={dateRange}
        uniqueAuthors={uniqueAuthors}
        onClearFilters={clearFilters}
        isReadonly={true}
        resolvedTheme={resolvedTheme}
        noteClassName="shadow-md shadow-black/10"
      />
    </BoardLayout>
  );
}
