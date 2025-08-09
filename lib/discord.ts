interface DiscordMessage {
  content: string
  username?: string
  avatar_url?: string
}

export function formatNoteForDiscord(note: { content: string }, boardName: string, userName: string): string {
  return `:heavy_plus_sign: ${note.content} by ${userName} in ${boardName}`
}

export function formatTodoForDiscord(todoContent: string, boardName: string, userName: string, action: 'added' | 'completed'): string {
  if (action === 'completed') {
    return `:white_check_mark: ${todoContent} by ${userName} in ${boardName}`
  }
  return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`
}

export async function sendDiscordMessage(webhookUrl: string, message: DiscordMessage): Promise<string | null> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error('Failed to send Discord message:', response.statusText)
      return null
    }

    return Date.now().toString()
  } catch (error) {
    console.error('Error sending Discord message:', error)
    return null
  }
}

export async function sendDiscordTodoNotification(webhookUrl: string, todoContent: string, boardName: string, userName: string, action: 'added' | 'completed'): Promise<string | null> {
  const content = formatTodoForDiscord(todoContent, boardName, userName, action)
  return await sendDiscordMessage(webhookUrl, {
    content,
    username: 'Gumboard'
  })
}

export async function updateDiscordMessage(webhookUrl: string, originalText: string, completed: boolean, boardName: string, userName: string): Promise<void> {
  try {
    const updatedContent = completed 
      ? `:white_check_mark: ${originalText} by ${userName} in ${boardName}`
      : `:heavy_plus_sign: ${originalText} by ${userName} in ${boardName}`
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: updatedContent,
        username: 'Gumboard'
      }),
    })
  } catch (error) {
    console.error('Error updating Discord message:', error)
  }
}


