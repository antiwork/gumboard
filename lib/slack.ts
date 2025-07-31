interface SlackMessage {
  text: string
  username?: string
  icon_emoji?: string
}

export function hasValidContent(content: string | null | undefined): boolean {
  const isValid = Boolean(content && content.trim().length > 0)
  console.log(`[Slack] hasValidContent check: "${content}" -> ${isValid}`)
  return isValid
}

const notificationDebounce = new Map<string, number>()
const DEBOUNCE_DURATION = 1000
const MAX_CACHE_SIZE = 1000 // Maximum number of entries to prevent unbounded growth
const CLEANUP_INTERVAL = 60000 // Clean up old entries every minute

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  const cutoffTime = now - DEBOUNCE_DURATION * 2 // Remove entries older than 2x debounce duration
  
  for (const [key, timestamp] of notificationDebounce.entries()) {
    if (timestamp < cutoffTime) {
      notificationDebounce.delete(key)
    }
  }
  
  // If still too many entries, remove oldest ones
  if (notificationDebounce.size > MAX_CACHE_SIZE) {
    const entries = Array.from(notificationDebounce.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by timestamp, oldest first
    
    const entriesToRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE)
    for (const [key] of entriesToRemove) {
      notificationDebounce.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export function shouldSendNotification(userId: string, boardId: string): boolean {
  const key = `${userId}-${boardId}`
  const now = Date.now()
  const lastNotification = notificationDebounce.get(key)
  
  if (lastNotification && now - lastNotification < DEBOUNCE_DURATION) {
    console.log(`[Slack] Debounced notification for ${key} (${now - lastNotification}ms ago)`)
    return false
  }
  
  notificationDebounce.set(key, now)
  console.log(`[Slack] Allowing notification for ${key}`)
  return true
}

export async function sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<string | null> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error('Failed to send Slack message:', response.statusText)
      return null
    }

    return Date.now().toString()
  } catch (error) {
    console.error('Error sending Slack message:', error)
    return null
  }
}

export async function updateSlackMessage(webhookUrl: string, originalText: string, completed: boolean, boardName: string, userName: string): Promise<void> {
  try {
    const updatedText = completed 
      ? `:white_check_mark: ${originalText} by ${userName} in ${boardName}`
      : `:heavy_plus_sign: ${originalText} by ${userName} in ${boardName}`
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: updatedText,
        username: 'Gumboard',
        icon_emoji: ':clipboard:'
      }),
    })
  } catch (error) {
    console.error('Error updating Slack message:', error)
  }
}

export function formatNoteForSlack(note: { content: string; isChecklist?: boolean }, boardName: string, userName: string): string {
  return `:heavy_plus_sign: ${note.content} by ${userName} in ${boardName}`
}

export function formatTodoForSlack(todoContent: string, boardName: string, userName: string, action: 'added' | 'completed'): string {
  if (action === 'completed') {
    return `:white_check_mark: ${todoContent} by ${userName} in ${boardName}`
  }
  return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`
}

export async function sendTodoNotification(webhookUrl: string, todoContent: string, boardName: string, userName: string, action: 'added' | 'completed'): Promise<string | null> {
  const message = formatTodoForSlack(todoContent, boardName, userName, action)
  return await sendSlackMessage(webhookUrl, {
    text: message,
    username: 'Gumboard',
    icon_emoji: ':clipboard:'
  })
}
