import {
  cn,
  formatLastActivity,
  getUniqueAuthors,
  filterAndSortNotes,
} from "../utils";
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

describe("formatLastActivity utility function", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return 'Just now' for recent times", () => {
    const date = new Date("2024-01-15T11:59:30Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("Just now");
  });

  it("should return minutes for times less than 1 hour", () => {
    const date = new Date("2024-01-15T11:30:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("30m ago");
  });

  it("should return hours and minutes", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1h 30m ago");
  });

  it("should return only hours when minutes are 0", () => {
    const date = new Date("2024-01-15T10:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2h ago");
  });

  it("should return days and hours", () => {
    const date = new Date("2024-01-13T10:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2d 2h ago");
  });

  it("should return only days when hours are 0", () => {
    const date = new Date("2024-01-13T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2d ago");
  });

  it("should return weeks and days", () => {
    const date = new Date("2024-01-06T10:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1w 2d ago");
  });

  it("should return only weeks when days are 0", () => {
    const date = new Date("2024-01-08T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1w ago");
  });

  it("should return multiple weeks", () => {
    const date = new Date("2023-12-25T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("3w ago");
  });

  it("should return months and weeks", () => {
    const date = new Date("2023-12-01T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1mo 2w ago");
  });

  it("should return only months when weeks are 0", () => {
    const date = new Date("2023-11-15T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2mo ago");
  });

  it("should return multiple months", () => {
    const date = new Date("2023-07-15T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("6mo ago");
  });

  it("should return years and months", () => {
    const date = new Date("2022-10-15T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1y 3mo ago");
  });

  it("should return only years when months are 0", () => {
    const date = new Date("2023-01-15T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1y ago");
  });

  it("should return multiple years", () => {
    const date = new Date("2020-01-15T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("4y ago");
  });

  it("should return multiple years with months", () => {
    const date = new Date("2021-10-15T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2y 3mo ago");
  });
});

describe("getUniqueAuthors", () => {
  const notes: Note[] = [
    {
      id: "1",
      color: "",
      createdAt: "2024-01-10T12:00:00Z",
      updatedAt: "2024-01-10T12:00:00Z",
      boardId: "b1",
      user: { id: "1", name: "Alice", email: "alice@example.com" },
    },
    {
      id: "2",
      color: "",
      createdAt: "2024-01-15T12:00:00Z",
      updatedAt: "2024-01-15T12:00:00Z",
      boardId: "b1",
      user: { id: "2", name: "Bob", email: "bob@example.com" },
    },
    {
      id: "3",
      color: "",
      createdAt: "2024-02-01T12:00:00Z",
      updatedAt: "2024-02-01T12:00:00Z",
      boardId: "b1",
      user: { id: "1", name: "Alice", email: "alice@example.com" },
    },
    {
      id: "4",
      color: "",
      createdAt: "2024-03-01T12:00:00Z",
      updatedAt: "2024-03-01T12:00:00Z",
      boardId: "b1",
      user: { id: "3", name: null, email: "charlie@example.com" },
    },
  ];

  it("should return unique authors sorted alphabetically", () => {
    const authors = getUniqueAuthors(notes);
    expect(authors).toEqual([
      { id: "1", name: "Alice", email: "alice@example.com", image: undefined },
      { id: "2", name: "Bob", email: "bob@example.com", image: undefined },
      { id: "3", name: "charlie", email: "charlie@example.com", image: undefined },
    ]);
  });
});

describe("filterAndSortNotes", () => {
  const notes: Note[] = [
    {
      id: "1",
      color: "",
      createdAt: "2024-01-10T12:00:00Z",
      updatedAt: "2024-01-10T12:00:00Z",
      boardId: "b1",
      user: { id: "1", name: "Alice", email: "alice@example.com" },
    },
    {
      id: "2",
      color: "",
      createdAt: "2024-01-15T12:00:00Z",
      updatedAt: "2024-01-15T12:00:00Z",
      boardId: "b1",
      user: { id: "2", name: "Bob", email: "bob@example.com" },
    },
    {
      id: "3",
      color: "",
      createdAt: "2024-02-01T12:00:00Z",
      updatedAt: "2024-02-01T12:00:00Z",
      boardId: "b1",
      user: { id: "1", name: "Alice", email: "alice@example.com" },
    },
    {
      id: "4",
      color: "",
      createdAt: "2024-03-01T12:00:00Z",
      updatedAt: "2024-03-01T12:00:00Z",
      boardId: "b1",
      user: { id: "3", name: null, email: "charlie@example.com" },
    },
  ];

  const cloneNotes = () => notes.map((n) => ({ ...n, user: { ...n.user } }));

  it("should filter notes by author id", () => {
    const result = filterAndSortNotes(
      cloneNotes(),
      "",
      { startDate: null, endDate: null },
      "1"
    );
    expect(result.map((n) => n.id)).toEqual(["3", "1"]);
  });

  it("should return empty array when author has no notes", () => {
    const result = filterAndSortNotes(
      cloneNotes(),
      "",
      { startDate: null, endDate: null },
      "999"
    );
    expect(result).toEqual([]);
  });

  it("should filter notes within a date range", () => {
    const result = filterAndSortNotes(
      cloneNotes(),
      "",
      {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      },
      null
    );
    expect(result.map((n) => n.id)).toEqual(["2", "1"]);
  });

  it("should filter notes with only a start date", () => {
    const result = filterAndSortNotes(
      cloneNotes(),
      "",
      { startDate: new Date("2024-01-15"), endDate: null },
      null
    );
    expect(result.map((n) => n.id)).toEqual(["4", "3", "2"]);
  });

  it("should filter notes with only an end date", () => {
    const result = filterAndSortNotes(
      cloneNotes(),
      "",
      { startDate: null, endDate: new Date("2024-01-15") },
      null
    );
    expect(result.map((n) => n.id)).toEqual(["2", "1"]);
  });
});
