import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendTodoNotification, shouldSendNotification } from "@/lib/slack";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, checked, order } = await request.json();
    const { id: boardId, noteId, itemId } = await params;

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
        board: { select: { organizationId: true, name: true, sendSlackUpdates: true } },
      },
    });

    if (!note || note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only the note author or admin can edit this note" },
        { status: 403 }
      );
    }

    const existingItem = await db.checklistItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.noteId !== noteId) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    const updateData: { content?: string; checked?: boolean; order?: number } = {};
    if (content !== undefined) updateData.content = content.trim();
    if (checked !== undefined) updateData.checked = checked;
    if (order !== undefined) updateData.order = order;

    const checklistItem = await db.checklistItem.update({
      where: { id: itemId },
      data: updateData,
    });

    if (
      user.organization?.slackWebhookUrl &&
      checked !== undefined &&
      checked === true &&
      checked !== existingItem.checked &&
      shouldSendNotification(session.user.id, boardId, note.board.name, note.board.sendSlackUpdates)
    ) {
      const userName = user.name || user.email || "Unknown User";
      await sendTodoNotification(
        user.organization.slackWebhookUrl,
        checklistItem.content,
        note.board.name,
        userName,
        "completed"
      );
    }

    return NextResponse.json({ checklistItem });
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string; itemId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId, itemId } = await params;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          select: {
            id: true,
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
        board: { select: { organizationId: true } },
      },
    });

    if (!note || note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only the note author or admin can edit this note" },
        { status: 403 }
      );
    }

    const existingItem = await db.checklistItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.noteId !== noteId) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    await db.checklistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
