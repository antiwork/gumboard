// Shared utilities for note operations
import type { Note, User } from "@/components/note";

export function getUniqueAuthors(notes: Note[]) {
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
}

export function filterAndSortNotes(
  notes: Note[],
  searchTerm: string,
  dateRange: { startDate: Date | null; endDate: Date | null },
  authorId: string | null,
  currentUser: User | null
): Note[] {
  let filteredNotes = notes;

  // Filter by search term
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    filteredNotes = filteredNotes.filter((note) => {
      const authorName = (note.user.name || note.user.email).toLowerCase();
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
  if (currentUser) {
    return filteredNotes.sort((a, b) => {
      const aIsCurrentUser = a.user.id === currentUser.id;
      const bIsCurrentUser = b.user.id === currentUser.id;

      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  return filteredNotes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
