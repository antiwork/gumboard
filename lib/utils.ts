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

// Estimate multi-line text height for checklist items given available width
function estimateChecklistContentHeight(
  note: Note,
  availableWidth: number,
  addingChecklistItem?: string | null,
  editingContentOverrides?: Record<string, string>,
  measuredItemHeights?: Record<string, number>
) {
  const lineHeightPx = 20; // approx for text-sm
  const verticalPaddingPx = 8; // textarea py-1 => 0.25rem top + bottom
  const itemSpacingPx = 4; // space-y-1
  const averageCharWidthPx = 7; // heuristic average

  const charsPerLine = Math.max(1, Math.floor(availableWidth / averageCharWidthPx));

  const items = note.checklistItems ?? [];

  let total = 0;
  for (const item of items) {
    const key = `${note.id}:${item.id}`;
    const measured = measuredItemHeights?.[key];
    if (typeof measured === "number" && measured > 0) {
      total += measured;
      continue;
    }

    const effectiveContent = editingContentOverrides?.[key] ?? item.content;
    const segments = effectiveContent.split("\n");
    let lines = 0;
    for (const segment of segments) {
      const len = segment.length === 0 ? 1 : segment.length;
      lines += Math.max(1, Math.ceil(len / charsPerLine));
    }
    total += lines * lineHeightPx + verticalPaddingPx;
  }

  if (items.length > 1) {
    total += (items.length - 1) * itemSpacingPx;
  }

  if (addingChecklistItem === note.id) {
    total += lineHeightPx + verticalPaddingPx;
  }

  return total;
}

// Helper function to calculate note height based on content
export function calculateNoteHeight(
  note: Note,
  noteWidth?: number,
  notePadding?: number,
  addingChecklistItem?: string | null,
  editingContentOverrides?: Record<string, string>,
  measuredItemHeights?: Record<string, number>
) {
  const config = getResponsiveConfig();
  const actualNotePadding = notePadding || config.notePadding;

  const headerHeight = 60;
  const paddingHeight = actualNotePadding * 2;
  const minContentHeight = 60;

  const assumedLeftGutterForCheckboxAndGaps = 40; // checkbox + gap + textarea padding
  const contentWidth = Math.max(
    120,
    (noteWidth || config.noteWidth) - actualNotePadding * 2 - assumedLeftGutterForCheckboxAndGaps
  );

  const dynamicChecklistHeight = estimateChecklistContentHeight(
    note,
    contentWidth,
    addingChecklistItem,
    editingContentOverrides,
    measuredItemHeights
  );

  const totalChecklistHeight = Math.max(minContentHeight, dynamicChecklistHeight);

  return headerHeight + paddingHeight + totalChecklistHeight;
}

// Helper function to calculate bin-packed layout for desktop
export function calculateGridLayout(filteredNotes: Note[], addingChecklistItem?: string | null) {
  // Back-compat overload
  return calculateGridLayoutWithEditing(filteredNotes, addingChecklistItem, undefined);
}

export function calculateGridLayoutWithEditing(
  filteredNotes: Note[],
  addingChecklistItem?: string | null,
  editingContentOverrides?: Record<string, string>,
  measuredItemHeights?: Record<string, number>
) {
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
      addingChecklistItem,
      editingContentOverrides,
      measuredItemHeights
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
  // Back-compat overload
  return calculateMobileLayoutWithEditing(filteredNotes, addingChecklistItem, undefined);
}

export function calculateMobileLayoutWithEditing(
  filteredNotes: Note[],
  addingChecklistItem?: string | null,
  editingContentOverrides?: Record<string, string>,
  measuredItemHeights?: Record<string, number>
) {
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
      addingChecklistItem,
      editingContentOverrides,
      measuredItemHeights
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
