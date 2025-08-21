import { cn, formatRelativeTime } from "../utils";

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

describe("formatRelativeTime utility function", () => {
  beforeEach(() => {
    // Mock the current time to a specific date for consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return 'just now' for very recent times", () => {
    const recent = new Date("2024-01-15T11:59:30Z"); // 30 seconds ago
    expect(formatRelativeTime(recent)).toBe("just now");
  });

  it("should return minutes for times less than an hour ago", () => {
    const thirtyMinutesAgo = new Date("2024-01-15T11:30:00Z");
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe("30m ago");
  });

  it("should return hours for times less than a day ago", () => {
    const threeHoursAgo = new Date("2024-01-15T09:00:00Z");
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("should return 'yesterday' for one day ago", () => {
    const yesterday = new Date("2024-01-14T12:00:00Z");
    expect(formatRelativeTime(yesterday)).toBe("yesterday");
  });

  it("should return days for times less than a week ago", () => {
    const threeDaysAgo = new Date("2024-01-12T12:00:00Z");
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago");
  });

  it("should return weeks for times less than a month ago", () => {
    const twoWeeksAgo = new Date("2024-01-01T12:00:00Z");
    expect(formatRelativeTime(twoWeeksAgo)).toBe("2w ago");
  });

  it("should return localized date for older times", () => {
    const monthsAgo = new Date("2023-10-15T12:00:00Z");
    const result = formatRelativeTime(monthsAgo);
    expect(result).toBe(monthsAgo.toLocaleDateString());
  });

  it("should handle string dates", () => {
    const dateString = "2024-01-15T11:30:00Z";
    expect(formatRelativeTime(dateString)).toBe("30m ago");
  });
});
