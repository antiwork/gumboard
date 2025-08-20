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

  const checklistHeight =
    checklistItemsCount * itemHeight +
    (checklistItemsCount > 0 ? (checklistItemsCount - 1) * itemSpacing : 0) +
    addingItemHeight;
  const totalChecklistHeight = Math.max(minContentHeight, checklistHeight);

  return headerHeight + paddingHeight + totalChecklistHeight;
}

// Helper function to get actual container width for layout calculations
function getActualContainerWidth(): number {
  if (typeof window === "undefined") return 1200; // Default fallback

  // Try to get the actual viewport width, accounting for dev tools simulation
  const viewportWidth = Math.min(
    window.innerWidth,
    document.documentElement.clientWidth,
    window.screen?.availWidth || window.innerWidth
  );

  // For very small widths (likely dev tools mobile simulation), ensure minimum usable space
  return Math.max(viewportWidth, 280);
}

// Helper function to calculate bin-packed layout for desktop
export function calculateGridLayout(
  filteredNotes: Note[],
  addingChecklistItem?: string | null,
  containerElement?: Element | null
) {
  if (typeof window === "undefined") return [];

  const config = getResponsiveConfig();

  // Use container element width if available, otherwise fallback to viewport calculations
  let containerWidth: number;
  if (containerElement) {
    const rect = containerElement.getBoundingClientRect();
    containerWidth = Math.max(rect.width - config.containerPadding * 2, 280);
  } else {
    const actualViewportWidth = getActualContainerWidth();
    containerWidth = actualViewportWidth - config.containerPadding * 2;
  }

  const noteWidthWithGap = config.noteWidth + config.gridGap;
  const columnsCount = Math.floor((containerWidth + config.gridGap) / noteWidthWithGap);
  const actualColumnsCount = Math.max(1, columnsCount);

  const availableWidthForNotes = containerWidth - (actualColumnsCount - 1) * config.gridGap;
  const calculatedNoteWidth = Math.floor(availableWidthForNotes / actualColumnsCount);
  const minWidth = Math.min(config.noteWidth - 40, containerWidth * 0.8); // Ensure notes don't exceed container
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
export function calculateMobileLayout(
  filteredNotes: Note[],
  addingChecklistItem?: string | null,
  containerElement?: Element | null
) {
  if (typeof window === "undefined") return [];

  const config = getResponsiveConfig();

  // Use container element width if available, otherwise fallback to viewport calculations
  let containerWidth: number;
  if (containerElement) {
    const rect = containerElement.getBoundingClientRect();
    containerWidth = Math.max(rect.width - config.containerPadding * 2, 260);
  } else {
    const actualViewportWidth = getActualContainerWidth();
    containerWidth = actualViewportWidth - config.containerPadding * 2;
  }

  const minNoteWidth = Math.min(config.noteWidth - 20, containerWidth * 0.85); // Ensure notes fit in container
  const columnsCount = Math.floor(
    (containerWidth + config.gridGap) / (minNoteWidth + config.gridGap)
  );
  const actualColumnsCount = Math.max(1, columnsCount);

  const availableWidthForNotes = containerWidth - (actualColumnsCount - 1) * config.gridGap;
  const noteWidth = Math.max(minNoteWidth, Math.floor(availableWidthForNotes / actualColumnsCount));

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

// Convert positioned notes from layout functions into columns for flexbox rendering
export function convertPositionedNotesToColumns(
  positionedNotes: Array<Note & { x: number; y: number; width: number; height: number }>
): Array<Array<Note & { x: number; y: number; width: number; height: number }>> {
  if (positionedNotes.length === 0) return [];

  // Group notes by their x position (which represents columns)
  const columnMap = new Map<
    number,
    Array<Note & { x: number; y: number; width: number; height: number }>
  >();

  positionedNotes.forEach((note) => {
    const columnX = note.x;
    if (!columnMap.has(columnX)) {
      columnMap.set(columnX, []);
    }
    columnMap.get(columnX)!.push(note);
  });

  // Convert to array of columns, sorted by x position (left to right)
  const columns = Array.from(columnMap.entries())
    .sort(([a], [b]) => a - b) // Sort columns by x position
    .map(([, notes]) => notes.sort((a, b) => a.y - b.y)); // Sort notes within each column by y position (top to bottom)

  return columns;
}
