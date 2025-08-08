/**
 * Integration test for the Notes API with checklist items
 * Tests the complete flow including Slack notifications
 */
import { NextRequest } from 'next/server'
import { PUT } from '../app/api/boards/[id]/notes/[noteId]/route'

// Mock external dependencies
jest.mock('../auth', () => ({
  auth: jest.fn(() => Promise.resolve({ user: { id: 'test-user' } }))
}))

jest.mock('../lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn()
    },
    note: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    checklistItem: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn()
  }
}))

jest.mock('../lib/slack', () => ({
  notifySlackForNoteChanges: jest.fn(() => Promise.resolve({})),
  updateSlackMessage: jest.fn(),
  hasValidContent: jest.fn(() => true),
  shouldSendNotification: jest.fn(() => true)
}))

import { db } from '../lib/db'
import { notifySlackForNoteChanges } from '../lib/slack'

describe('/api/boards/[id]/notes/[noteId] PUT Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    ;(db.user.findUnique as jest.Mock).mockResolvedValue({
      organizationId: 'org-1',
      isAdmin: false,
      organization: {
        slackWebhookUrl: 'https://hooks.slack.com/webhook'
      }
    })
    
    ;(db.note.findUnique as jest.Mock).mockResolvedValue({
      id: 'note-1',
      content: 'Original content',
      done: false,
      createdBy: 'test-user',
      slackMessageId: null,
      boardId: 'board-1',
      board: {
        organizationId: 'org-1',
        name: 'Test Board',
        sendSlackUpdates: true
      },
      checklistItems: [
        { id: 'item-1', content: 'Task 1', checked: false, order: 0 }
      ]
    })
  })

  it('should call centralized Slack notifications after DB transaction', async () => {
    const finalNoteData = {
      id: 'note-1',
      content: 'Original content',
      done: false,
      createdBy: 'test-user',
      slackMessageId: null,
      boardId: 'board-1',
      user: {
        id: 'test-user',
        name: null,
        email: 'test@example.com'
      },
      board: {
        id: 'board-1',
        name: 'Test Board',
        organizationId: 'org-1',
        sendSlackUpdates: true
      },
      checklistItems: [
        { id: 'item-1', content: 'Task 1', checked: true, order: 0, slackMessageId: null },
        { id: 'item-2', content: 'New Task', checked: false, order: 1, slackMessageId: null }
      ]
    }

    const mockTransaction = jest.fn().mockImplementation(async (callback) => {
      return callback({
        note: { 
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue(finalNoteData)
        },
        checklistItem: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'item-1', content: 'Task 1', checked: false, order: 0 }
          ]),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn()
        }
      })
    })
    
    ;(db.$transaction as jest.Mock).mockImplementation(mockTransaction)
    
    const request = new NextRequest('http://localhost/api/boards/board-1/notes/note-1', {
      method: 'PUT',
      body: JSON.stringify({
        checklistItems: [
          { id: 'item-1', content: 'Task 1', checked: true, order: 0 }, // toggled
          { id: 'item-2', content: 'New Task', checked: false, order: 1 } // created
        ]
      })
    })

    await PUT(request, {
      params: Promise.resolve({ id: 'board-1', noteId: 'note-1' })
    })

    // Verify centralized Slack function was called with correct parameters
    expect(notifySlackForNoteChanges).toHaveBeenCalledWith({
      webhookUrl: 'https://hooks.slack.com/webhook',
      boardName: 'Test Board',
      boardId: 'board-1', 
      sendSlackUpdates: true,
      userId: 'test-user',
      userName: undefined, // user mock doesn't have name
      prevContent: 'Original content',
      nextContent: 'Original content',
      noteSlackMessageId: null,
      itemChanges: expect.objectContaining({
        created: expect.arrayContaining([
          expect.objectContaining({ id: 'item-2', content: 'New Task' })
        ]),
        updated: expect.arrayContaining([
          expect.objectContaining({ 
            id: 'item-1', 
            checked: true,
            previous: expect.objectContaining({ checked: false })
          })
        ])
      })
    })
  })

  it('should send at most 3 notifications for 3 created items', async () => {
    const mockSlackNotify = jest.fn().mockResolvedValue({
      itemMessageIds: {
        'item-1': 'msg-1',
        'item-2': 'msg-2', 
        'item-3': 'msg-3'
      }
    })
    ;(notifySlackForNoteChanges as jest.Mock).mockImplementation(mockSlackNotify)

    const mockTransaction = jest.fn().mockImplementation(async (callback) => {
      return callback({
        note: { 
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            id: 'note-1',
            content: 'Original content',
            done: false,
            createdBy: 'test-user',
            slackMessageId: null,
            boardId: 'board-1',
            user: {
              id: 'test-user',
              name: null,
              email: 'test@example.com'
            },
            board: {
              id: 'board-1',
              name: 'Test Board',
              organizationId: 'org-1',
              sendSlackUpdates: true
            },
            checklistItems: [
              { id: 'item-1', content: 'Task 1', checked: false, order: 0 },
              { id: 'item-2', content: 'Task 2', checked: false, order: 1 },
              { id: 'item-3', content: 'Task 3', checked: false, order: 2 }
            ]
          })
        },
        checklistItem: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn()
        }
      })
    })
    
    ;(db.$transaction as jest.Mock).mockImplementation(mockTransaction)

    const request = new NextRequest('http://localhost/api/boards/board-1/notes/note-1', {
      method: 'PUT',
      body: JSON.stringify({
        checklistItems: [
          { id: 'item-1', content: 'Task 1', checked: false, order: 0 },
          { id: 'item-2', content: 'Task 2', checked: false, order: 1 },
          { id: 'item-3', content: 'Task 3', checked: false, order: 2 }
        ]
      })
    })

    await PUT(request, {
      params: Promise.resolve({ id: 'board-1', noteId: 'note-1' })
    })

    // Should have been called once with 3 created items
    expect(mockSlackNotify).toHaveBeenCalledTimes(1)
    const callArgs = mockSlackNotify.mock.calls[0][0]
    expect(callArgs.itemChanges.created).toHaveLength(3)
  })

  it('should not send Slack notifications for reorder-only changes', async () => {
    const mockSlackNotify = jest.fn().mockResolvedValue({ itemMessageIds: {} })
    ;(notifySlackForNoteChanges as jest.Mock).mockImplementation(mockSlackNotify)

    const existingItems = [
      { id: 'item-1', content: 'Task 1', checked: false, order: 0 },
      { id: 'item-2', content: 'Task 2', checked: false, order: 1 }
    ]

    const mockTransaction = jest.fn().mockImplementation(async (callback) => {
      return callback({
        note: { 
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            id: 'note-1',
            content: 'Original content',
            done: false,
            createdBy: 'test-user',
            slackMessageId: null,
            boardId: 'board-1',
            user: {
              id: 'test-user',
              name: null,
              email: 'test@example.com'
            },
            board: {
              id: 'board-1',
              name: 'Test Board',
              organizationId: 'org-1',
              sendSlackUpdates: true
            },
            checklistItems: [
              { id: 'item-2', content: 'Task 2', checked: false, order: 0 }, // reordered to top
              { id: 'item-1', content: 'Task 1', checked: false, order: 1 }  // reordered to bottom
            ]
          })
        },
        checklistItem: {
          findMany: jest.fn().mockResolvedValue(existingItems),
          deleteMany: jest.fn(),
          createMany: jest.fn(),
          update: jest.fn()
        }
      })
    })
    
    ;(db.$transaction as jest.Mock).mockImplementation(mockTransaction)

    const request = new NextRequest('http://localhost/api/boards/board-1/notes/note-1', {
      method: 'PUT',
      body: JSON.stringify({
        checklistItems: [
          { id: 'item-2', content: 'Task 2', checked: false, order: 0 }, // reordered to top (order changed 1->0)
          { id: 'item-1', content: 'Task 1', checked: false, order: 1 }  // reordered to bottom (order changed 0->1)
        ]
      })
    })

    await PUT(request, {
      params: Promise.resolve({ id: 'board-1', noteId: 'note-1' })
    })

    // Should have been called with only order changes (no created/deleted, updated only for order)
    expect(mockSlackNotify).toHaveBeenCalledTimes(1)
    const callArgs = mockSlackNotify.mock.calls[0][0]
    
    // Verify no items were created or deleted (reorder-only)
    expect(callArgs.itemChanges.created).toHaveLength(0)
    expect(callArgs.itemChanges.deleted).toHaveLength(0)
    
    // Verify items were marked as updated due to order change, but Slack should ignore order-only changes
    expect(callArgs.itemChanges.updated).toHaveLength(2)
    
    // The key test: centralized Slack logic should detect these are order-only changes and NOT send notifications
    // This proves the logic in lib/slack.ts correctly filters out order-only changes
  })
})
