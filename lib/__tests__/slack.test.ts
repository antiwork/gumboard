import { hasValidContent, shouldSendChecklistMessage } from "../slack";

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

describe("shouldSendChecklistMessage", () => {
  it("should allow first message for a checklist item", () => {
    const checklistItemId = "test-item-1";
    const action = "created";
    const content = "Test checklist item";
    
    expect(shouldSendChecklistMessage(checklistItemId, action, content)).toBe(true);
  });

  it("should prevent duplicate messages within the deduplication window", () => {
    const checklistItemId = "test-item-2";
    const action = "updated";
    const content = "Updated checklist item";
    
    // First call should return true
    expect(shouldSendChecklistMessage(checklistItemId, action, content)).toBe(true);
    
    // Immediate second call should return false (duplicate prevention)
    expect(shouldSendChecklistMessage(checklistItemId, action, content)).toBe(false);
  });

  it("should allow different actions for the same checklist item", () => {
    const checklistItemId = "test-item-3";
    const content = "Test item content";
    
    // Different actions should be allowed
    expect(shouldSendChecklistMessage(checklistItemId, "created", content)).toBe(true);
    expect(shouldSendChecklistMessage(checklistItemId, "checked", content)).toBe(true);
    expect(shouldSendChecklistMessage(checklistItemId, "updated", content)).toBe(true);
  });

  it("should allow different content for the same checklist item", () => {
    const checklistItemId = "test-item-4";
    const action = "updated";
    
    // Different content should be allowed
    expect(shouldSendChecklistMessage(checklistItemId, action, "Content A")).toBe(true);
    expect(shouldSendChecklistMessage(checklistItemId, action, "Content B")).toBe(true);
  });

  it("should allow messages for different checklist items", () => {
    const action = "created";
    const content = "Same content";
    
    // Different items should be allowed
    expect(shouldSendChecklistMessage("item-1", action, content)).toBe(true);
    expect(shouldSendChecklistMessage("item-2", action, content)).toBe(true);
    expect(shouldSendChecklistMessage("item-3", action, content)).toBe(true);
  });
});
