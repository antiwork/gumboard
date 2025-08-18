import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NOTE_COLORS } from "@/lib/constants";

// Get all notes from all boards in the organization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Get all notes from all boards in the organization
    const notes = await db.note.findMany({
      where: {
        deletedAt: null, // Only include non-deleted notes
        archivedAt: null,
        board: {
          organizationId: user.organizationId,
        },
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
        board: {
          select: {
            id: true,
            name: true,
          },
        },
        checklistItems: { orderBy: { order: "asc" } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching global notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new note (for global view, we need to specify which board)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { color, boardId, checklistItems } = await request.json();

    if (!boardId) {
      return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
    }

    // Verify user has access to the specified board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const board = await db.board.findUnique({
      where: { id: boardId },
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
        board: {
          select: {
            id: true,
            name: true,
          },
        },
        checklistItems: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
