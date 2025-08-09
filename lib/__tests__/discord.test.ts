import { formatNoteForDiscord, formatTodoForDiscord } from '../discord'

describe('formatNoteForDiscord', () => {
  it('should format a note correctly for Discord', () => {
    const note = { content: 'Test note content' }
    const boardName = 'Test Board'
    const userName = 'John Doe'

    const result = formatNoteForDiscord(note, boardName, userName)

    expect(result).toBe(':heavy_plus_sign: Test note content by John Doe in Test Board')
  })

  it('should handle empty note content', () => {
    const note = { content: '' }
    const boardName = 'Test Board'
    const userName = 'John Doe'

    const result = formatNoteForDiscord(note, boardName, userName)

    expect(result).toBe(':heavy_plus_sign:  by John Doe in Test Board')
  })

  it('should handle special characters in content', () => {
    const note = { content: 'Note with @mentions and #hashtags!' }
    const boardName = 'Special Board'
    const userName = 'Jane Smith'

    const result = formatNoteForDiscord(note, boardName, userName)

    expect(result).toBe(':heavy_plus_sign: Note with @mentions and #hashtags! by Jane Smith in Special Board')
  })

  it('should handle Unicode characters', () => {
    const note = { content: 'Unicode note 🚀 with émojis' }
    const boardName = 'Unicode Board'
    const userName = 'María José'

    const result = formatNoteForDiscord(note, boardName, userName)

    expect(result).toBe(':heavy_plus_sign: Unicode note 🚀 with émojis by María José in Unicode Board')
  })

  it('should handle multiline content', () => {
    const note = { content: 'Line 1\nLine 2\nLine 3' }
    const result = formatNoteForDiscord(note, 'Board', 'User')
    expect(result).toBe(':heavy_plus_sign: Line 1\nLine 2\nLine 3 by User in Board')
  })
})

describe('formatTodoForDiscord', () => {
  it('should format a newly added todo correctly', () => {
    const todoContent = 'Complete the task'
    const boardName = 'Task Board'
    const userName = 'John Doe'
    const action = 'added' as const

    const result = formatTodoForDiscord(todoContent, boardName, userName, action)

    expect(result).toBe(':heavy_plus_sign: Complete the task by John Doe in Task Board')
  })

  it('should format a completed todo correctly', () => {
    const todoContent = 'Complete the task'
    const boardName = 'Task Board'
    const userName = 'John Doe'
    const action = 'completed' as const

    const result = formatTodoForDiscord(todoContent, boardName, userName, action)

    expect(result).toBe(':white_check_mark: Complete the task by John Doe in Task Board')
  })

  it('should handle empty todo content', () => {
    const todoContent = ''
    const boardName = 'Task Board'
    const userName = 'John Doe'
    const action = 'added' as const

    const result = formatTodoForDiscord(todoContent, boardName, userName, action)

    expect(result).toBe(':heavy_plus_sign:  by John Doe in Task Board')
  })

  it('should handle special characters in todo content', () => {
    const todoContent = 'Fix bug #123 & test @reviewer'
    const boardName = 'Bug Board'
    const userName = 'Dev Team'
    const action = 'completed' as const

    const result = formatTodoForDiscord(todoContent, boardName, userName, action)

    expect(result).toBe(':white_check_mark: Fix bug #123 & test @reviewer by Dev Team in Bug Board')
  })
})
