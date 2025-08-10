import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NOTE_COLORS } from "@/lib/constants"

// Get all notes from all boards in the organization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user?.organizations || user.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    const organizationIds = user.organizations.map(org => org.organization.id)

    // Get all notes from all boards across all user's organizations
    const notes = await db.note.findMany({
      where: {
        deletedAt: null,
        board: {
          organizationId: { in: organizationIds }
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

    return NextResponse.json({ notes })
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

    // Verify user has access to the specified board
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user?.organizations || user.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    const board = await db.board.findUnique({
      where: { id: boardId }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Check if user is a member of the board's organization
    const userOrg = user.organizations.find(org => org.organization.id === board.organizationId)
    
    if (!userOrg) {
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