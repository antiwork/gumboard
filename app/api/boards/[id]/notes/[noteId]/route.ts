import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { notifySlackForNoteChanges, updateSlackMessage, hasValidContent, shouldSendNotification } from "@/lib/slack"

type IncomingItem = { id: string; content: string; checked: boolean; order: number };

const serverSanitize = (items: unknown): IncomingItem[] =>
  (Array.isArray(items) ? items : [])
    .filter((i): i is Record<string, unknown> => i && typeof i === 'object' && i !== null && typeof (i as Record<string, unknown>).id === 'string' && typeof (i as Record<string, unknown>).content === 'string')
    .map(i => ({
      id: String(i.id),
      content: String(i.content),
      checked: Boolean(i.checked),
      order: Number.isFinite(i.order) ? Number(i.order) : 0
    }));

// Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawBody = await request.json()
    const { content, color, done } = rawBody
    const { id: boardId, noteId } = await params

    let checklistItems: IncomingItem[] | undefined;
    if (rawBody.checklistItems !== undefined) {
      try {
        checklistItems = serverSanitize(rawBody.checklistItems);
      } catch {
        return NextResponse.json({ error: "Invalid checklist items format" }, { status: 400 })
      }
      if (Array.isArray(rawBody.checklistItems) && checklistItems!.length !== rawBody.checklistItems.length) {
        return NextResponse.json({ error: "Invalid checklist item payload (missing id/content)" }, { status: 400 })
      }
      if (checklistItems) {
        const ids = new Set<string>();
        for (const it of checklistItems) {
          if (ids.has(it.id)) {
            return NextResponse.json({ error: "Duplicate checklist item ids in payload" }, { status: 400 })
          }
          ids.add(it.id);
        }
      }
    }

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    const orgWebhook = user?.organization?.slackWebhookUrl ?? null;

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
        },
        checklistItems: {
          orderBy: {
            order: 'asc'
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

    // Use a transaction to update note and checklist items together
    let checklistChanges: { created: { id: string; content: string; checked: boolean; order: number }[]; updated: { id: string; content: string; checked: boolean; order: number; previous: { id: string; content: string; checked: boolean; order: number } }[]; deleted: { id: string; content: string; checked: boolean; order: number }[] } | null = { created: [], updated: [], deleted: [] };

    const updatedNote = await db.$transaction(async (tx) => {
      // Update the note
      const updatedNote = await tx.note.update({
        where: { id: noteId },
        data: {
          ...(content !== undefined && { content }),
          ...(color !== undefined && { color }),
          ...(done !== undefined && { done }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          board: true,
          checklistItems: {
            orderBy: {
              order: 'asc'
            }
          }
        }
      })

      // Handle checklist items update if provided
      if (checklistItems !== undefined && Array.isArray(checklistItems)) {
        const existingItems = await tx.checklistItem.findMany({
          where: { noteId },
          orderBy: { order: 'asc' }
        })

        const existingItemsMap = new Map(existingItems.map(item => [item.id, item]))
        const newItemsMap = new Map(checklistItems.map(item => [item.id, item]))

        const createdItems = checklistItems.filter(item => !existingItemsMap.has(item.id))
        const updatedItems = checklistItems.filter(item => {
          const existing = existingItemsMap.get(item.id)
          return existing && (
            existing.content !== item.content || 
            existing.checked !== item.checked || 
            existing.order !== item.order
          )
        })
        const deletedItemIds = existingItems
          .filter(item => !newItemsMap.has(item.id))
          .map(item => item.id)
        const deletedItems = existingItems.filter(item => deletedItemIds.includes(item.id))

        // Store changes for Slack notifications
        checklistChanges = {
          created: createdItems,
          updated: updatedItems.map(item => {
            const existing = existingItemsMap.get(item.id);
            return {
              ...item,
              previous: existing ? {
                id: existing.id,
                content: existing.content,
                checked: existing.checked,
                order: existing.order
              } : { id: item.id, content: '', checked: false, order: 0 }
            };
          }),
          deleted: deletedItems
        }

        // Delete removed items
        if (deletedItemIds.length > 0) {
          await tx.checklistItem.deleteMany({
            where: { id: { in: deletedItemIds } }
          })
        }

        // Create new items
        if (createdItems.length > 0) {
          await tx.checklistItem.createMany({
            data: createdItems.map(item => ({
              id: item.id,
              content: item.content,
              checked: item.checked,
              order: item.order,
              noteId: noteId
            }))
          })
        }

        // Update existing items
        for (const item of updatedItems) {
          await tx.checklistItem.update({
            where: { id: item.id },
            data: {
              content: item.content,
              checked: item.checked,
              order: item.order
            }
          })
        }

        // Refresh the note with updated checklist items
        return await tx.note.findUnique({
          where: { id: noteId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            board: true,
            checklistItems: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        })
      }

      return updatedNote
    })

    // Handle Slack notifications after the database transaction
    if (updatedNote) {
      // Use centralized Slack notifications
      if (orgWebhook && updatedNote.board.sendSlackUpdates) {
        const res = await notifySlackForNoteChanges({
          webhookUrl: orgWebhook,
          boardName: updatedNote.board.name,
          boardId: updatedNote.boardId,
          sendSlackUpdates: updatedNote.board.sendSlackUpdates,
          userId: session.user.id,
          userName: user.name || user.email,
          prevContent: note.content,
          nextContent: content ?? note.content,
          noteSlackMessageId: note.slackMessageId,
          itemChanges: checklistChanges || undefined,
        })

        // Persist Slack message IDs
        if (res.noteMessageId && !updatedNote.slackMessageId) {
          await db.note.update({ 
            where: { id: noteId }, 
            data: { slackMessageId: res.noteMessageId } 
          })
        }
        if (res.itemMessageIds) {
          for (const [itemId, msgId] of Object.entries(res.itemMessageIds)) {
            await db.checklistItem.update({ 
              where: { id: itemId }, 
              data: { slackMessageId: msgId } 
            })
          }
        }

        // Handle note-level done toggle separately
        if (done !== undefined && note.done !== done && shouldSendNotification(session.user.id, updatedNote.boardId, updatedNote.board.name, updatedNote.board.sendSlackUpdates)) {
          const noteContent = updatedNote.content || (updatedNote.checklistItems && updatedNote.checklistItems.length > 0 ? updatedNote.checklistItems[0].content : 'Note')
          if (hasValidContent(noteContent)) {
            await updateSlackMessage(
              orgWebhook!,
              noteContent,
              done,
              updatedNote.board.name,
              user.name || user.email
            )
          }
        }
      }
    }

    return NextResponse.json({ note: updatedNote })
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