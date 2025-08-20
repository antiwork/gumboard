import { addDays, addHours, addMinutes, addSeconds } from "date-fns";
import { cn, formateDate } from "../utils";

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

describe("formateDate", () => {
  const now = new Date();

  it("should return 'now' for less than 60 seconds ago", () => {
    const date = addSeconds(now, -30);
    expect(formateDate(date.toISOString())).toBe("Last activity: now");
  });

  it("should return minutes ago for less than 1 hour", () => {
    const date = addMinutes(now, -10);
    expect(formateDate(date.toISOString())).toBe("Last activity: 10m ago");
  });

  it("should return hours and minutes for less than 1 day", () => {
    const date = addHours(now, -3);
    expect(formateDate(date.toISOString())).toBe("Last activity: 3h");
  });

  it("should return days and hours for less than a week", () => {
    const date = addDays(now, -2);
    expect(formateDate(date.toISOString())).toBe("Last activity: 2d");
  });

  it("should return weeks and days for less than a month", () => {
    const date = addDays(now, -15);
    expect(formateDate(date.toISOString())).toBe("Last activity: 2w 1d");
  });

  it("should return months and weeks for less than a year", () => {
    const date = addDays(now, -45);
    expect(formateDate(date.toISOString())).toBe("Last activity: 1m 2w");
  });

  it("should return years and months for more than a year", () => {
    const date = addDays(now, -400);
    expect(formateDate(date.toISOString())).toBe("Last activity: 1y 1mon");
  });
});
