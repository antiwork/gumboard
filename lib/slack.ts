interface SlackApiMessage {
  channel: string
  text: string
  username?: string
  icon_emoji?: string
}

interface SlackApiResponse {
  ok: boolean
  ts?: string
  error?: string
  channel?: string
}

export async function sendSlackApiMessage(token: string, message: SlackApiMessage): Promise<string | null> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const data: SlackApiResponse = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return null
    }

    return data.ts || null
  } catch (error) {
    console.error('Error sending Slack API message:', error)
    return null
  }
}

export async function updateSlackApiMessage(token: string, channel: string, timestamp: string, message: Partial<SlackApiMessage>): Promise<boolean> {
  try {
    
    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ts: timestamp,
        ...message,
      }),
    })

    const data: SlackApiResponse = await response.json()
    
    if (!data.ok) {
      console.error('Slack API update error:', data.error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating Slack API message:', error)
    return false
  }
}

export function hasValidContent(content: string | null | undefined): boolean {
  if (!content) {
    return false
  }
  
  const trimmed = content.trim()
  
  if (trimmed.length === 0) {
    return false
  }
  
  const hasSubstantiveContent = /[a-zA-Z0-9\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed)
  
  if (!hasSubstantiveContent) {
    return false
  }
  
  return true
}

const notificationDebounce = new Map<string, number>()
const DEBOUNCE_DURATION = 1000

export function clearNotificationDebounce() {
  notificationDebounce.clear()
}

export function shouldSendNotification(userId: string, boardId: string, boardName: string, sendSlackUpdates: boolean = true): boolean {
  if (boardName.startsWith("Test")) {
    return false
  }
  
  if (!sendSlackUpdates) {
    return false
  }
  
  const key = `${userId}-${boardId}`
  const now = Date.now()
  const lastNotification = notificationDebounce.get(key)
  
  if (lastNotification && now - lastNotification < DEBOUNCE_DURATION) {
    return false
  }
  
  notificationDebounce.set(key, now)
  return true
}

export function formatNoteForSlack(note: { content: string }, boardName: string, userName: string): string {
  return `:heavy_plus_sign: ${note.content} by ${userName} in ${boardName}`
}

export function formatTodoForSlack(todoContent: string, boardName: string, userName: string, action: 'added' | 'completed' | 'reopened'): string {
  if (action === 'completed') {
    return `:white_check_mark: ${todoContent} by ${userName} in ${boardName}`
  } else if (action === 'reopened') {
    return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`
  }
  return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`
}

export async function notifySlackForNoteChanges(params: {
  slackApiToken?: string,
  slackChannelId?: string,
  boardName: string,
  boardId: string,
  sendSlackUpdates: boolean,
  userId: string,
  userName: string,
  prevContent: string,
  nextContent: string,
  noteSlackMessageId?: string | null,
  itemChanges?: {
    created: Array<{id: string, content: string, checked: boolean, order: number}>,
    updated: Array<{id: string, content: string, checked: boolean, order: number, previous: {content: string, checked: boolean, order: number}}>,
    deleted: Array<{id: string, content: string, checked: boolean, order: number}>
  },
  existingMessageIds?: Record<string, string> // itemId -> messageId mapping
}): Promise<{noteMessageId?: string | null; itemMessageIds?: Record<string, string>}> {
  const { 
    slackApiToken, slackChannelId, boardName, boardId, sendSlackUpdates, userId, userName, 
    prevContent, nextContent, noteSlackMessageId, itemChanges, existingMessageIds 
  } = params;
  
  const out: {noteMessageId?: string | null; itemMessageIds?: Record<string, string>} = {};
  
  if (!slackApiToken || !slackChannelId || !sendSlackUpdates) return out;

  // Handle note updates
  const had = hasValidContent(prevContent);
  const has = hasValidContent(nextContent);
  
  if (has && shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) {
    if (noteSlackMessageId) {
      const updated = await updateSlackApiMessage(slackApiToken, slackChannelId, noteSlackMessageId, {
        text: formatNoteForSlack({ content: nextContent as string }, boardName, userName)
      });
      if (updated) {
        out.noteMessageId = noteSlackMessageId;
      }
    } else if (!had) {
      // Create new note message (empty to non-empty note)
      out.noteMessageId = await sendSlackApiMessage(slackApiToken, {
        channel: slackChannelId,
        text: formatNoteForSlack({ content: nextContent as string }, boardName, userName)
      });
    }
  }

  const ids: Record<string, string> = {};
  const created = itemChanges?.created ?? [];
  const updated = itemChanges?.updated ?? [];

  // only send notifications for the first item to avoid spam
  if (created.length > 0 && hasValidContent(created[0].content) && shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) {
    const item = created[0];
    const msgId = await sendSlackApiMessage(slackApiToken, {
      channel: slackChannelId,
      text: formatTodoForSlack(item.content, boardName, userName, 'added')
    });
    if (msgId) ids[item.id] = msgId;
  }

  // Handle updated items - try to update existing messages when possible
  for (const u of updated) {
    const toggled = !!u.previous && u.previous.checked !== u.checked;
    if (!toggled || !hasValidContent(u.content)) continue;
    if (!shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) continue;
    
    const action = u.checked ? 'completed' : 'reopened';
    const existingMessageId = existingMessageIds?.[u.id];
    
    // Try to update existing message if we have the ID
    if (existingMessageId) {
      const updated = await updateSlackApiMessage(slackApiToken, slackChannelId, existingMessageId, {
        text: formatTodoForSlack(u.content, boardName, userName, action)
      });
      
      if (updated) {
        // Keep the same message ID since we updated it
        ids[u.id] = existingMessageId;
        continue;
      }
    }
    
    // Fall back to creating a new message
    const msgId = await sendSlackApiMessage(slackApiToken, {
      channel: slackChannelId,
      text: formatTodoForSlack(u.content, boardName, userName, action)
    });
    if (msgId) ids[u.id] = msgId;
  }

  if (Object.keys(ids).length) out.itemMessageIds = ids;
  return out;
}
