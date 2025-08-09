import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NOTE_COLORS } from "@/lib/constants"
import { checkEtagMatch, createEtagResponse } from "@/lib/etag"

// Get all notes from all boards in the organization
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Generate ETag from timestamp and count (minimal DB query)
    const [latestNote, noteCount] = await Promise.all([
      db.note.findFirst({
        where: {
          deletedAt: null,
          board: { organizationId: user.organizationId }
        },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true }
      }),
      db.note.count({
        where: {
          deletedAt: null,
          board: { organizationId: user.organizationId }
        }
      })
    ])

    const etag = `${noteCount}-${latestNote?.updatedAt?.toISOString() || 'empty'}`
    
    // Check if client has matching ETag
    const etagMatch = checkEtagMatch(request, etag)
    if (etagMatch) return etagMatch

    // Only fetch full notes if ETag doesn't match
    const notes = await db.note.findMany({
      where: {
        deletedAt: null,
        board: {
          organizationId: user.organizationId
        }
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
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return createEtagResponse({ notes }, etag)
  } catch (error) {
    console.error("Error fetching global notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create a new note (for global view, we need to specify which board)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, boardId } = await request.json()
    
    if (!boardId) {
      return NextResponse.json({ error: "Board ID is required" }, { status: 400 })
    }

    // Verify user has access to the specified board (same organization)
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
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 