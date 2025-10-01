import {
  hasValidContent,
  formatNoteForSlack,
  formatTodoForSlack,
  updateSlackMessage,
} from "../slack";

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

describe("formatNoteForSlack", () => {
  const baseUrl = "https://example.com";
  const boardId = "board123";
  const boardName = "Test Board";
  const userName = "John Doe";

  it("should format note with checklist item and clickable board link", () => {
    const note = {
      checklistItems: [{ content: "Test task" }],
    };

    const result = formatNoteForSlack(note, boardName, userName, boardId, baseUrl);

    expect(result).toBe(
      `:heavy_plus_sign: Test task by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`
    );
  });

  it("should use 'New note' when no checklist items", () => {
    const note = { checklistItems: [] };

    const result = formatNoteForSlack(note, boardName, userName, boardId, baseUrl);

    expect(result).toBe(
      `:heavy_plus_sign: New note by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`
    );
  });

  it("should use 'New note' when checklistItems is undefined", () => {
    const note = {};

    const result = formatNoteForSlack(note, boardName, userName, boardId, baseUrl);

    expect(result).toBe(
      `:heavy_plus_sign: New note by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`
    );
  });

  it("should handle board names with special characters", () => {
    const note = {
      checklistItems: [{ content: "Test task" }],
    };
    const specialBoardName = "Test & Board <Special>";

    const result = formatNoteForSlack(note, specialBoardName, userName, boardId, baseUrl);

    expect(result).toContain(`<${baseUrl}/boards/${boardId}|${specialBoardName}>`);
  });
});

describe("formatTodoForSlack", () => {
  const baseUrl = "https://example.com";
  const boardId = "board123";
  const boardName = "Test Board";
  const userName = "John Doe";
  const todoContent = "Complete the task";

  it("should format added todo with clickable board link", () => {
    const result = formatTodoForSlack(todoContent, boardName, userName, "added", boardId, baseUrl);

    expect(result).toBe(
      `:heavy_plus_sign: ${todoContent} by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`
    );
  });

  it("should format completed todo with clickable board link", () => {
    const result = formatTodoForSlack(
      todoContent,
      boardName,
      userName,
      "completed",
      boardId,
      baseUrl
    );

    expect(result).toBe(
      `:white_check_mark: ${todoContent} by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`
    );
  });

  it("should use correct emoji for each action type", () => {
    const addedResult = formatTodoForSlack(
      todoContent,
      boardName,
      userName,
      "added",
      boardId,
      baseUrl
    );
    const completedResult = formatTodoForSlack(
      todoContent,
      boardName,
      userName,
      "completed",
      boardId,
      baseUrl
    );

    expect(addedResult).toContain(":heavy_plus_sign:");
    expect(completedResult).toContain(":white_check_mark:");
  });
});

describe("updateSlackMessage", () => {
  const baseUrl = "https://example.com";
  const boardId = "board123";
  const boardName = "Test Board";
  const userName = "John Doe";
  const originalText = "Original task";
  const webhookUrl = "https://hooks.slack.com/services/TEST";

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should format completed message with clickable board link", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    await updateSlackMessage(webhookUrl, originalText, true, boardName, userName, boardId, baseUrl);

    expect(global.fetch).toHaveBeenCalledWith(
      webhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `:white_check_mark: ${originalText} by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`,
          username: "Gumboard",
          icon_emoji: ":clipboard:",
        }),
      })
    );
  });

  it("should format uncompleted message with clickable board link", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

    await updateSlackMessage(
      webhookUrl,
      originalText,
      false,
      boardName,
      userName,
      boardId,
      baseUrl
    );

    expect(global.fetch).toHaveBeenCalledWith(
      webhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `:heavy_plus_sign: ${originalText} by ${userName} in <${baseUrl}/boards/${boardId}|${boardName}>`,
          username: "Gumboard",
          icon_emoji: ":clipboard:",
        }),
      })
    );
  });

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    await updateSlackMessage(webhookUrl, originalText, true, boardName, userName, boardId, baseUrl);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Error updating Slack message:")
    );

    consoleErrorSpy.mockRestore();
  });
});
