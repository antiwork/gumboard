import type { DashboardBoard } from "@/app/dashboard/page";
import type { SortOption } from "@/components/boards-toolbar";

export function getAllTags(boards: DashboardBoard[]): string[] {
  const tagSet = new Set<string>();
  boards.forEach((board) => {
    board.tags?.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

export function filterBoardsByTags(
  boards: DashboardBoard[],
  selectedTags: string[]
): DashboardBoard[] {
  if (selectedTags.length === 0) return boards;

  return boards.filter((board) => {
    return selectedTags.every((tag) => board.tags?.includes(tag));
  });
}

export function sortBoards(boards: DashboardBoard[], sortBy: SortOption): DashboardBoard[] {
  const [sortKey, order] = sortBy.split("|") as [string, "asc" | "desc"];

  return [...boards].sort((a, b) => {
    let comparison = 0;

    switch (sortKey) {
      case "title":
        comparison = a.name.localeCompare(b.name);
        break;
      case "notesCount":
        comparison = a._count.notes - b._count.notes;
        break;
      case "updatedAt":
      default:
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }

    if (order === "desc") {
      comparison = -comparison;
    }

    if (comparison === 0) {
      comparison = a.name.localeCompare(b.name);
      if (comparison === 0) {
        comparison = a.id.localeCompare(b.id);
      }
    }

    return comparison;
  });
}

export function parseUrlParams(searchParams: URLSearchParams): {
  sort: SortOption;
  tags: string[];
} {
  const sort = searchParams.get("sort");
  const order = searchParams.get("order");
  const tagsParam = searchParams.get("tags");

  let sortOption: SortOption = "updatedAt|desc";

  if (sort && order) {
    const combined = `${sort}|${order}` as SortOption;
    const validOptions: SortOption[] = [
      "updatedAt|desc",
      "title|asc",
      "title|desc",
      "notesCount|desc",
      "notesCount|asc",
    ];

    if (validOptions.includes(combined)) {
      sortOption = combined;
    }
  }

  const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : [];

  return { sort: sortOption, tags };
}

export function updateUrl(sort: SortOption, tags: string[], replace = false) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const [sortKey, order] = sort.split("|");

  if (sort === "updatedAt|desc") {
    url.searchParams.delete("sort");
    url.searchParams.delete("order");
  } else {
    url.searchParams.set("sort", sortKey);
    url.searchParams.set("order", order);
  }

  if (tags.length > 0) {
    url.searchParams.set("tags", tags.join(","));
  } else {
    url.searchParams.delete("tags");
  }

  // Update URL
  if (replace) {
    window.history.replaceState({}, "", url.toString());
  } else {
    window.history.pushState({}, "", url.toString());
  }
}

export function loadPreferences(): { sort: SortOption; tags: string[] } {
  try {
    const stored = localStorage.getItem("dashboard.boardSortFilter");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        sort: parsed.sort || "updatedAt|desc",
        tags: parsed.tags || [],
      };
    }
  } catch (error) {
    console.warn("Failed to load board preferences:", error);
  }

  return { sort: "updatedAt|desc", tags: [] };
}

export function savePreferences(sort: SortOption, tags: string[]) {
  try {
    localStorage.setItem("dashboard.boardSortFilter", JSON.stringify({ sort, tags }));
  } catch (error) {
    console.warn("Failed to save board preferences:", error);
  }
}
