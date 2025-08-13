interface SlackMessage {
  text: string;
  username?: string;
  icon_emoji?: string;
  ts?: string;  // Message timestamp for updates
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

    // Generate a unique timestamp-based ID for tracking
    return `gumboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

// New function to send or update checklist item messages
export async function sendOrUpdateChecklistMessage(
  webhookUrl: string,
  checklistItem: {
    id: string;
    content: string;
    checked: boolean;
    slackMessageId: string | null;
  },
  boardName: string,
  userName: string,
  action: "created" | "updated" | "checked" | "unchecked"
): Promise<string | null> {
  try {
    const emoji = checklistItem.checked ? ":white_check_mark:" : ":heavy_plus_sign:";
    const actionText = action === "created" ? "added" : 
                     action === "checked" ? "completed" :
                     action === "unchecked" ? "reopened" : "updated";
    
    const messageText = `${emoji} Checklist item ${actionText}: "${checklistItem.content}" by ${userName} in ${boardName}`;

    // For webhook URLs, we can't update existing messages directly
    // Instead, we'll post a new message and track it
    const response = await fetch(webhookUrl, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: messageText,
        username: "Gumboard",
        icon_emoji: ":clipboard:",
      }),
    });

    if (!response.ok) {
      console.error("Failed to send checklist Slack message:", response.statusText);
      return null;
    }

    return `gumboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } catch (error) {
    console.error("Error sending checklist Slack message:", error);
    return null;
  }
}

// Improved message tracking for preventing duplicates
const recentMessages = new Map<string, { timestamp: number; messageId: string }>();
const MESSAGE_DEDUPE_WINDOW = 30000; // 30 seconds

export function shouldSendChecklistMessage(
  checklistItemId: string,
  action: string,
  content: string
): boolean {
  const key = `${checklistItemId}_${action}_${content}`;
  const now = Date.now();
  const recent = recentMessages.get(key);

  if (recent && now - recent.timestamp < MESSAGE_DEDUPE_WINDOW) {
    console.log(`[Slack] Preventing duplicate checklist message for ${key}`);
    return false;
  }

  recentMessages.set(key, { timestamp: now, messageId: "" });
  
  // Clean up old entries
  for (const [msgKey, value] of recentMessages.entries()) {
    if (now - value.timestamp > MESSAGE_DEDUPE_WINDOW) {
      recentMessages.delete(msgKey);
    }
  }
  
  return true;
}

export function formatNoteForSlack(
  note: { content: string },
  boardName: string,
  userName: string
): string {
  return `:heavy_plus_sign: ${note.content} by ${userName} in ${boardName}`;
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
  action: "added" | "completed",
  checklistItemId?: string
): Promise<string | null> {
  // Use deduplication if we have a checklist item ID
  if (checklistItemId && !shouldSendChecklistMessage(checklistItemId, action, todoContent)) {
    console.log(`[Slack] Skipping duplicate todo notification for ${checklistItemId}`);
    return null;
  }

  const message = formatTodoForSlack(todoContent, boardName, userName, action);
  return await sendSlackMessage(webhookUrl, {
    text: message,
    username: "Gumboard",
    icon_emoji: ":clipboard:",
  });
}
