import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { sendSlackMessage, formatNoteForSlack, hasValidContent, shouldSendNotification } from "@/lib/slack"
import { NOTE_COLORS } from "@/lib/constants"

// Get all notes for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const boardId = (await params).id

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        notes: {
          where: {
            deletedAt: null // Only include non-deleted notes
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            checklistItems: {
              orderBy: { order: 'asc' },
              select: { id: true, content: true, checked: true, order: true }
            }
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    if (board.isPublic) {
      return NextResponse.json({ notes: board.notes })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    if (board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ notes: board.notes })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, checklistItems } = await request.json()
    const boardId = (await params).id

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        sendSlackUpdates: true
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    if (board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const randomColor = color || NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]

    // Create note first
    const note = await db.note.create({
      data: {
        content,
        color: randomColor,
        boardId,
        createdBy: session.user.id,
        isChecklist: Array.isArray(checklistItems) && checklistItems.length > 0,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        checklistItems: {
          orderBy: { order: 'asc' },
          select: { id: true, content: true, checked: true, order: true }
        }
      }
    })

    // If checklist items provided, create them relationally
    let createdItems: Array<{ id: string; content: string; checked: boolean; order: number }> = []
    if (Array.isArray(checklistItems) && checklistItems.length > 0) {
      const sanitized = checklistItems
        .filter((i: any) => typeof i?.content === 'string')
        .map((i: any, idx: number) => ({
          content: String(i.content),
          checked: Boolean(i?.checked),
          order: Number.isFinite(i?.order) ? Number(i.order) : idx,
        }))

      if (sanitized.length > 0) {
        // Create items individually to capture IDs
        createdItems = []
        for (const [idx, item] of sanitized.entries()) {
          const created = await db.checklistItem.create({
            data: {
              content: item.content,
              checked: item.checked,
              order: item.order ?? idx,
              noteId: note.id,
            }
          })
          createdItems.push({ id: created.id, content: created.content, checked: created.checked, order: created.order })
        }
      }
    }

    if (user.organization?.slackWebhookUrl && hasValidContent(content) && shouldSendNotification(session.user.id, boardId, board.name, board.sendSlackUpdates)) {
      const slackMessage = formatNoteForSlack(note, board.name, user.name || user.email)
      const messageId = await sendSlackMessage(user.organization.slackWebhookUrl, {
        text: slackMessage,
        username: 'Gumboard',
        icon_emoji: ':clipboard:'
      })

      if (messageId) {
        await db.note.update({
          where: { id: note.id },
          data: { slackMessageId: messageId }
        })
      }
    }

    // Optionally send Slack notifications for created checklist items (creation only)
    // We intentionally avoid shouldSendNotification per-item to reduce debounce collisions across bulk adds
    if (createdItems.length > 0 && user.organization?.slackWebhookUrl && board.sendSlackUpdates) {
      const userName = user.name || user.email
      for (const item of createdItems) {
        if (!hasValidContent(item.content)) continue
        const msgId = await sendSlackMessage(user.organization.slackWebhookUrl, {
          text: `:heavy_plus_sign: ${item.content} by ${userName} in ${board.name}`,
          username: 'Gumboard',
          icon_emoji: ':clipboard:'
        })
        if (msgId) {
          await db.checklistItem.update({
            where: { id: item.id },
            data: { slackMessageId: msgId }
          })
        }
      }
    }

    // Return note with checklist items
    const fullNote = await db.note.findUnique({
      where: { id: note.id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        checklistItems: {
          orderBy: { order: 'asc' },
          select: { id: true, content: true, checked: true, order: true }
        }
      }
    })

    return NextResponse.json({ note: fullNote }, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}                                                                                                                                                                                                                                                                