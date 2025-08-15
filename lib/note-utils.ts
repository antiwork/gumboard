import type { Note, User } from "@/components/note";

export function getUniqueAuthors(notes: Note[]) {
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    return [];
  }

  const authorsMap = new Map<string, { id: string; name: string; email: string; image?: string | null }>();

  notes.forEach((note) => {
    if (note && note.user && note.user.id && note.user.email) {
      if (!authorsMap.has(note.user.id)) {
        authorsMap.set(note.user.id, {
          id: note.user.id,
          name: note.user.name || note.user.email.split("@")[0],
          email: note.user.email,
          image: note.user.image || null,
        });
      }
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
  if (!notes || !Array.isArray(notes)) {
    return [];
  }

  let filteredNotes = notes;

  if (searchTerm && searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    filteredNotes = filteredNotes.filter((note) => {
      if (!note || !note.user) return false;
      
      const authorName = (note.user.name || note.user.email || "").toLowerCase();
      const checklistContent =
        note.checklistItems?.map((item) => item?.content || "").join(" ") || "";
      return authorName.includes(search) || checklistContent.includes(search);
    });
  }

  if (authorId) {
    filteredNotes = filteredNotes.filter((note) => note && note.user && note.user.id === authorId);
  }

  if (dateRange && (dateRange.startDate || dateRange.endDate)) {
    filteredNotes = filteredNotes.filter((note) => {
      if (!note || !note.createdAt) return false;
      
      const noteDate = new Date(note.createdAt);
      if (isNaN(noteDate.getTime())) return false;
      
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

  if (currentUser && currentUser.id) {
    return filteredNotes.sort((a, b) => {
      if (!a || !b || !a.user || !b.user) return 0;
      
      const aIsCurrentUser = a.user.id === currentUser.id;
      const bIsCurrentUser = b.user.id === currentUser.id;

      if (aIsCurrentUser && !bIsCurrentUser) return -1;
      if (!aIsCurrentUser && bIsCurrentUser) return 1;

      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }

  return filteredNotes.sort((a, b) => {
    if (!a || !b) return 0;
    
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });
}
