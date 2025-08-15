import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  updateSlackMessage,
  sendTodoNotification,
  hasValidContent,
  shouldSendNotification,
} from "@/lib/slack";

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

    const { color, archivedAt, checklistItems } = await request.json();
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

    let sanitizedChecklistItems:
      | Array<{ id: string; content: string; checked: boolean; order: number }>
      | undefined;

    if (checklistItems !== undefined) {
      if (!Array.isArray(checklistItems)) {
        return NextResponse.json({ error: "checklistItems must be an array" }, { status: 400 });
      }

      for (const item of checklistItems) {
        if (
          typeof item.id !== "string" ||
          typeof item.content !== "string" ||
          typeof item.checked !== "boolean" ||
          typeof item.order !== "number"
        ) {
          return NextResponse.json(
            {
              error:
                "Each checklist item must have id (string), content (string), checked (boolean), order (number)",
            },
            { status: 400 }
          );
        }
      }

      const ids = checklistItems.map((i: { id: string }) => i.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        return NextResponse.json({ error: "Duplicate checklist item IDs found" }, { status: 400 });
      }

      sanitizedChecklistItems = [...checklistItems]
        .sort((a, b) => a.order - b.order)
        .map((item, i) => ({ ...item, order: i }));
    }

    let checklistChanges:
      | {
          created: Array<{ id: string; content: string; checked: boolean; order: number }>;
          updated: Array<{
            id: string;
            content: string;
            checked: boolean;
            order: number;
            previous: { content: string; checked: boolean; order: number };
          }>;
          deleted: Array<{ id: string; content: string; checked: boolean; order: number }>;
        }
      | undefined;

    const updatedNote = await db.$transaction(async (tx) => {
      if (sanitizedChecklistItems !== undefined) {
        const existing = await tx.checklistItem.findMany({
          where: { noteId },
          orderBy: { order: "asc" },
        });

        const existingMap = new Map(existing.map((i) => [i.id, i]));
        const incomingMap = new Map(sanitizedChecklistItems.map((i) => [i.id, i]));

        const toCreate = sanitizedChecklistItems.filter((i) => !existingMap.has(i.id));
        const toUpdate = sanitizedChecklistItems.filter((i) => {
          const prev = existingMap.get(i.id);
          return (
            prev &&
            (prev.content !== i.content || prev.checked !== i.checked || prev.order !== i.order)
          );
        });
        const toDelete = existing.filter((i) => !incomingMap.has(i.id));

        if (toDelete.length) {
          await tx.checklistItem.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
        }
        if (toCreate.length) {
          await tx.checklistItem.createMany({
            data: toCreate.map((i) => ({
              id: i.id,
              content: i.content,
              checked: i.checked,
              order: i.order,
              noteId,
            })),
          });
        }
        for (const i of toUpdate) {
          await tx.checklistItem.update({
            where: { id: i.id },
            data: { content: i.content, checked: i.checked, order: i.order },
          });
        }

        checklistChanges = {
          created: toCreate,
          updated: toUpdate.map((i) => ({
            ...i,
            previous: {
              content: existingMap.get(i.id)!.content,
              checked: existingMap.get(i.id)!.checked,
              order: existingMap.get(i.id)!.order,
            },
          })),
          deleted: toDelete,
        };
      }

      return tx.note.update({
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

    if (user.organization?.slackWebhookUrl && checklistChanges) {
      const boardName = updatedNote.board.name;
      const userName = user.name || user.email || "Unknown User";

      for (const item of checklistChanges.created) {
        if (
          hasValidContent(item.content) &&
          shouldSendNotification(
            session.user.id,
            boardId,
            boardName,
            updatedNote.board.sendSlackUpdates
          )
        ) {
          await sendTodoNotification(
            user.organization.slackWebhookUrl,
            item.content,
            boardName,
            userName,
            "added"
          );
        }
      }

      for (const u of checklistChanges.updated) {
        if (
          !u.previous.checked &&
          u.checked &&
          shouldSendNotification(
            session.user.id,
            boardId,
            boardName,
            updatedNote.board.sendSlackUpdates
          )
        ) {
          await sendTodoNotification(
            user.organization.slackWebhookUrl,
            u.content,
            boardName,
            userName,
            "completed"
          );
        }
      }
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
