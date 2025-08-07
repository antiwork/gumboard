import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

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

    const { content, color, done, isChecklist, checklistItems } = await request.json()
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
    const updatedNote = await db.$transaction(async (tx) => {
      // Update the note
      const note = await tx.note.update({
        where: { id: noteId },
        data: {
          ...(content !== undefined && { content }),
          ...(color !== undefined && { color }),
          ...(done !== undefined && { done }),
          ...(isChecklist !== undefined && { isChecklist }),
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
            orderBy: {
              order: 'asc'
            }
          }
        }
      })

      // Handle checklist items update if provided
      if (checklistItems !== undefined && Array.isArray(checklistItems)) {
        // Delete existing checklist items
        await tx.checklistItem.deleteMany({
          where: { noteId }
        })

        // Create new checklist items if any
        if (checklistItems.length > 0) {
          await tx.checklistItem.createMany({
            data: checklistItems.map((item: { id: string; content: string; checked: boolean; order: number }) => ({
              id: item.id,
              content: item.content,
              checked: item.checked,
              order: item.order,
              noteId: noteId
            }))
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
            checklistItems: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        })
      }

      return note
    })

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