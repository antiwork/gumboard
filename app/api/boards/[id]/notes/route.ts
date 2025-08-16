import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  sendSlackMessage,
  formatNoteForSlack,
  hasValidContent,
  shouldSendNotification,
} from "@/lib/slack";
import { NOTE_COLORS } from "@/lib/constants";

// Get all notes for a board
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const boardId = (await params).id;

    const boardMeta = await db.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        isPublic: true,
        organizationId: true,
        updatedAt: true,
      },
    });

    if (!boardMeta) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check permissions for non-public boards
    if (!boardMeta.isPublic) {
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { organizationId: true },
      });

      if (!user?.organizationId) {
        return NextResponse.json({ error: "No organization found" }, { status: 403 });
      }

      if (boardMeta.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const isCheckOnly = searchParams.get("check") === "true";

    // If check-only, return just timestamp
    if (isCheckOnly) {
      const [latestNote, latestChecklistItem] = await Promise.all([
        db.note.findFirst({
          where: { boardId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        db.checklistItem.findFirst({
          where: { note: { boardId } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ]);

      const timestamps = [
        latestNote?.updatedAt,
        latestChecklistItem?.updatedAt,
        boardMeta.updatedAt,
      ].filter(Boolean) as Date[];

      const lastModified =
        timestamps.length > 0
          ? new Date(Math.max(...timestamps.map((t) => t.getTime()))).toISOString()
          : null;

      return NextResponse.json({ lastModified });
    }
    const notes = await db.note.findMany({
      where: { boardId, deletedAt: null, archivedAt: null },
      select: {
        id: true,
        color: true,
        boardId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        checklistItems: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new note
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { color, checklistItems } = await request.json();
    const boardId = (await params).id;

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
        organization: {
          select: {
            slackWebhookUrl: true,
          },
        },
        name: true,
        email: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        sendSlackUpdates: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const randomColor = color || NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

    // Process checklist items
    const initialChecklistItems: Array<{
      content: string;
      checked: boolean;
      order: number;
    }> = [];
    if (checklistItems && Array.isArray(checklistItems)) {
      checklistItems.forEach((item, index) => {
        initialChecklistItems.push({
          content: item.content || "",
          checked: item.checked || false,
          order: item.order !== undefined ? item.order : index,
        });
      });
    }

    const note = await db.note.create({
      data: {
        color: randomColor,
        boardId,
        createdBy: session.user.id,
        checklistItems:
          initialChecklistItems.length > 0
            ? {
                create: initialChecklistItems,
              }
            : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        checklistItems: { orderBy: { order: "asc" } },
      },
    });

    // Send Slack notification if note has checklist items with content
    const noteWithItems = note as typeof note & { checklistItems?: Array<{ content: string }> };
    const hasContent =
      noteWithItems.checklistItems &&
      noteWithItems.checklistItems.length > 0 &&
      noteWithItems.checklistItems.some((item) => hasValidContent(item.content));

    if (
      user.organization?.slackWebhookUrl &&
      hasContent &&
      shouldSendNotification(session.user.id, boardId, board.name, board.sendSlackUpdates)
    ) {
      const slackMessage = formatNoteForSlack(noteWithItems, board.name, user.name || user.email);
      const messageId = await sendSlackMessage(user.organization.slackWebhookUrl, {
        text: slackMessage,
        username: "Gumboard",
        icon_emoji: ":clipboard:",
      });

      if (messageId) {
        await db.note.update({
          where: { id: note.id },
          data: { slackMessageId: messageId },
        });
      }
    }

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
