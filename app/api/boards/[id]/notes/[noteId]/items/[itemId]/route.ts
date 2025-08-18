import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTodoNotification, shouldSendNotification } from "@/lib/slack";
import { requireSession, getUserWithOrg, requireNoteAccess } from "@/lib/server/access";
import { UpdateItem } from "@/lib/server/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string; itemId: string }> }
) {
  try {
    const session = await requireSession();
    const user = await getUserWithOrg(session.user.id);
    const { id: boardId, noteId, itemId } = await params;
    const note = await requireNoteAccess(noteId, user);

    const existingItem = await db.checklistItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem || existingItem.noteId !== noteId) {
      return NextResponse.json({ error: "Checklist item not found" }, { status: 404 });
    }

    const updateData = UpdateItem.parse(await request.json());

    const checklistItem = await db.checklistItem.update({
      where: { id: itemId },
      data: updateData,
    });

    if (
      user.organization?.slackWebhookUrl &&
      updateData.checked !== undefined &&
      updateData.checked === true &&
      updateData.checked !== existingItem.checked &&
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
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Error updating checklist item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string; itemId: string }> }
) {
  try {
    const session = await requireSession();
    const user = await getUserWithOrg(session.user.id);
    const { noteId, itemId } = await params;
    await requireNoteAccess(noteId, user);

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
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Error deleting checklist item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
