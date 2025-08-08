import { notifySlackForNoteChanges, sendTodoNotification, formatTodoForSlack } from '../slack'

// Mock fetch globally
global.fetch = jest.fn()

describe('Slack Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear debounce map by using different user/board combinations for each test
    jest.clearAllTimers()
  })

  describe('formatTodoForSlack', () => {
    it('formats added action correctly', () => {
      const result = formatTodoForSlack('Test task', 'Board Name', 'John Doe', 'added')
      expect(result).toBe(':heavy_plus_sign: Test task by John Doe in Board Name')
    })

    it('formats completed action correctly', () => {
      const result = formatTodoForSlack('Test task', 'Board Name', 'John Doe', 'completed')
      expect(result).toBe(':white_check_mark: Test task by John Doe in Board Name')
    })

    it('formats reopened action correctly', () => {
      const result = formatTodoForSlack('Test task', 'Board Name', 'John Doe', 'reopened')
      expect(result).toBe(':arrows_counterclockwise: Test task by John Doe in Board Name')
    })
  })

  describe('sendTodoNotification', () => {
    it('sends notification for all actions', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = mockFetch

      await sendTodoNotification('https://webhook.url', 'Test task', 'Board', 'User', 'added')
      await sendTodoNotification('https://webhook.url', 'Test task', 'Board', 'User', 'completed')  
      await sendTodoNotification('https://webhook.url', 'Test task', 'Board', 'User', 'reopened')

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('notifySlackForNoteChanges', () => {
    it('sends notifications only for created items', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = mockFetch

      const result = await notifySlackForNoteChanges({
        webhookUrl: 'https://webhook.url',
        boardName: 'Production Board',
        boardId: 'board-123',
        sendSlackUpdates: true,
        userId: 'user-123',
        userName: 'John Doe',
        itemChanges: {
          created: [
            { id: 'item-1', content: 'New task 1', checked: false, order: 0 },
            { id: 'item-2', content: 'New task 2', checked: false, order: 1 },
            { id: 'item-3', content: 'New task 3', checked: false, order: 2 }
          ],
          updated: []
        }
      })

      // Should send exactly 1 notification due to debouncing (only first one gets through)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.itemMessageIds).toBeDefined()
      expect(Object.keys(result.itemMessageIds!)).toHaveLength(1)
    })

    it('sends notifications only for checked status toggles', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = mockFetch

      await notifySlackForNoteChanges({
        webhookUrl: 'https://webhook.url',
        boardName: 'Production Board',
        boardId: 'board-456', // Different board to avoid debounce
        sendSlackUpdates: true,
        userId: 'user-456', // Different user to avoid debounce
        userName: 'Jane Doe',
        itemChanges: {
          created: [],
          updated: [
            // Text change only - should NOT send notification
            { id: 'item-1', content: 'Updated text', checked: false, order: 0, previous: { checked: false } },
            // Check toggle - should send notification
            { id: 'item-2', content: 'Task 2', checked: true, order: 1, previous: { checked: false } },
            // Reorder only - should NOT send notification
            { id: 'item-3', content: 'Task 3', checked: false, order: 2, previous: { checked: false } }
          ]
        }
      })

      // Should send only 1 notification for the checked toggle
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('sends reopened notification when item is unchecked', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = mockFetch

      await notifySlackForNoteChanges({
        webhookUrl: 'https://webhook.url',
        boardName: 'Production Board',
        boardId: 'board-789', // Different board to avoid debounce
        sendSlackUpdates: true,
        userId: 'user-789', // Different user to avoid debounce
        userName: 'Bob Smith',
        itemChanges: {
          created: [],
          updated: [
            { id: 'item-1', content: 'Task 1', checked: false, order: 0, previous: { checked: true } }
          ]
        }
      })

      expect(mockFetch).toHaveBeenCalledWith('https://webhook.url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ':arrows_counterclockwise: Task 1 by Bob Smith in Production Board',
          username: 'Gumboard',
          icon_emoji: ':clipboard:'
        })
      })
    })

    it('does not send notifications when webhookUrl is null', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      const result = await notifySlackForNoteChanges({
        webhookUrl: null,
        boardName: 'Production Board', 
        boardId: 'board-999',
        sendSlackUpdates: true,
        userId: 'user-999',
        userName: 'John Doe',
        itemChanges: {
          created: [{ id: 'item-1', content: 'Task', checked: false, order: 0 }],
          updated: []
        }
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result).toEqual({})
    })

    it('does not send notifications when sendSlackUpdates is false', async () => {
      const mockFetch = jest.fn()
      global.fetch = mockFetch

      const result = await notifySlackForNoteChanges({
        webhookUrl: 'https://webhook.url',
        boardName: 'Production Board',
        boardId: 'board-888', 
        sendSlackUpdates: false,
        userId: 'user-888',
        userName: 'John Doe',
        itemChanges: {
          created: [{ id: 'item-1', content: 'Task', checked: false, order: 0 }],
          updated: []
        }
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result).toEqual({})
    })

    it('prevents duplicate notifications via idempotent state checks', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      })
      global.fetch = mockFetch

      // First toggle: false -> true (should send)
      await notifySlackForNoteChanges({
        webhookUrl: 'https://webhook.url',
        boardName: 'Production Board',
        boardId: 'board-999',
        sendSlackUpdates: true,
        userId: 'user-999',
        userName: 'John Doe',
        itemChanges: {
          created: [],
          updated: [
            { id: 'item-1', content: 'Task', checked: true, order: 0, previous: { checked: false } }
          ]
        }
      })

      // Same toggle again: false -> true (should be debounced - no duplicate spam)
      await notifySlackForNoteChanges({
        webhookUrl: 'https://webhook.url',
        boardName: 'Production Board',
        boardId: 'board-999',
        sendSlackUpdates: true,
        userId: 'user-999',
        userName: 'John Doe',
        itemChanges: {
          created: [],
          updated: [
            { id: 'item-1', content: 'Task', checked: true, order: 0, previous: { checked: false } }
          ]
        }
      })

      // Should send only once due to debouncing - prevents duplicate Slack spam
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
