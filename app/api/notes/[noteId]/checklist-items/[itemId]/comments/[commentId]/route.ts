import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Delete a comment from a checklist item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { noteId: string; itemId: string; commentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId, itemId, commentId } = params;

    // Verify user has access
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Check if comment exists and get note info
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      include: {
        note: {
          include: {
            board: true,
          },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check if comment is already soft-deleted
    if (comment.deletedAt) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Verify the comment belongs to the specified note and checklist item
    if (comment.noteId !== noteId || comment.checklistItemId !== itemId) {
      return NextResponse.json(
        { error: "Comment does not belong to this checklist item" },
        { status: 400 }
      );
    }

    // Check if user has access to the board
    if (comment.note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user is the author of the comment or an admin
    if (comment.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only the comment author or admin can delete this comment" },
        { status: 403 }
      );
    }

    // Verify the checklist item exists in the note
    const checklistItems = comment.note.checklistItems as { id: string }[];
    const itemExists = checklistItems?.find((item) => item.id === itemId);

    if (!itemExists) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    // Soft delete the comment
    await db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist item comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
