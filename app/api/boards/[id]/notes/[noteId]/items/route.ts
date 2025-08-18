import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTodoNotification, hasValidContent, shouldSendNotification } from "@/lib/slack";
import { requireSession, getUserWithOrg, requireNoteAccess } from "@/lib/server/access";
import { CreateItem } from "@/lib/server/schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await requireSession();
    const user = await getUserWithOrg(session.user.id);
    const { id: boardId, noteId } = await params;
    const note = await requireNoteAccess(noteId, user);

    const { content, checked } = CreateItem.parse(await request.json());

    const maxOrder = Math.max(...(note.checklistItems.map((item) => item.order) || []), -1);
    const order = maxOrder + 1;

    const checklistItem = await db.checklistItem.create({
      data: {
        content,
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
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Error creating checklist item:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
