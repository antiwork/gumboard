interface SlackMessage {
  text: string
  username?: string
  icon_emoji?: string
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
