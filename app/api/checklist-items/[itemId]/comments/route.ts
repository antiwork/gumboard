import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Get all comments for a checklist item
export async function GET(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = params;

    // Verify user has access to this checklist item (through organization)
    const checklistItem = await db.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        note: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!checklistItem) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Check if user has access to this board
    if (checklistItem.note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get comments for this checklist item
    const comments = await db.comment.findMany({
      where: {
        checklistItemId: itemId,
        deletedAt: null, // Following your soft delete pattern
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc", // Oldest comments first (like a conversation)
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new comment
export async function POST(request: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = params;
    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Verify user has access to this checklist item
    const checklistItem = await db.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        note: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!checklistItem) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Check if user has access to this board
    if (checklistItem.note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create the comment
    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        checklistItemId: itemId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
