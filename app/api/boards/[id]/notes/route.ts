import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NOTE_COLORS } from "@/lib/constants"
import { sendSlackNotification } from "@/lib/slack"

// Get all notes for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
            }
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
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

    const { content, color } = await request.json()
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
      where: { id: boardId }
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
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        board: {
          include: {
            organization: {
              select: {
                slackWebhookUrl: true
              }
            }
          }
        }
      }
    })

    // Send Slack notification if webhook is configured
    if (note.board.organization.slackWebhookUrl) {
      await sendSlackNotification(note.board.organization.slackWebhookUrl, {
        boardName: board.name,
        noteContent: note.content,
        authorName: note.user.name || '',
        authorEmail: note.user.email,
        action: 'created'
      })
    }

    // Remove sensitive data before returning
    return NextResponse.json({ 
      note: {
        id: note.id,
        content: note.content,
        color: note.color,
        done: note.done,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        isChecklist: note.isChecklist,
        checklistItems: note.checklistItems,
        boardId: note.boardId,
        createdBy: note.createdBy,
        user: note.user
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 