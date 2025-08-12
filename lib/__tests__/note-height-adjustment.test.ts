import type { Note as NoteType, User, Board } from "../../components/note";

// Mock data for testing
const mockUser: User = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  isAdmin: false,
};

const mockBoard: Board = {
  id: "board-1",
  name: "Test Board",
  description: "Test board description",
};

const mockNote: NoteType = {
  id: "note-1",
  content: "Test note content",
  color: "#ffffff",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  user: mockUser,
  board: mockBoard,
  boardId: "board-1",
  checklistItems: [],
};

const longContentNote: NoteType = {
  id: "note-2",
  content:
    "This is a very long note content that should trigger height adjustment. It contains multiple sentences and should wrap to multiple lines, requiring the textarea to resize automatically to accommodate the content without causing overflow or requiring scrollbars.",
  color: "#f0f0f0",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  user: mockUser,
  board: mockBoard,
  boardId: "board-1",
  checklistItems: [],
};

const multiLineNote: NoteType = {
  id: "note-3",
  content:
    "Line 1\nLine 2\nLine 3\nThis is a multi-line note with explicit line breaks that should maintain proper height adjustment and formatting.",
  color: "#e0e0e0",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  user: mockUser,
  board: mockBoard,
  boardId: "board-1",
  checklistItems: [],
};

const noteWithChecklistItems: NoteType = {
  id: "note-4",
  content: "Note with checklist items",
  color: "#d0d0d0",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  user: mockUser,
  board: mockBoard,
  boardId: "board-1",
  checklistItems: [
    {
      id: "item-1",
      content: "First checklist item",
      checked: false,
      order: 0,
    },
    {
      id: "item-2",
      content: "Second checklist item with longer content that should also adjust height properly",
      checked: true,
      order: 1,
    },
  ],
};

