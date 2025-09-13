import { Note } from "@/components/note";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLastActivity(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  if (diffMs < minute) return "Just now";

  let years = now.getFullYear() - date.getFullYear();
  let months = now.getMonth() - date.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (now.getDate() < date.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }

  if (years > 0) {
    if (years > 1) {
      return months > 0 ? `${years}y ${months}mo ago` : `${years}y ago`;
    } else {
      return months > 0 ? `1y ${months}mo ago` : "1y ago";
    }
  }

  if (months > 0) {
    const tempDate = new Date(date);
    tempDate.setMonth(tempDate.getMonth() + months);
    const remainingMs = now.getTime() - tempDate.getTime();
    const weeks = Math.floor(remainingMs / week);

    if (months > 1) {
      return weeks > 0 ? `${months}mo ${weeks}w ago` : `${months}mo ago`;
    } else {
      return weeks > 0 ? `1mo ${weeks}w ago` : "1mo ago";
    }
  }

  if (diffMs >= week) {
    const weeks = Math.floor(diffMs / week);
    const remainingMs = diffMs % week;
    const days = Math.floor(remainingMs / day);

    if (weeks > 1) {
      return days > 0 ? `${weeks}w ${days}d ago` : `${weeks}w ago`;
    } else {
      return days > 0 ? `1w ${days}d ago` : "1w ago";
    }
  }

  const days = Math.floor(diffMs / day);
  const hours = Math.floor((diffMs % day) / hour);
  const minutes = Math.floor((diffMs % hour) / minute);

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
  } else if (hours > 0) {
    parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
  } else if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  if (parts.length === 0) return "Just now";
  return `${parts.join(" ")} ago`;
}

export function getBaseUrl(requestOrHeaders?: Request | Headers): string {
  if (requestOrHeaders && "url" in requestOrHeaders) {
    const url = new URL(requestOrHeaders.url);
    return `${url.protocol}//${url.host}`;
  }

  if (requestOrHeaders && "get" in requestOrHeaders) {
    const host = requestOrHeaders.get("host");
    const protocol = requestOrHeaders.get("x-forwarded-proto") || "http";
    return `${protocol}://${host}`;
  }

  return process.env.AUTH_URL || "http://localhost:3000";
}

export function getUniqueAuthors(notes: Note[]) {
  const authorsMap = new Map<
    string,
    { id: string; name: string; email: string; image?: string | null }
  >();

  notes.forEach((note) => {
    if (!authorsMap.has(note.user.id)) {
      authorsMap.set(note.user.id, {
        id: note.user.id,
        name: note.user.name || note.user.email.split("@")[0],
        email: note.user.email,
        image: note.user.image,
      });
    }
  });

  return Array.from(authorsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Filter and sort notes based on search term, date range, and author
export function filterAndSortNotes(
  notes: Note[],
  searchTerm: string,
  dateRange: { startDate: Date | null; endDate: Date | null },
  authorId: string | null,
  currentUser?: { id: string } | null
): Note[] {
  let filteredNotes = notes;

  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    filteredNotes = filteredNotes.filter((note) => {
      const authorName = (note.user.name || note.user.email).toLowerCase();
      const checklistContent =
        note.checklistItems?.map((item) => item.content.toLowerCase()).join(" ") || "";
      return authorName.includes(search) || checklistContent.includes(search);
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

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return filteredNotes;
}

export function getBoardColumns(columnCount: number, notes: Note[]) {
  let columns: Note[][] = [];
  if (notes.length > 0) {
    columns = Array.from({ length: columnCount }, () => []);
    notes.forEach((note, index) => {
      const columnIndex = index % columnCount;
      columns[columnIndex].push(note);
    });
  }
  return columns;
}
