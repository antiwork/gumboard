interface SlackMessage {
  text: string;
  channel: string;
  username?: string;
  icon_emoji?: string;
}

export function hasValidContent(content: string | null | undefined): boolean {
  if (!content) return false;

  const trimmed = content.trim();
  if (trimmed.length === 0) return false;

  const hasSubstantiveContent =
    /[a-zA-Z0-9\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed);

  return hasSubstantiveContent;
}

const notificationDebounce = new Map<string, number>();
const DEBOUNCE_DURATION = 1000;

export function shouldSendNotification(
  userId: string,
  boardId: string,
  boardName: string,
  sendSlackUpdates: boolean = true
): boolean {
  if (boardName.startsWith("Test")) return false;
  if (!sendSlackUpdates) return false;

  const key = `${userId}-${boardId}`;
  const now = Date.now();
  const lastNotification = notificationDebounce.get(key);

  if (lastNotification && now - lastNotification < DEBOUNCE_DURATION) {
    return false;
  }

  notificationDebounce.set(key, now);
  return true;
}

/**
 * Send a message to Slack using bot token
 */
export async function sendSlackMessage(
  token: string,
  message: SlackMessage
): Promise<string | null> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        username: message.username ?? "Gumboard",
        icon_emoji: message.icon_emoji ?? ":clipboard:",
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error(`Failed to send Slack message: ${data.error}`);
      return null;
    }

    return data.ts; // Slack timestamp ID for the message
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error sending Slack message: ${errorMessage}`);
    return null;
  }
}

/**
 * Update an existing message (requires ts + channel)
 */
export async function updateSlackMessage(
  token: string,
  channel: string,
  ts: string,
  newText: string
): Promise<boolean> {
  try {
    const response = await fetch("https://slack.com/api/chat.update", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel,
        ts,
        text: newText,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error(`Failed to update Slack message: ${data.error}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error updating Slack message: ${error}`);
    return false;
  }
}
/**
 * Join a Slack channel using bot token and channel ID
 */
export async function joinChannel(token: string, channel: string): Promise<boolean> {
  const response = await fetch("https://slack.com/api/conversations.join", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel }),
  });

  const data = await response.json();
  if (!data.ok) {
    console.error(`Failed to join channel: ${data.error}`);
    return false;
  }
  return true;
}

export function formatNoteForSlack(
  note: { checklistItems?: Array<{ content: string }> },
  boardName: string,
  userName: string
): string {
  const content =
    note.checklistItems && note.checklistItems.length > 0
      ? note.checklistItems[0].content
      : "New note";
  return `:heavy_plus_sign: ${content} by ${userName} in ${boardName}`;
}

export function formatTodoForSlack(
  todoContent: string,
  boardName: string,
  userName: string,
  action: "added" | "completed"
): string {
  if (action === "completed") {
    return `:white_check_mark: ${todoContent} by ${userName} in ${boardName}`;
  }
  return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`;
}

export async function sendTodoNotification(
  token: string,
  channel: string,
  todoContent: string,
  boardName: string,
  userName: string,
  action: "added" | "completed"
): Promise<string | null> {
  const message = formatTodoForSlack(todoContent, boardName, userName, action);
  return await sendSlackMessage(token, {
    channel,
    text: message,
    username: "Gumboard",
    icon_emoji: ":clipboard:",
  });
}