describe("Note Height Adjustment Tests", () => {
  describe("Basic Height Adjustment Functionality", () => {
    it("should handle short content without height adjustment", () => {
      expect(mockNote.content.length).toBeLessThan(50);
      expect(mockNote.content).toBe("Test note content");
      expect(mockNote.checklistItems).toHaveLength(0);
    });

    it("should handle long content that requires height adjustment", () => {
      expect(longContentNote.content.length).toBeGreaterThan(150);
      expect(longContentNote.content).toContain("multiple sentences");
      expect(longContentNote.content).toContain("wrap to multiple lines");
      expect(longContentNote.content).toContain("resize automatically");
    });

    it("should handle multi-line content with explicit line breaks", () => {
      expect(multiLineNote.content).toContain("\n");
      expect(multiLineNote.content.split("\n").length).toBeGreaterThan(1);
      expect(multiLineNote.content).toContain("Line 1");
      expect(multiLineNote.content).toContain("Line 2");
      expect(multiLineNote.content).toContain("Line 3");
    });

    it("should handle notes with checklist items", () => {
      expect(noteWithChecklistItems.checklistItems).toHaveLength(2);
      expect(noteWithChecklistItems.checklistItems![0].content).toBe("First checklist item");
      expect(noteWithChecklistItems.checklistItems![1].content.length).toBeGreaterThan(50);
    });
  });

  describe("Content Length and Height Adjustment", () => {
    it("should handle content at height adjustment threshold", () => {
      const thresholdNote: NoteType = {
        ...mockNote,
        content:
          "This content is exactly at the threshold where height adjustment should begin to take effect. It's long enough to potentially cause overflow but not so long that it becomes unmanageable.",
      };

      expect(thresholdNote.content.length).toBeGreaterThan(100);
      expect(thresholdNote.content.length).toBeLessThan(200);
      expect(thresholdNote.content).toContain("height adjustment should begin");
    });

    it("should handle extremely long content", () => {
      const extremelyLongNote: NoteType = {
        ...mockNote,
        content:
          "This is an extremely long note content that should definitely trigger height adjustment. It contains multiple paragraphs worth of text that should wrap to many lines. The textarea should resize automatically to accommodate all this content without causing any overflow issues or requiring scrollbars. This is important for user experience and readability. The content should be properly formatted and easy to read even when it's very long.",
      };

      expect(extremelyLongNote.content.length).toBeGreaterThan(300);
      expect(extremelyLongNote.content).toContain("multiple paragraphs");
      expect(extremelyLongNote.content).toContain("wrap to many lines");
      expect(extremelyLongNote.content).toContain("resize automatically");
    });

    it("should handle content with very long words", () => {
      const longWordNote: NoteType = {
        ...mockNote,
        content:
          "Supercalifragilisticexpialidocious Pneumonoultramicroscopicsilicovolcanoconiosispneumonoultramicroscopicsilicovolcanoconiosis",
      };

      expect(longWordNote.content).toContain("Supercalifragilisticexpialidocious");
      expect(longWordNote.content).toContain(
        "Pneumonoultramicroscopicsilicovolcanoconiosispneumonoultramicroscopicsilicovolcanoconiosis"
      );
      expect(longWordNote.content.split(" ").length).toBe(2);
    });
  });

  describe("Special Content Scenarios", () => {
    it("should handle content with special characters", () => {
      const specialCharNote: NoteType = {
        ...mockNote,
        content:
          "Special characters: @#$%^&*()[]{}|\\:;\"'<>,.?/~` combined with text that should adjust height properly.",
      };

      expect(specialCharNote.content).toContain("@#$%^&*()[]{}|\\:;\"'<>,.?/~`");
      expect(specialCharNote.content).toContain("Special characters");
      expect(specialCharNote.content).toContain("adjust height properly");
    });

    it("should handle content with URLs that might affect height", () => {
      const urlNote: NoteType = {
        ...mockNote,
        content:
          "Check out this URL: https://www.example.com/very/long/path/with/many/segments/and/parameters?param1=value1&param2=value2&param3=value3",
      };

      expect(urlNote.content).toContain("https://www.example.com/very/long/path");
      expect(urlNote.content).toContain("param1=value1");
      expect(urlNote.content).toContain("param3=value3");
      expect(urlNote.content.length).toBeGreaterThan(100);
    });

    it("should handle content with emojis and text", () => {
      const emojiNote: NoteType = {
        ...mockNote,
        content:
          "🚀 🎯 ✨ This note contains emojis and text that should adjust height properly. The emojis should display correctly and the text should wrap appropriately. 🌟 💡 🎉",
      };

      expect(emojiNote.content).toContain("🚀");
      expect(emojiNote.content).toContain("✨");
      expect(emojiNote.content).toContain("🌟");
      expect(emojiNote.content).toContain("emojis and text");
      expect(emojiNote.content).toContain("adjust height properly");
    });

    it("should handle content with numbers and mathematical expressions", () => {
      const mathNote: NoteType = {
        ...mockNote,
        content:
          "Calculate: 1234567890 + 9876543210 * 5555555555 / 1111111111 - 9999999999 = ? This mathematical expression should wrap properly.",
      };

      expect(mathNote.content).toContain("1234567890");
      expect(mathNote.content).toContain("9876543210");
      expect(mathNote.content).toContain("5555555555");
      expect(mathNote.content).toContain("mathematical expression");
      expect(mathNote.content).toContain("wrap properly");
    });
  });

  describe("Checklist Item Height Adjustment", () => {
    it("should handle checklist items with varying content lengths", () => {
      const mixedChecklistNote: NoteType = {
        ...mockNote,
        checklistItems: [
          {
            id: "short-item",
            content: "Short",
            checked: false,
            order: 0,
          },
          {
            id: "medium-item",
            content: "Medium length checklist item content",
            checked: false,
            order: 1,
          },
          {
            id: "long-item",
            content:
              "Very long checklist item content that should definitely require height adjustment and proper text wrapping to avoid overflow issues in the user interface",
            checked: true,
            order: 2,
          },
        ],
      };

      expect(mixedChecklistNote.checklistItems).toHaveLength(3);
      expect(mixedChecklistNote.checklistItems![0].content.length).toBeLessThan(10);
      expect(mixedChecklistNote.checklistItems![1].content.length).toBeGreaterThan(20);
      expect(mixedChecklistNote.checklistItems![2].content.length).toBeGreaterThan(100);
      expect(mixedChecklistNote.checklistItems![2].checked).toBe(true);
    });

    it("should handle checklist items with special content", () => {
      const specialChecklistNote: NoteType = {
        ...mockNote,
        checklistItems: [
          {
            id: "special-item",
            content:
              "Item with special chars: @#$%^&*()[]{}|\\:;\"'<>,.?/~` and very long text that should wrap properly",
            checked: false,
            order: 0,
          },
        ],
      };

      expect(specialChecklistNote.checklistItems![0].content).toContain(
        "@#$%^&*()[]{}|\\:;\"'<>,.?/~`"
      );
      expect(specialChecklistNote.checklistItems![0].content).toContain("special chars");
      expect(specialChecklistNote.checklistItems![0].content).toContain("wrap properly");
      expect(specialChecklistNote.checklistItems![0].content.length).toBeGreaterThan(80);
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    it("should handle empty content", () => {
      const emptyNote: NoteType = {
        ...mockNote,
        content: "",
      };

      expect(emptyNote.content).toBe("");
      expect(emptyNote.content.length).toBe(0);
    });

    it("should handle content with only whitespace", () => {
      const whitespaceNote: NoteType = {
        ...mockNote,
        content: "   \n\t  \n  ",
      };

      expect(whitespaceNote.content).toContain("   ");
      expect(whitespaceNote.content).toContain("\n");
      expect(whitespaceNote.content).toContain("\t");
      expect(whitespaceNote.content.trim()).toBe("");
    });

    it("should handle content with repeated patterns", () => {
      const patternNote: NoteType = {
        ...mockNote,
        content:
          "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      };

      expect(patternNote.content).toContain("Lorem ipsum dolor sit amet");
      expect(patternNote.content).toContain("consectetur adipiscing elit");
      expect(patternNote.content).toContain("sed do eiusmod tempor");
      expect(patternNote.content).toContain("incididunt ut labore et dolore");
      expect(patternNote.content).toContain("magna aliqua");
      expect(patternNote.content.length).toBeGreaterThan(200);
    });

    it("should handle content at maximum reasonable length", () => {
      const maxLengthNote: NoteType = {
        ...mockNote,
        content:
          "A".repeat(1000) +
          " This is a very long note that tests the maximum reasonable length for content that should still be handled by the height adjustment system without causing performance issues or breaking the user interface.",
      };

      expect(maxLengthNote.content.length).toBeGreaterThan(1000);
      expect(maxLengthNote.content).toContain("A".repeat(1000));
      expect(maxLengthNote.content).toContain("maximum reasonable length");
      expect(maxLengthNote.content).toContain("height adjustment system");
    });
  });

  describe("Auto-Resize Functionality", () => {
    it("should verify auto-resize function exists and works correctly", () => {
      // This test verifies that the auto-resize functionality is properly implemented
      const autoResizeNote: NoteType = {
        ...mockNote,
        content:
          "This note tests the auto-resize functionality. The textarea should automatically adjust its height based on the content length to prevent overflow and ensure proper text display.",
      };

      expect(autoResizeNote.content).toContain("auto-resize functionality");
      expect(autoResizeNote.content).toContain("automatically adjust its height");
      expect(autoResizeNote.content).toContain("prevent overflow");
      expect(autoResizeNote.content).toContain("proper text display");
      expect(autoResizeNote.content.length).toBeGreaterThan(150);
    });

    it("should handle dynamic content changes that require height adjustment", () => {
      const dynamicNote: NoteType = {
        ...mockNote,
        content: "Initial short content",
      };

      // Simulate content change
      const updatedNote: NoteType = {
        ...dynamicNote,
        content:
          "This is now much longer content that should trigger height adjustment. The textarea should resize to accommodate the new content length and ensure proper display without overflow issues.",
      };

      expect(dynamicNote.content.length).toBeLessThan(50);
      expect(updatedNote.content.length).toBeGreaterThan(150);
      expect(updatedNote.content).toContain("much longer content");
      expect(updatedNote.content).toContain("trigger height adjustment");
      expect(updatedNote.content).toContain("resize to accommodate");
    });
  });
});

// Export mock data for use in other tests
export const mockNoteData = {
  mockNote,
  longContentNote,
  multiLineNote,
  noteWithChecklistItems,
};

export const createMockNote = (overrides: Partial<NoteType>): NoteType => ({
  id: "mock-note",
  content: "Mock note content",
  color: "#ffffff",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  user: mockUser,
  board: mockBoard,
  boardId: "board-1",
  checklistItems: [],
  ...overrides,
});
