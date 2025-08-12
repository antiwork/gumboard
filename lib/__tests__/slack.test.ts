import { hasValidContent } from "../slack";

describe("hasValidContent", () => {
  it("should return false for null and undefined", () => {
    expect(hasValidContent(null)).toBe(false);
    expect(hasValidContent(undefined)).toBe(false);
  });

  it("should return false for empty strings", () => {
    expect(hasValidContent("")).toBe(false);
    expect(hasValidContent("   ")).toBe(false);
    expect(hasValidContent("\t\n\r")).toBe(false);
  });

  it("should return false for content with only special characters", () => {
    expect(hasValidContent("!!!")).toBe(false);
    expect(hasValidContent("...")).toBe(false);
    expect(hasValidContent("---")).toBe(false);
    expect(hasValidContent("***")).toBe(false);
    expect(hasValidContent("   !!!   ")).toBe(false);
  });

  it("should return true for valid content with alphanumeric characters", () => {
    expect(hasValidContent("Hello world")).toBe(true);
    expect(hasValidContent("Task 1")).toBe(true);
    expect(hasValidContent("123")).toBe(true);
    expect(hasValidContent("a")).toBe(true);
  });

  it("should return true for content with meaningful symbols and text", () => {
    expect(hasValidContent("Fix bug #123")).toBe(true);
    expect(hasValidContent("Review PR!")).toBe(true);
    expect(hasValidContent("Meeting @ 3pm")).toBe(true);
  });

  it("should return true for international characters", () => {
    expect(hasValidContent("café")).toBe(true);
    expect(hasValidContent("こんにちは")).toBe(true);
    expect(hasValidContent("你好")).toBe(true);
  });

  it("should return true for checklist-style content", () => {
    expect(hasValidContent("[ ] Todo item")).toBe(true);
    expect(hasValidContent("[x] Completed task")).toBe(true);
  });

  it("should handle edge cases with mixed content", () => {
    expect(hasValidContent("   a   ")).toBe(true);
    expect(hasValidContent("!!! Important !!!")).toBe(true);
    expect(hasValidContent("... loading ...")).toBe(true);
  });
});
