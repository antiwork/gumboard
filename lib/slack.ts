interface SlackApiMessagePayload {
  channel: string;
  text: string;
  username?: string;
  icon_emoji?: string;
}

interface SlackApiResponse {
  ok: boolean;
  ts?: string;
  error?: string;
}

interface NotificationParams {
  orgToken: string;
  orgChannelId: string;
  boardId: string;
  boardName: string;
  sendSlackUpdates: boolean;
  userId: string;
  userName: string;
  prevContent: string;
  nextContent: string;
  noteSlackMessageId?: string | null;
  itemChanges?: {
    created: Array<{ id: string; content: string; checked: boolean; order: number }>;
    updated: Array<{
      id: string;
      content: string;
      checked: boolean;
      order: number;
      previous: { content: string; checked: boolean; order: number };
    }>;
    deleted: Array<{ id: string; content: string; checked: boolean; order: number }>;
  };
  existingMessageIds?: Record<string, string>;
}

export function hasValidContent(content: string | null | undefined): boolean {
  if (!content) {
    console.log(`[Slack] hasValidContent check: "${content}" -> false (null/undefined)`);
    return false;
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    console.log(`[Slack] hasValidContent check: "${content}" -> false (empty after trim)`);
    return false;
  }

  const hasSubstantiveContent =
    /[a-zA-Z0-9\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed);

  if (!hasSubstantiveContent) {
    console.log(`[Slack] hasValidContent check: "${content}" -> false (no substantive content)`);
    return false;
  }

  console.log(`[Slack] hasValidContent check: "${content}" -> true`);
  return true;
}

const notificationDebounce = new Map<string, number>();
const DEBOUNCE_DURATION = 1000;

export function shouldSendNotification(
  userId: string,
  boardId: string,
  boardName: string,
  sendSlackUpdates: boolean = true
): boolean {
  if (boardName.startsWith("Test")) {
    console.log(`[Slack] Skipping notification for test board: ${boardName}`);
    return false;
  }

  if (!sendSlackUpdates) {
    console.log(
      `[Slack] Skipping notification for board with disabled Slack updates: ${boardName}`
    );
    return false;
  }

  const key = `${userId}-${boardId}`;
  const now = Date.now();
  const lastNotification = notificationDebounce.get(key);

  if (lastNotification && now - lastNotification < DEBOUNCE_DURATION) {
    console.log(`[Slack] Debounced notification for ${key} (${now - lastNotification}ms ago)`);
    return false;
  }

  notificationDebounce.set(key, now);
  console.log(`[Slack] Allowing notification for ${key}`);
  return true;
}

export function formatNoteForSlack(
  note: { checklistItems?: Array<{ content: string }> },
  boardName: string,
  userName: string
): string {
  // Get content from first checklist item
  const content =
    note.checklistItems && note.checklistItems.length > 0
      ? note.checklistItems[0].content
      : "New note";
  return `:heavy_plus_sign: ${content} by ${userName} in ${boardName}`;
}

export async function sendSlackApiMessage(
  token: string,
  payload: SlackApiMessagePayload
): Promise<string | null> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to send Slack API message:", response.statusText);
      return null;
    }

    const data: SlackApiResponse = await response.json();
    if (!data.ok) {
      console.error("Slack API error:", data.error);
      return null;
    }

    return data.ts || null;
  } catch (error) {
    console.error("Error sending Slack API message:", error);
    return null;
  }
}

export async function updateSlackApiMessage(
  token: string,
  channel: string,
  ts: string,
  payload: { text: string }
): Promise<boolean> {
  try {
    const response = await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        ts,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      console.error("Failed to update Slack API message:", response.statusText);
      return false;
    }

    const data: SlackApiResponse = await response.json();
    if (!data.ok) {
      console.error("Slack API update error:", data.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating Slack API message:", error);
    return false;
  }
}

export function formatTodoForSlack(
  todoContent: string,
  boardName: string,
  userName: string,
  action: "added" | "completed" | "reopened" | "updated"
): string {
  if (action === "completed") {
    return `:white_check_mark: ${todoContent} by ${userName} in ${boardName}`;
  } else if (action === "reopened") {
    return `:recycle: ${todoContent} by ${userName} in ${boardName}`;
  } else if (action === "updated") {
    return `:pencil2: ${todoContent} by ${userName} in ${boardName}`;
  }
  return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`;
}

export async function notifySlackForNoteChanges(
  params: NotificationParams
): Promise<{ noteMessageId?: string; itemMessageIds?: Record<string, string> }> {
  const {
    orgToken,
    orgChannelId,
    boardId,
    boardName,
    sendSlackUpdates,
    userId,
    userName,
    prevContent,
    nextContent,
    noteSlackMessageId,
    itemChanges,
    existingMessageIds = {},
  } = params;

  const result: { noteMessageId?: string; itemMessageIds?: Record<string, string> } = {};

  const wasEmpty = !hasValidContent(prevContent);
  const hasContent = hasValidContent(nextContent);
  const isArchived = nextContent.includes("[ARCHIVED]");

  if (!itemChanges) {
    if (wasEmpty && hasContent && !noteSlackMessageId) {
      if (shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) {
        const messageText = formatNoteForSlack(
          { checklistItems: [{ content: nextContent }] },
          boardName,
          userName
        );
        const ts = await sendSlackApiMessage(orgToken, {
          channel: orgChannelId,
          text: messageText,
          username: "Gumboard",
          icon_emoji: ":clipboard:",
        });
        if (ts) {
          result.noteMessageId = ts;
        }
      }
    } else if (noteSlackMessageId && hasContent) {
      const messageText = isArchived
        ? `:package: [ARCHIVED] ${nextContent} by ${userName} in ${boardName}`
        : formatNoteForSlack({ checklistItems: [{ content: nextContent }] }, boardName, userName);

      await updateSlackApiMessage(orgToken, orgChannelId, noteSlackMessageId, {
        text: messageText,
      });
    }
  }

  if (itemChanges) {
    const itemMessageIds: Record<string, string> = { ...existingMessageIds };

    if (itemChanges.created.length > 0) {
      const firstItem = itemChanges.created[0];
      if (
        hasValidContent(firstItem.content) &&
        shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)
      ) {
        const messageText = formatTodoForSlack(firstItem.content, boardName, userName, "added");
        const ts = await sendSlackApiMessage(orgToken, {
          channel: orgChannelId,
          text: messageText,
          username: "Gumboard",
          icon_emoji: ":clipboard:",
        });
        if (ts) {
          itemMessageIds[firstItem.id] = ts;
        }
      }
    }

    for (const item of itemChanges.updated) {
      const checkedToggle = item.previous.checked !== item.checked;
      const contentChanged = item.previous.content !== item.content;

      if (checkedToggle || contentChanged) {
        let action: "added" | "completed" | "reopened" | "updated";
        if (checkedToggle) {
          action = item.checked ? "completed" : "reopened";
        } else {
          action = "updated";
        }

        const messageText = formatTodoForSlack(item.content, boardName, userName, action);

        const existingTs = itemMessageIds[item.id];
        if (existingTs) {
          await updateSlackApiMessage(orgToken, orgChannelId, existingTs, {
            text: messageText,
          });
        } else {
          const ts = await sendSlackApiMessage(orgToken, {
            channel: orgChannelId,
            text: messageText,
            username: "Gumboard",
            icon_emoji: ":clipboard:",
          });
          if (ts) {
            itemMessageIds[item.id] = ts;
          }
        }
      }
    }

    result.itemMessageIds = itemMessageIds;
  }

  return result;
}
