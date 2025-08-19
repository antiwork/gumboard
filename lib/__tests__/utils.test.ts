import { cn, formatLastActivity } from "../utils";

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

  it("should return 'Just now' for times less than 1 minute ago", () => {
    const date = new Date("2024-01-15T11:59:30Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("Just now");
  });

  it("should return minutes for times less than 1 hour ago", () => {
    const date = new Date("2024-01-15T11:30:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("30m ago");
  });

  it("should return hours for times less than 1 day ago", () => {
    const date = new Date("2024-01-15T10:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2h ago");
  });

  it("should return days for times less than 1 week ago", () => {
    const date = new Date("2024-01-13T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2d ago");
  });

  it("should return days and hours for times with partial hours", () => {
    const date = new Date("2024-01-13T11:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("2d 1h ago");
  });

  it("should return only days when there are no remaining hours", () => {
    const date = new Date("2024-01-12T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("3d ago");
  });

  it("should return date for times more than 1 week ago", () => {
    const date = new Date("2024-01-01T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1/1/2024");
  });

  it("should handle edge case of exactly 1 minute", () => {
    const date = new Date("2024-01-15T11:59:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1m ago");
  });

  it("should handle edge case of exactly 1 hour", () => {
    const date = new Date("2024-01-15T11:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1h ago");
  });

  it("should handle edge case of exactly 1 day", () => {
    const date = new Date("2024-01-14T12:00:00Z");
    const result = formatLastActivity(date.toISOString());
    expect(result).toBe("1d ago");
  });
});
