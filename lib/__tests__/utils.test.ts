import { cn, getColumnDetails, calculateColumnsData, getResponsiveGapClass } from "../utils";
import type { Note } from "@/components/note";

describe("cn utility function", () => {
  it("should combine class names correctly", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    const result = cn("base", true && "conditional", false && "hidden");
    expect(result).toBe("base conditional");
  });

  it("should merge conflicting Tailwind classes", () => {
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle undefined and null values", () => {
    const result = cn("base", undefined, null, "end");
    expect(result).toBe("base end");
  });
});

describe("Layout utility functions", () => {
  describe("getColumnDetails", () => {
    it("should return 1 column for small screens", () => {
      const result = getColumnDetails(500);
      expect(result).toEqual({ count: 1, gap: 0 });
    });

    it("should return 2 columns for medium screens", () => {
      const result = getColumnDetails(700);
      expect(result).toEqual({ count: 2, gap: 2 });
    });

    it("should return 2 columns with gap 6 for large screens", () => {
      const result = getColumnDetails(900);
      expect(result).toEqual({ count: 2, gap: 6 });
    });

    it("should return 3 columns for extra large screens", () => {
      const result = getColumnDetails(1100);
      expect(result).toEqual({ count: 3, gap: 2 });
    });

    it("should calculate columns for very large screens", () => {
      const result = getColumnDetails(1500);
      expect(result.count).toBeGreaterThan(3);
      expect(result.gap).toBe(4);
    });

    it("should handle edge cases", () => {
      expect(getColumnDetails(0)).toEqual({ count: 1, gap: 0 });
      expect(getColumnDetails(576)).toEqual({ count: 2, gap: 2 });
      expect(getColumnDetails(768)).toEqual({ count: 2, gap: 6 });
      expect(getColumnDetails(992)).toEqual({ count: 3, gap: 2 });
      expect(getColumnDetails(1200)).toEqual({ count: 3, gap: 4 }); // 1200/430 = 2.79, ceil = 3, gap = 4
    });
  });

  describe("calculateColumnsData", () => {
    const mockNotes = [
      {
        id: "1",
        color: "#fef3c7",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        boardId: "board1",
        user: { id: "user1", name: "User 1", email: "user1@example.com" },
        checklistItems: [],
      },
      {
        id: "2",
        color: "#fef3c7",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        boardId: "board1",
        user: { id: "user1", name: "User 1", email: "user1@example.com" },
        checklistItems: [],
      },
      {
        id: "3",
        color: "#fef3c7",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        boardId: "board1",
        user: { id: "user1", name: "User 1", email: "user1@example.com" },
        checklistItems: [],
      },
      {
        id: "4",
        color: "#fef3c7",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        boardId: "board1",
        user: { id: "user1", name: "User 1", email: "user1@example.com" },
        checklistItems: [],
      },
      {
        id: "5",
        color: "#fef3c7",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        boardId: "board1",
        user: { id: "user1", name: "User 1", email: "user1@example.com" },
        checklistItems: [],
      },
    ] as Note[];

    it("should distribute notes across columns", () => {
      const result = calculateColumnsData(mockNotes, { count: 2, gap: 2 });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(3);
      expect(result[1]).toHaveLength(2);
    });

    it("should handle single column", () => {
      const result = calculateColumnsData(mockNotes, { count: 1, gap: 0 });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(5);
    });

    it("should handle three columns", () => {
      const result = calculateColumnsData(mockNotes, { count: 3, gap: 2 });
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(2);
      expect(result[2]).toHaveLength(1);
    });

    it("should handle empty notes array", () => {
      const result = calculateColumnsData([], { count: 3, gap: 4 });
      expect(result).toHaveLength(0);
    });

    it("should handle more columns than notes", () => {
      const result = calculateColumnsData(mockNotes.slice(0, 2), { count: 4, gap: 2 });
      expect(result).toHaveLength(4);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(0);
      expect(result[3]).toHaveLength(0);
    });
  });

  describe("getResponsiveGapClass", () => {
    it("should return correct Tailwind gap classes", () => {
      expect(getResponsiveGapClass(0)).toBe("gap-0");
      expect(getResponsiveGapClass(2)).toBe("gap-2");
      expect(getResponsiveGapClass(4)).toBe("gap-4");
      expect(getResponsiveGapClass(6)).toBe("gap-6");
    });

    it("should return default gap-4 for unknown values", () => {
      expect(getResponsiveGapClass(10)).toBe("gap-4");
      expect(getResponsiveGapClass(-1)).toBe("gap-4");
      expect(getResponsiveGapClass(3)).toBe("gap-4");
      expect(getResponsiveGapClass(5)).toBe("gap-4");
    });

    it("should handle edge cases", () => {
      expect(getResponsiveGapClass(Number.MAX_SAFE_INTEGER)).toBe("gap-4");
      expect(getResponsiveGapClass(Number.MIN_SAFE_INTEGER)).toBe("gap-4");
      expect(getResponsiveGapClass(NaN)).toBe("gap-4");
    });
  });
});
