import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { sendSlackMessage, formatNoteForSlack, hasValidContent, shouldSendNotification } from "@/lib/slack"
import { NOTE_COLORS } from "@/lib/constants"
import { checkEtagMatch, createEtagResponse } from "@/lib/etag"

// Get all notes for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const boardId = (await params).id

    // First check board exists and permissions with minimal data
    const boardMeta = await db.board.findUnique({
      where: { id: boardId },
      select: { 
        id: true,
        isPublic: true,
        organizationId: true
      }
    })

    if (!boardMeta) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Check permissions for non-public boards
    if (!boardMeta.isPublic) {
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

      if (boardMeta.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    // Generate ETag from timestamp and count (minimal DB query)
    const [latestNote, noteCount] = await Promise.all([
      db.note.findFirst({
        where: { boardId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }),
      db.note.count({
        where: { boardId, deletedAt: null }
      })
    ])

    const etag = `${noteCount}-${latestNote?.updatedAt?.toISOString() || 'empty'}`
    
    // Check if client has matching ETag
    const etagMatch = checkEtagMatch(request, etag)
    if (etagMatch) return etagMatch

    // Only fetch full notes if ETag doesn't match
    const notes = await db.note.findMany({
      where: { boardId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return createEtagResponse({ notes }, etag)
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

    const note = await db.note.create({
      data: {
        content,
        color: randomColor,
        boardId,
        createdBy: session.user.id,
        ...(checklistItems !== undefined && { checklistItems }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

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

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}                                                                                                                                                                                                                                                                