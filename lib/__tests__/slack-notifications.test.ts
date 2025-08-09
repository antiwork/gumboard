import {
  sendSlackApiMessage,
  updateSlackApiMessage,
  notifySlackForNoteChanges,
  clearNotificationDebounce,
} from "@/lib/slack";

global.fetch = jest.fn();

describe("Slack Notifications", () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, ts: "1234567890.123456" }),
    } as Response);

    // Clear debounce map between tests
    clearNotificationDebounce();
  });

  describe("sendSlackApiMessage", () => {
    it("should send a message using Slack API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const result = await sendSlackApiMessage("xoxb-test-token", {
        channel: "#general",
        text: "Test message",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer xoxb-test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: "#general",
            text: "Test message",
          }),
        }
      );

      expect(result).toBe("1234567890.123456");
    });

    it("should return null if API call fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ ok: false, error: "invalid_token" }),
        text: async () => "Invalid token",
      } as Response);

      const result = await sendSlackApiMessage("invalid-token", {
        channel: "#general", 
        text: "Test message",
      });

      expect(result).toBeNull();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await sendSlackApiMessage("xoxb-test-token", {
        channel: "#general",
        text: "Test message",
      });

      expect(result).toBeNull();
    });
  });

  describe("updateSlackApiMessage", () => {
    it("should update a message using Slack API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const result = await updateSlackApiMessage(
        "xoxb-test-token",
        "#general",
        "1234567890.123456",
        { text: "Updated message" }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.update",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer xoxb-test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: "#general",
            ts: "1234567890.123456",
            text: "Updated message",
          }),
        }
      );

      expect(result).toBe(true);
    });

    it("should return false if update fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ ok: false, error: "message_not_found" }),
        text: async () => "Message not found",
      } as Response);

      const result = await updateSlackApiMessage(
        "xoxb-test-token",
        "#general",
        "invalid-ts",
        { text: "Updated message" }
      );

      expect(result).toBe(false);
    });
  });

  describe("notifySlackForNoteChanges", () => {
    const baseParams = {
      slackApiToken: "xoxb-test-token",
      slackChannelId: "#general",
      boardName: "Project Board",
      boardId: "board-123",
      sendSlackUpdates: true,
      userId: "user-123",
      userName: "Test User",
      prevContent: "",
      nextContent: "",
      existingMessageIds: {},
    };

    it("should use API when token is provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        nextContent: "New content",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer xoxb-test-token",
          }),
        })
      );

      expect(result.noteMessageId).toBe("1234567890.123456");
    });

    it("should update existing message when messageId provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        nextContent: "Updated content",
        noteSlackMessageId: "existing-message-id",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.update",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer xoxb-test-token",
          }),
          body: expect.stringContaining("existing-message-id"),
        })
      );

      expect(result.noteMessageId).toBe("existing-message-id");
    });

    it("should post exactly one message for first created item only", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const itemChanges = {
        created: [
          { id: "item-1", content: "First item", checked: false, order: 0 },
          { id: "item-2", content: "Second item", checked: false, order: 1 },
          { id: "item-3", content: "Third item", checked: false, order: 2 },
        ],
        updated: [],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      // Should only call fetch once for the first created item
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer xoxb-test-token",
          }),
          body: expect.stringContaining("First item"),
        })
      );

      // Should return message ID for only the first item
      expect(result.itemMessageIds).toEqual({ "item-1": "1234567890.123456" });
    });

    it("should post nothing for text-only changes", async () => {
      const itemChanges = {
        created: [],
        updated: [
          {
            id: "item-1",
            content: "Updated content",
            checked: false,
            order: 0,
            previous: { content: "Original content", checked: false, order: 0 },
          },
        ],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      // Should not call fetch for text-only changes
      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.itemMessageIds).toBeUndefined();
    });

    it("should post for checked: false → true (completed)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const itemChanges = {
        created: [],
        updated: [
          {
            id: "item-1",
            content: "Test item",
            checked: true,
            order: 0,
            previous: { content: "Test item", checked: false, order: 0 },
          },
        ],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          body: expect.stringContaining("white_check_mark"),
        })
      );

      expect(result.itemMessageIds).toEqual({ "item-1": "1234567890.123456" });
    });

    it("should post for checked: true → false (reopened)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, ts: "1234567890.123456" }),
      } as Response);

      const itemChanges = {
        created: [],
        updated: [
          {
            id: "item-1",
            content: "Test item",
            checked: false,
            order: 0,
            previous: { content: "Test item", checked: true, order: 0 },
          },
        ],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          body: expect.stringContaining("heavy_plus_sign"),
        })
      );

      expect(result.itemMessageIds).toEqual({ "item-1": "1234567890.123456" });
    });

    it("should post nothing when sendSlackUpdates is false", async () => {
      const itemChanges = {
        created: [
          { id: "item-1", content: "Test item", checked: false, order: 0 },
        ],
        updated: [],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        sendSlackUpdates: false,
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.itemMessageIds).toBeUndefined();
    });

    it("should post nothing when API token is missing", async () => {
      const itemChanges = {
        created: [
          { id: "item-1", content: "Test item", checked: false, order: 0 },
        ],
        updated: [],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        slackApiToken: "",
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.itemMessageIds).toBeUndefined();
    });

    it("should handle item updates with existing message IDs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, ts: "updated-message-id" }),
      } as Response);

      const itemChanges = {
        created: [],
        updated: [
          {
            id: "item-1",
            content: "Test item",
            checked: true,
            order: 0,
            previous: { content: "Test item", checked: false, order: 0 },
          },
        ],
        deleted: [],
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
        existingMessageIds: { "item-1": "existing-item-message-id" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.update",
        expect.objectContaining({
          body: expect.stringContaining("existing-item-message-id"),
        })
      );

      expect(result.itemMessageIds).toEqual({ "item-1": "existing-item-message-id" });
    });

    it("does not post for reorder-only updates", async () => {
      await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges: {
          created: [],
          updated: [
            {
              id: "a",
              content: "A",
              checked: false,
              order: 1,
              previous: { content: "A", checked: false, order: 0 },
            },
            {
              id: "b",
              content: "B",
              checked: false,
              order: 0,
              previous: { content: "B", checked: false, order: 1 },
            },
          ],
          deleted: [],
        },
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
