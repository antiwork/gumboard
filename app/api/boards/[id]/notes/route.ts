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

    const board = await db.board.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        isPublic: true,
        organizationId: true,
        notes: {
          where: {
            deletedAt: null, // Only include non-deleted notes
            archivedAt: null,
          },
          select: {
            id: true,
            content: true,
            color: true,
            boardId: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            archivedAt: true,
            checklistItems: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.isPublic) {
      return NextResponse.json({ notes: board.notes });
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    if (board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ notes: board.notes });
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

    const { content, color, checklistItems } = await request.json();
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

    const note = await db.note.create({
      data: {
        content,
        color: randomColor,
        boardId,
        createdBy: session.user.id,
        ...(checklistItems !== undefined && { checklistItems }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (
      user.organization?.slackWebhookUrl &&
      hasValidContent(content) &&
      shouldSendNotification(session.user.id, boardId, board.name, board.sendSlackUpdates)
    ) {
      const slackMessage = formatNoteForSlack(note, board.name, user.name || user.email);
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
