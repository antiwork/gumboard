import { Note } from "@/components/note";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  differenceInYears,
  differenceInMonths,
  differenceInWeeks,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export function formateDate(updatedAt: string): string {
  const updated = new Date(updatedAt);
  const now = new Date();

  const seconds = differenceInSeconds(now, updated);
  if (seconds < 60) return "Last activity: now";

  const minutes = differenceInMinutes(now, updated);
  const hours = differenceInHours(now, updated);
  const days = differenceInDays(now, updated);
  const weeks = differenceInWeeks(now, updated);
  const months = differenceInMonths(now, updated);
  const years = differenceInYears(now, updated);

  let result = "Last activity: ";

  if (years > 0) {
    result += `${years}y`;
    const remainingMonths = months % 12;
    if (remainingMonths > 0) result += ` ${remainingMonths}mon`;
  } else if (months > 0) {
    result += `${months}m`;
    const remainingWeeks = weeks % 4;
    if (remainingWeeks > 0) result += ` ${remainingWeeks}w`;
  } else if (weeks > 0) {
    result += `${weeks}w`;
    const remainingDays = days % 7;
    if (remainingDays > 0) result += ` ${remainingDays}d`;
  } else if (days > 0) {
    result += `${days}d`;
    const remainingHours = hours % 24;
    if (remainingHours > 0) result += ` ${remainingHours}h`;
  } else if (hours > 0) {
    result += `${hours}h`;
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) result += ` ${remainingMinutes}m ago`;
  } else {
    result += `${minutes}m ago`;
  }

  return result.trim();
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
