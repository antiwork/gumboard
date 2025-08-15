import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendTodoNotification, hasValidContent, shouldSendNotification } from "@/lib/slack";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, checked = false } = await request.json();
    const { id: boardId, noteId } = await params;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Item content is required" }, { status: 400 });
    }

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
        checklistItems: { select: { order: true } },
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

    const maxOrder = Math.max(...note.checklistItems.map((item) => item.order), -1);
    const order = maxOrder + 1;

    const checklistItem = await db.checklistItem.create({
      data: {
        content: content.trim(),
        checked,
        order,
        noteId,
      },
    });

    if (
      user.organization?.slackWebhookUrl &&
      hasValidContent(content) &&
      shouldSendNotification(session.user.id, boardId, note.board.name, note.board.sendSlackUpdates)
    ) {
      const userName = user.name || user.email || "Unknown User";
      await sendTodoNotification(
        user.organization.slackWebhookUrl,
        content,
        note.board.name,
        userName,
        "added"
      );
    }

    return NextResponse.json({ item: checklistItem });
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
