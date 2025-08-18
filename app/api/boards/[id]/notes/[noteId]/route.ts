import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { updateSlackMessage } from "@/lib/slack";

// Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { color, archivedAt } = await request.json();
    const { id: boardId, noteId } = await params;

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slackWebhookUrl: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      include: {
        board: true,
        user: { select: { id: true, name: true, email: true } },
        checklistItems: { orderBy: { order: "asc" } },
      },
    });

    if (!note || note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only the note author or admin can edit this note" },
        { status: 403 }
      );
    }

    const updatedNote = await db.note.update({
      where: { id: noteId },
      data: {
        ...(color !== undefined && { color }),
        ...(archivedAt !== undefined && { archivedAt }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        board: { select: { name: true, sendSlackUpdates: true } },
        checklistItems: { orderBy: { order: "asc" } },
      },
    });

    if (archivedAt !== undefined && user.organization?.slackWebhookUrl && note.slackMessageId) {
      const userName = note.user?.name || note.user?.email || "Unknown User";
      const boardName = note.board.name;
      const isArchived = archivedAt !== null;
      // Get content from first checklist item for Slack message
      const noteContent =
        note.checklistItems && note.checklistItems.length > 0 ? note.checklistItems[0].content : "";
      await updateSlackMessage(
        user.organization.slackWebhookUrl,
        noteContent,
        isArchived,
        boardName,
        userName
      );
    }

    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a note (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId, noteId } = await params;

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Verify the note belongs to a board in the user's organization
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: { board: true },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Check if note is already soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user is the author of the note or an admin
    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only the note author or admin can delete this note" },
        { status: 403 }
      );
    }

    // Soft delete: set deletedAt timestamp instead of actually deleting
    await db.note.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
