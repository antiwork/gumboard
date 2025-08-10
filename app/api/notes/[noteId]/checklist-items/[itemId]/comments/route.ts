import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Get all comments for a checklist item
export async function GET(
  request: NextRequest,
  { params }: { params: { noteId: string; itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId, itemId } = params;

    // Verify user has access to this note
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Check if note exists and user has access
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: {
        board: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if note is soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user has access to the board (same organization or public board)
    if (!note.board.isPublic && note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify the checklist item exists in this note
    const checklistItems = note.checklistItems as { id: string }[];
    const itemExists = checklistItems?.find((item) => item.id === itemId);

    if (!itemExists) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    // Fetch comments for this checklist item
    const comments = await db.comment.findMany({
      where: {
        noteId,
        checklistItemId: itemId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching checklist item comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new comment for a checklist item
export async function POST(
  request: NextRequest,
  { params }: { params: { noteId: string; itemId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();
    const { noteId, itemId } = params;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify user has access to this note
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Check if note exists and user has access
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: {
        board: true,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if note is soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if user has access to the board (same organization, no comments on public boards from outside users)
    if (note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify the checklist item exists in this note
    const checklistItems = note.checklistItems as { id: string }[];
    const itemExists = checklistItems?.find((item) => item.id === itemId);

    if (!itemExists) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    // Create comment
    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        checklistItemId: itemId,
        noteId,
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating checklist item comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
