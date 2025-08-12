import type { ChecklistItem as ChecklistItemType } from "../checklist-item";

const mockItem: ChecklistItemType = {
  id: "test-item-1",
  content: "Test item content",
  checked: false,
  order: 0,
};

const longTextItem: ChecklistItemType = {
  id: "test-item-2",
  content:
    "Implement comprehensive user onboarding flow with email verification, profile setup wizard, feature tour, and progressive disclosure of advanced functionality to improve user retention and reduce support requests",
  checked: false,
  order: 1,
};

const multiLineItem: ChecklistItemType = {
  id: "test-item-3",
  content: "Line 1\nLine 2\nLine 3\nThis is a multi-line checklist item that should wrap properly",
  checked: false,
  order: 2,
};

const checkedLongItem: ChecklistItemType = {
  id: "test-item-4",
  content:
    "This is a completed long task with a lot of text that should still wrap properly even when it's checked and has line-through styling applied to it",
  checked: true,
  order: 3,
};

describe("ChecklistItem Type Tests", () => {
  it("should have correct structure for regular items", () => {
    expect(mockItem.id).toBe("test-item-1");
    expect(mockItem.content).toBe("Test item content");
    expect(mockItem.checked).toBe(false);
    expect(mockItem.order).toBe(0);
  });

  it("should handle long text content properly", () => {
    expect(longTextItem.id).toBe("test-item-2");
    expect(longTextItem.content).toContain("extremely long task description");
    expect(longTextItem.content.length).toBeGreaterThan(100);
    expect(longTextItem.checked).toBe(false);
    expect(longTextItem.order).toBe(1);
  });

  it("should handle multi-line content", () => {
    expect(multiLineItem.content).toContain("\n");
    expect(multiLineItem.content.split("\n").length).toBeGreaterThan(1);
    expect(multiLineItem.content).toContain("Line 1");
    expect(multiLineItem.content).toContain("Line 2");
    expect(multiLineItem.content).toContain("Line 3");
  });

  it("should maintain type safety for required fields", () => {
    const requiredFields = ["id", "content", "checked", "order"];

    requiredFields.forEach((field) => {
      expect(mockItem).toHaveProperty(field);
      expect(longTextItem).toHaveProperty(field);
      expect(multiLineItem).toHaveProperty(field);
      expect(checkedLongItem).toHaveProperty(field);
    });
  });

  it("should handle checked state changes", () => {
    const checkedItem: ChecklistItemType = {
      ...mockItem,
      checked: true,
    };

    expect(checkedItem.checked).toBe(true);
    expect(checkedItem.id).toBe(mockItem.id);
    expect(checkedItem.content).toBe(mockItem.content);
  });

  it("should handle checked long items properly", () => {
    expect(checkedLongItem.checked).toBe(true);
    expect(checkedLongItem.content.length).toBeGreaterThan(50);
    expect(checkedLongItem.content).toContain("completed long task");
  });

  it("should handle order changes for reordering", () => {
    const reorderedItem: ChecklistItemType = {
      ...longTextItem,
      order: 5,
    };

    expect(reorderedItem.order).toBe(5);
    expect(reorderedItem.id).toBe(longTextItem.id);
    expect(reorderedItem.content).toBe(longTextItem.content);
  });

  it("should handle content updates", () => {
    const updatedItem: ChecklistItemType = {
      ...mockItem,
      content: "Updated content that is longer than the original",
    };

    expect(updatedItem.content).toBe("Updated content that is longer than the original");
    expect(updatedItem.id).toBe(mockItem.id);
    expect(updatedItem.checked).toBe(mockItem.checked);
    expect(updatedItem.order).toBe(mockItem.order);
  });

  it("should handle content with special characters", () => {
    const specialCharItem: ChecklistItemType = {
      ...mockItem,
      content: "Item with special chars: @#$%^&*()[]{}|\\:;\"'<>,.?/~`",
    };

    expect(specialCharItem.content).toContain("@#$%^&*()");
    expect(specialCharItem.content).toContain("[]{}|\\");
    expect(specialCharItem.content).toContain(":;\"'<>");
  });

  it("should handle empty content", () => {
    const emptyItem: ChecklistItemType = {
      ...mockItem,
      content: "",
    };

    expect(emptyItem.content).toBe("");
    expect(emptyItem.id).toBe(mockItem.id);
  });

  it("should handle very long single word", () => {
    const longWordItem: ChecklistItemType = {
      ...mockItem,
      content:
        "Pneumonoultramicroscopicsilicovolcanoconiosispneumonoultramicroscopicsilicovolcanoconiosis",
    };

    expect(longWordItem.content.length).toBeGreaterThan(50);
    expect(longWordItem.content).not.toContain(" ");
  });

  it("should preserve whitespace in content", () => {
    const whitespaceItem: ChecklistItemType = {
      ...mockItem,
      content: "  Leading spaces\n\tTab character\nTrailing spaces  ",
    };

    expect(whitespaceItem.content).toContain("  Leading");
    expect(whitespaceItem.content).toContain("\t");
    expect(whitespaceItem.content).toContain("  ");
  });
});

// Export mock data for use in other tests
export const mockChecklistItems = {
  mockItem,
  longTextItem,
  multiLineItem,
  checkedLongItem,
};

export const createMockChecklistItem = (
  overrides: Partial<ChecklistItemType>
): ChecklistItemType => ({
  id: "mock-item",
  content: "Mock content",
  checked: false,
  order: 0,
  ...overrides,
});
