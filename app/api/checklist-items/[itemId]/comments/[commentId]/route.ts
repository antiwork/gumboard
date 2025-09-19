import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Update a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string; commentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;
    const { content } = await request.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Find the comment and verify ownership
    const existingComment = await db.comment.findUnique({
      where: { id: commentId, deletedAt: null },
      include: {
        checklistItem: {
          include: {
            note: {
              include: {
                board: true,
              },
            },
          },
        },
      },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only allow the author to edit their own comment
    if (existingComment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update the comment
    const updatedComment = await db.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
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

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a comment (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string; commentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;

    // Find the comment and verify ownership
    const existingComment = await db.comment.findUnique({
      where: { id: commentId, deletedAt: null },
      include: {
        checklistItem: {
          include: {
            note: {
              include: {
                board: true,
              },
            },
          },
        },
      },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only allow the author to delete their own comment
    if (existingComment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Soft delete the comment
    await db.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
