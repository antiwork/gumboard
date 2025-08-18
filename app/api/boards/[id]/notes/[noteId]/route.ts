import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateSlackMessage } from "@/lib/slack";
import { requireSession, getUserWithOrg, requireNoteAccess } from "@/lib/server/access";
import { UpdateNote } from "@/lib/server/schemas";

// Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await requireSession();
    const user = await getUserWithOrg(session.user.id);
    const { noteId } = await params;
    await requireNoteAccess(noteId, user);

    const updateData = UpdateNote.parse(await request.json());

    const noteBeforeUpdate = await db.note.findUnique({
      where: { id: noteId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        board: { select: { name: true, sendSlackUpdates: true } },
        checklistItems: {
          select: { content: true },
          orderBy: { order: "asc" },
          take: 1,
        },
      },
    });

    const updatedNote = await db.note.update({
      where: { id: noteId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        board: { select: { name: true, sendSlackUpdates: true } },
        checklistItems: { orderBy: { order: "asc" } },
      },
    });

    if (
      updateData.archivedAt !== undefined &&
      user.organization?.slackWebhookUrl &&
      noteBeforeUpdate?.slackMessageId
    ) {
      const userName =
        noteBeforeUpdate.user?.name || noteBeforeUpdate.user?.email || "Unknown User";
      const boardName = noteBeforeUpdate.board.name;
      const isArchived = updateData.archivedAt !== null;
      const noteContent =
        noteBeforeUpdate.checklistItems && noteBeforeUpdate.checklistItems.length > 0
          ? noteBeforeUpdate.checklistItems[0].content
          : "";
      await updateSlackMessage(
        user.organization.slackWebhookUrl,
        noteContent,
        isArchived,
        boardName,
        userName
      );
    }

    return NextResponse.json({ note: updatedNote });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await requireSession();
    const user = await getUserWithOrg(session.user.id);
    const { noteId } = await params;
    await requireNoteAccess(noteId, user);

    await db.note.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
