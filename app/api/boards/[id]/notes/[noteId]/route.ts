import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { updateSlackMessage, formatNoteForSlack, sendSlackMessage, sendTodoNotification, hasValidContent, shouldSendNotification } from "@/lib/slack"
import { ChecklistItem } from "@/components"

function sanitizeIncomingItems(items: any[]): ChecklistItem[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((i) => i && typeof i.content === 'string')
    .map((i, idx) => ({
      id: typeof i.id === 'string' ? i.id : '',
      content: String(i.content), 
      checked: Boolean(i?.checked),
      order: Number.isFinite(i?.order) ? Number(i.order) : idx,
    }))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, done, checklistItems } = await request.json()
    const { id: boardId, noteId } = await params

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organization: {
          select: {
            id: true,
            name: true,
            slackWebhookUrl: true
          }
        }
      }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Verify the note belongs to a board in the user's organization
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: { 
        board: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check if note is soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if user is the author of the note or an admin
    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Only the note author or admin can edit this note" }, { status: 403 })
    }
    const sanitizedIncoming = Array.isArray(checklistItems) ? sanitizeIncomingItems(checklistItems) : undefined

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.note.update({
        where: { id: noteId },
        data: {
          ...(content !== undefined && { content }),
          ...(color !== undefined && { color }),
          ...(done !== undefined && { done }),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          board: { select: { name: true, sendSlackUpdates: true } },
        }
      })

      if (!sanitizedIncoming) {
        return { updated, itemChanges: null }
      }

      const existingItems = await tx.checklistItem.findMany({
        where: { noteId },
        orderBy: { order: 'asc' }
      })

      const existingById = new Map(existingItems.map((i) => [i.id, i]))

      const changes = {
        created: [] as typeof existingItems,
        toggledCompleted: [] as Array<{ prev: boolean; item: typeof existingItems[number] }>,
        updatedTextOnly: [] as typeof existingItems,
        deleted: [] as typeof existingItems,
      }

      // Upsert or create
      for (const incoming of sanitizedIncoming) {
        if (incoming.id && existingById.has(incoming.id)) {
          const prev = existingById.get(incoming.id)!
          const didToggle = prev.checked !== incoming.checked
          const didTextChange = prev.content !== incoming.content

          const updatedItem = await tx.checklistItem.update({
            where: { id: prev.id },
            data: {
              content: incoming.content,
              checked: incoming.checked,
              order: incoming.order,
            }
          })

          if (didToggle) {
            changes.toggledCompleted.push({ prev: prev.checked, item: updatedItem })
          } else if (didTextChange) {
            changes.updatedTextOnly.push(updatedItem)
          }

          existingById.delete(incoming.id)
        } else {
          // Create new item
          const created = await tx.checklistItem.create({
            data: {
              content: incoming.content,
              checked: incoming.checked,
              order: incoming.order,
              noteId,
            }
          })
          changes.created.push(created)
        }
      }

      // Remaining existingById are deleted
      if (existingById.size > 0) {
        const toDelete = Array.from(existingById.values())
        changes.deleted = toDelete
        // Soft-delete is not defined for items; perform hard delete
        await tx.checklistItem.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } })
      }

      return { updated, itemChanges: changes }
    })

    const updatedNote = result.updated

    // Slack notifications for checklist changes: only on create and toggle
    if (result.itemChanges && user.organization?.slackWebhookUrl && updatedNote.board.sendSlackUpdates) {
      const { created, toggledCompleted } = result.itemChanges
      const userName = user.name || user.email || 'Unknown User'
      const boardName = updatedNote.board.name

      // New items -> 'added' and store message ID for dedup
      for (const item of created) {
        if (!hasValidContent(item.content)) continue
        if (!shouldSendNotification(session.user.id, boardId, boardName, updatedNote.board.sendSlackUpdates)) continue
        const msgId = await sendTodoNotification(
          user.organization.slackWebhookUrl,
          item.content,
          boardName,
          userName,
          'added'
        )
        if (msgId) {
          await db.checklistItem.update({ where: { id: item.id }, data: { slackMessageId: msgId } })
        }
      }

      // Toggled completed -> 'completed' or 'reopened'
      for (const { prev, item } of toggledCompleted) {
        if (!hasValidContent(item.content)) continue
        if (!shouldSendNotification(session.user.id, boardId, boardName, updatedNote.board.sendSlackUpdates)) continue
        if (item.slackMessageId) {
          // Update existing Slack message to avoid duplication
          await updateSlackMessage(
            user.organization.slackWebhookUrl,
            item.content,
            item.checked,
            boardName,
            userName
          )
        } else {
          const action = item.checked ? 'completed' : 'reopened'
          const msgId = await sendTodoNotification(
            user.organization.slackWebhookUrl,
            item.content,
            boardName,
            userName,
            action
          )
          if (msgId) {
            await db.checklistItem.update({ where: { id: item.id }, data: { slackMessageId: msgId } })
          }
        }
      }
    }

    // Send Slack notification if content is being added to a previously empty note
    if (content !== undefined && user.organization?.slackWebhookUrl && !note.slackMessageId) {
      const wasEmpty = !hasValidContent(note.content)
      const hasContent = hasValidContent(content)
      
      if (wasEmpty && hasContent && shouldSendNotification(session.user.id, boardId, updatedNote.board.name, updatedNote.board.sendSlackUpdates)) {
        const slackMessage = formatNoteForSlack(updatedNote, updatedNote.board.name, user.name || user.email || 'Unknown User')
        const messageId = await sendSlackMessage(user.organization.slackWebhookUrl, {
          text: slackMessage,
          username: 'Gumboard',
          icon_emoji: ':clipboard:'
        })

        if (messageId) {
          await db.note.update({
            where: { id: noteId },
            data: { slackMessageId: messageId }
          })
        }
      }
    }

    // Update existing Slack message when note.done status changes (legacy note-level message)
    if (done !== undefined && user.organization?.slackWebhookUrl && note.slackMessageId) {
      const userName = note.user?.name || note.user?.email || 'Unknown User'
      const boardName = note.board.name
      await updateSlackMessage(user.organization.slackWebhookUrl, note.content, done, boardName, userName)
    }

    // Return full note with checklist items
    const fullNote = await db.note.findUnique({
      where: { id: noteId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        board: { select: { name: true, sendSlackUpdates: true } },
        checklistItems: {
          orderBy: { order: 'asc' },
          select: { id: true, content: true, checked: true, order: true }
        }
      }
    })

    return NextResponse.json({ note: fullNote })
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete a note (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: boardId, noteId } = await params

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Verify the note belongs to a board in the user's organization
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: { board: true }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check if note is already soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if user is the author of the note or an admin
    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Only the note author or admin can delete this note" }, { status: 403 })
    }

    // Soft delete: set deletedAt timestamp instead of actually deleting
    await db.note.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}                                                                                                                                