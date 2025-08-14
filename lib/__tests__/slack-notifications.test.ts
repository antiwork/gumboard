import {
  sendSlackApiMessage,
  updateSlackApiMessage,
  formatTodoForSlack,
  notifySlackForNoteChanges,
  shouldSendNotification,
} from "../slack";

global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("Slack Web API Functions", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("sendSlackApiMessage", () => {
    it("should send message and return timestamp on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234.5678" }),
      } as Response);

      const result = await sendSlackApiMessage("xoxb-token", {
        channel: "C1234567890",
        text: "Test message",
        username: "Gumboard",
        icon_emoji: ":clipboard:",
      });

      expect(mockFetch).toHaveBeenCalledWith("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer xoxb-token",
        },
        body: JSON.stringify({
          channel: "C1234567890",
          text: "Test message",
          username: "Gumboard",
          icon_emoji: ":clipboard:",
        }),
      });

      expect(result).toBe("1234.5678");
    });

    it("should return null on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      } as Response);

      const result = await sendSlackApiMessage("invalid-token", {
        channel: "C1234567890",
        text: "Test message",
      });

      expect(result).toBeNull();
    });

    it("should return null on Slack API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, error: "channel_not_found" }),
      } as Response);

      const result = await sendSlackApiMessage("xoxb-token", {
        channel: "INVALID",
        text: "Test message",
      });

      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendSlackApiMessage("xoxb-token", {
        channel: "C1234567890",
        text: "Test message",
      });

      expect(result).toBeNull();
    });
  });

  describe("updateSlackApiMessage", () => {
    it("should update message and return true on success", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      const result = await updateSlackApiMessage("xoxb-token", "C1234567890", "1234.5678", {
        text: "Updated message",
      });

      expect(mockFetch).toHaveBeenCalledWith("https://slack.com/api/chat.update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer xoxb-token",
        },
        body: JSON.stringify({
          channel: "C1234567890",
          ts: "1234.5678",
          text: "Updated message",
        }),
      });

      expect(result).toBe(true);
    });

    it("should return false on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      } as Response);

      const result = await updateSlackApiMessage("invalid-token", "C1234567890", "1234.5678", {
        text: "Updated message",
      });

      expect(result).toBe(false);
    });

    it("should return false on Slack API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: false, error: "message_not_found" }),
      } as Response);

      const result = await updateSlackApiMessage("xoxb-token", "C1234567890", "INVALID", {
        text: "Updated message",
      });

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateSlackApiMessage("xoxb-token", "C1234567890", "1234.5678", {
        text: "Updated message",
      });

      expect(result).toBe(false);
    });
  });

  describe("formatTodoForSlack", () => {
    it("should format added todos correctly", () => {
      const result = formatTodoForSlack("Fix bug", "Project Board", "John", "added");
      expect(result).toBe(":heavy_plus_sign: Fix bug by John in Project Board");
    });

    it("should format completed todos correctly", () => {
      const result = formatTodoForSlack("Fix bug", "Project Board", "John", "completed");
      expect(result).toBe(":white_check_mark: Fix bug by John in Project Board");
    });

    it("should format reopened todos correctly", () => {
      const result = formatTodoForSlack("Fix bug", "Project Board", "John", "reopened");
      expect(result).toBe(":recycle: Fix bug by John in Project Board");
    });
  });

  describe("notifySlackForNoteChanges", () => {
    const testBoardName = "Production Board";

    it("should create new note message when going from empty to content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234.5678" }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "",
        nextContent: "New note content",
        noteSlackMessageId: null,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.any(Object)
      );
      expect(result.noteMessageId).toBe("1234.5678");
    });

    it("should update existing note message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Old content",
        nextContent: "Updated content",
        noteSlackMessageId: "1234.5678",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.update",
        expect.any(Object)
      );
      expect(result.noteMessageId).toBeUndefined();
    });

    it("should post only once for first created checklist item", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "item123.456" }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Note content",
        nextContent: "Note content",
        itemChanges: {
          created: [
            { id: "item1", content: "First item", checked: false, order: 0 },
            { id: "item2", content: "Second item", checked: false, order: 1 },
          ],
          updated: [],
          deleted: [],
        },
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.itemMessageIds).toEqual({ item1: "item123.456" });
    });

    it("should post on checked toggle (completed)", async () => {
      const mockTs = `completed${Date.now()}`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: mockTs }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Note content",
        nextContent: "Note content",
        itemChanges: {
          created: [],
          updated: [
            {
              id: "item1",
              content: "Task completed",
              checked: true,
              order: 0,
              previous: { content: "Task completed", checked: false, order: 0 },
            },
          ],
          deleted: [],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          body: expect.stringContaining(
            ":white_check_mark: Task completed by John Doe in Production Board"
          ),
        })
      );
      expect(result.itemMessageIds).toEqual({ item1: mockTs });
    });

    it("should post on unchecked toggle (reopened)", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const mockTs = `reopened${Date.now()}`;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: mockTs }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_reopen_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_reopen_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Note content",
        nextContent: "Note content",
        itemChanges: {
          created: [],
          updated: [
            {
              id: "item1",
              content: "Task reopened",
              checked: false,
              order: 0,
              previous: { content: "Task reopened", checked: true, order: 0 },
            },
          ],
          deleted: [],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          body: expect.stringContaining(":recycle: Task reopened by John Doe in Production Board"),
        })
      );
      expect(result.itemMessageIds).toEqual({ item1: mockTs });
    });

    it("should update existing item message when available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

      await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Note content",
        nextContent: "Note content",
        existingMessageIds: { item1: "existing123.456" },
        itemChanges: {
          created: [],
          updated: [
            {
              id: "item1",
              content: "Task completed",
              checked: true,
              order: 0,
              previous: { content: "Task completed", checked: false, order: 0 },
            },
          ],
          deleted: [],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.update",
        expect.objectContaining({
          body: expect.stringContaining("existing123.456"),
        })
      );
    });

    it("should not post for reorder-only changes", async () => {
      await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Note content",
        nextContent: "Note content",
        itemChanges: {
          created: [],
          updated: [
            {
              id: "item1",
              content: "Same content",
              checked: false,
              order: 1,
              previous: { content: "Same content", checked: false, order: 0 },
            },
          ],
          deleted: [],
        },
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should post for text-only changes without checked toggle", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "text123.456" }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        orgToken: "xoxb-token",
        orgChannelId: "C1234567890",
        boardId: `board_${Date.now()}`,
        boardName: testBoardName,
        sendSlackUpdates: true,
        userId: `user_${Date.now()}`,
        userName: "John Doe",
        prevContent: "Note content",
        nextContent: "Note content",
        itemChanges: {
          created: [],
          updated: [
            {
              id: "item1",
              content: "Updated content",
              checked: false,
              order: 0,
              previous: { content: "Original content", checked: false, order: 0 },
            },
          ],
          deleted: [],
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          body: expect.stringContaining(
            ":pencil2: Updated content by John Doe in Production Board"
          ),
        })
      );
      expect(result.itemMessageIds).toEqual({ item1: "text123.456" });
    });
  });

  describe("shouldSendNotification", () => {
    it("should allow notification for non-test boards", () => {
      const result = shouldSendNotification("user1", "board1", "Production Board", true);
      expect(result).toBe(true);
    });

    it("should block notification for test boards", () => {
      const result = shouldSendNotification("user1", "board1", "Test Board", true);
      expect(result).toBe(false);
    });

    it("should block notification when sendSlackUpdates is false", () => {
      const result = shouldSendNotification("user1", "board1", "Production Board", false);
      expect(result).toBe(false);
    });

    it("should implement debouncing", () => {
      const user = "user_debounce_test";
      const board = "board_debounce_test";
      const boardName = "Debounce Test Board";

      // First call should succeed
      const first = shouldSendNotification(user, board, boardName, true);
      expect(first).toBe(true);

      // Immediate second call should be debounced
      const second = shouldSendNotification(user, board, boardName, true);
      expect(second).toBe(false);
    });
  });
});
