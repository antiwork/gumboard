import { Note } from "@/components/note";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getResponsiveConfig() {
  if (typeof window === "undefined") {
    return { noteWidth: 320, gridGap: 20, containerPadding: 20, notePadding: 16 };
  }

  const width = window.innerWidth;

  if (width >= 1920) {
    return { noteWidth: 340, gridGap: 24, containerPadding: 32, notePadding: 18 };
  } else if (width >= 1200) {
    return { noteWidth: 320, gridGap: 20, containerPadding: 24, notePadding: 16 };
  } else if (width >= 768) {
    return { noteWidth: 300, gridGap: 16, containerPadding: 20, notePadding: 16 };
  } else if (width >= 600) {
    return { noteWidth: 280, gridGap: 16, containerPadding: 16, notePadding: 14 };
  } else {
    return { noteWidth: 260, gridGap: 12, containerPadding: 12, notePadding: 12 };
  }
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

// Helper function to calculate note height based on content
export function calculateNoteHeight(
  note: Note,
  noteWidth?: number,
  notePadding?: number,
  addingChecklistItem?: string | null
) {
  const config = getResponsiveConfig();
  const actualNotePadding = notePadding || config.notePadding;

  const headerHeight = 60;
  const paddingHeight = actualNotePadding * 2;
  const minContentHeight = 60;

  const itemHeight = 32;
  const itemSpacing = 4;
  const checklistItemsCount = note.checklistItems?.length || 0;
  const addingItemHeight = addingChecklistItem === note.id ? 32 : 0;
  const addTaskButtonHeight = 36;

  const checklistHeight =
    checklistItemsCount * itemHeight +
    (checklistItemsCount > 0 ? (checklistItemsCount - 1) * itemSpacing : 0) +
    addingItemHeight;
  const totalChecklistHeight = Math.max(minContentHeight, checklistHeight);

  return headerHeight + paddingHeight + totalChecklistHeight + addTaskButtonHeight;
}

// Helper function to calculate bin-packed layout for desktop
export function calculateGridLayout(filteredNotes: Note[], addingChecklistItem?: string | null) {
  if (typeof window === "undefined") return [];

  const config = getResponsiveConfig();
  const containerWidth = window.innerWidth - config.containerPadding * 2;
  const noteWidthWithGap = config.noteWidth + config.gridGap;
  const columnsCount = Math.floor((containerWidth + config.gridGap) / noteWidthWithGap);
  const actualColumnsCount = Math.max(1, columnsCount);

  const availableWidthForNotes = containerWidth - (actualColumnsCount - 1) * config.gridGap;
  const calculatedNoteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);
  const minWidth = config.noteWidth - 40;
  const maxWidth = config.noteWidth + 80;
  const adjustedNoteWidth = Math.max(minWidth, Math.min(maxWidth, calculatedNoteWidth));

  const offsetX = config.containerPadding;

  const columnBottoms: number[] = new Array(actualColumnsCount).fill(config.containerPadding);

  return filteredNotes.map((note) => {
    const noteHeight = calculateNoteHeight(
      note,
      adjustedNoteWidth,
      config.notePadding,
      addingChecklistItem
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
}

// Helper function to calculate mobile layout (optimized single/double column)
export function calculateMobileLayout(filteredNotes: Note[], addingChecklistItem?: string | null) {
  if (typeof window === "undefined") return [];

  const config = getResponsiveConfig();
  const containerWidth = window.innerWidth - config.containerPadding * 2;
  const minNoteWidth = config.noteWidth - 20;
  const columnsCount = Math.floor(
    (containerWidth + config.gridGap) / (minNoteWidth + config.gridGap)
  );
  const actualColumnsCount = Math.max(1, columnsCount);

  const availableWidthForNotes = containerWidth - (actualColumnsCount - 1) * config.gridGap;
  const noteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);

  const columnBottoms: number[] = new Array(actualColumnsCount).fill(config.containerPadding);

  return filteredNotes.map((note) => {
    const noteHeight = calculateNoteHeight(
      note,
      noteWidth,
      config.notePadding,
      addingChecklistItem
    );

    let bestColumn = 0;
    let minBottom = columnBottoms[0];

    for (let col = 1; col < actualColumnsCount; col++) {
      if (columnBottoms[col] < minBottom) {
        minBottom = columnBottoms[col];
        bestColumn = col;
      }
    }

    const x = config.containerPadding + bestColumn * (noteWidth + config.gridGap);
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
