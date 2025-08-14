interface SlackMessage {
  text: string;
  username?: string;
  icon_emoji?: string;
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

export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<string | null> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Failed to send Slack message:", response.statusText);
      return null;
    }

    return Date.now().toString();
  } catch (error) {
    console.error("Error sending Slack message:", error);
    return null;
  }
}

export async function updateSlackMessage(
  webhookUrl: string,
  originalText: string,
  completed: boolean,
  boardName: string,
  userName: string
): Promise<void> {
  try {
    const updatedText = completed
      ? `:white_check_mark: ${originalText} by ${userName} in ${boardName}`
      : `:heavy_plus_sign: ${originalText} by ${userName} in ${boardName}`;

    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: updatedText,
        username: "Gumboard",
        icon_emoji: ":clipboard:",
      }),
    });
  } catch (error) {
    console.error("Error updating Slack message:", error);
  }
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
  webhookUrl: string,
  todoContent: string,
  boardName: string,
  userName: string,
  action: "added" | "completed"
): Promise<string | null> {
  const message = formatTodoForSlack(todoContent, boardName, userName, action);
  return await sendSlackMessage(webhookUrl, {
    text: message,
    username: "Gumboard",
    icon_emoji: ":clipboard:",
  });
}
