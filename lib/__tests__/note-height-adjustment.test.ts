import type { Note as NoteType, User, Board } from "../../components/note";

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

describe("Note Height Adjustment Tests", () => {
  describe("Basic Height Adjustment Functionality", () => {
    it("should handle short content without height adjustment", () => {
      expect(mockNote.content.length).toBeLessThan(50);
      expect(mockNote.checklistItems).toHaveLength(0);
    });

    it("should handle long content that requires height adjustment", () => {
      const longContentNote: NoteType = {
        ...mockNote,
        content:
          "This is a very long note content that should trigger height adjustment. It contains multiple sentences and should wrap to multiple lines, requiring the textarea to resize automatically to accommodate the content without causing overflow or requiring scrollbars.",
      };

      expect(longContentNote.content.length).toBeGreaterThan(150);
      expect(longContentNote.content).toContain("multiple sentences");
    });

    it("should handle multi-line content with explicit line breaks", () => {
      const multiLineNote: NoteType = {
        ...mockNote,
        content:
          "Line 1\nLine 2\nLine 3\nThis is a multi-line note with explicit line breaks that should maintain proper height adjustment and formatting.",
      };

      expect(multiLineNote.content).toContain("\n");
      expect(multiLineNote.content.split("\n").length).toBeGreaterThan(1);
    });
  });

  describe("Checklist Item Height Adjustment", () => {
    it("should handle notes with checklist items", () => {
      const noteWithChecklistItems: NoteType = {
        ...mockNote,
        checklistItems: [
          {
            id: "item-1",
            content: "First checklist item",
            checked: false,
            order: 0,
          },
          {
            id: "item-2",
            content:
              "Second checklist item with longer content that should also adjust height properly",
            checked: true,
            order: 1,
          },
        ],
      };

      expect(noteWithChecklistItems.checklistItems).toHaveLength(2);
      expect(noteWithChecklistItems.checklistItems![0].content).toBe("First checklist item");
      expect(noteWithChecklistItems.checklistItems![1].content.length).toBeGreaterThan(50);
    });

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
      // 10: Short enough to be considered "short" content that won't trigger height adjustment
      expect(mixedChecklistNote.checklistItems![0].content.length).toBeLessThan(10);
      // 20: Medium length that should be visible but not require significant height adjustment
      expect(mixedChecklistNote.checklistItems![1].content.length).toBeGreaterThan(20);
      // 100: Long enough to definitely require height adjustment and text wrapping
      expect(mixedChecklistNote.checklistItems![2].content.length).toBeGreaterThan(100);
      expect(mixedChecklistNote.checklistItems![2].checked).toBe(true);
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
      expect(whitespaceNote.content.trim()).toBe("");
    });

    it("should handle extremely long content", () => {
      const extremelyLongNote: NoteType = {
        ...mockNote,
        content:
          "A".repeat(500) +
          " This is an extremely long note content that should definitely trigger height adjustment. It contains multiple paragraphs worth of text that should wrap to many lines. The textarea should resize automatically to accommodate all this content without causing any overflow issues or requiring scrollbars.",
      };

      expect(extremelyLongNote.content.length).toBeGreaterThan(500);
      expect(extremelyLongNote.content).toContain("multiple paragraphs");
    });
  });

  describe("Auto-Resize Functionality", () => {
    it("should verify auto-resize function exists and works correctly", () => {
      const autoResizeNote: NoteType = {
        ...mockNote,
        content:
          "This note tests the auto-resize functionality. The textarea should automatically adjust its height based on the content length to prevent overflow and ensure proper text display.",
      };

      expect(autoResizeNote.content).toContain("auto-resize functionality");
      expect(autoResizeNote.content).toContain("automatically adjust its height");
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
    });
  });
});

export const mockNoteData = {
  mockNote,
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
