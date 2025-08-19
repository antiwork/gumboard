import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

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
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Get all boards for the organization with last activity calculation
    const boards = await db.board.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
                archivedAt: null,
              },
            },
          },
        },
        notes: {
          where: {
            deletedAt: null,
            archivedAt: null,
          },
          select: {
            updatedAt: true,
            checklistItems: {
              select: {
                updatedAt: true,
              },
              orderBy: {
                updatedAt: "desc",
              },
              take: 1,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate last activity for each board
    const boardsWithActivity = boards.map((board) => {
      let lastActivity = board.createdAt;

      if (board.notes.length > 0) {
        const note = board.notes[0];
        let noteLastActivity = note.updatedAt;

        // Check if any checklist item was updated more recently
        if (note.checklistItems.length > 0) {
          const checklistItemLastUpdate = note.checklistItems[0].updatedAt;
          if (checklistItemLastUpdate > noteLastActivity) {
            noteLastActivity = checklistItemLastUpdate;
          }
        }

        if (noteLastActivity > lastActivity) {
          lastActivity = noteLastActivity;
        }
      }

      // Remove the notes field from the response as it was only used for calculation
      const { notes, ...boardWithoutNotes } = board;
      return {
        ...boardWithoutNotes,
        lastActivity,
      };
    });

    return NextResponse.json({ boards: boardsWithActivity });
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, isPublic } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Board name is required and cannot be empty or only whitespace" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Create new board
    const board = await db.board.create({
      data: {
        name: trimmedName,
        description,
        isPublic: Boolean(isPublic || false),
        organizationId: user.organizationId,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
                archivedAt: null,
              },
            },
          },
        },
      },
    });

    // For newly created boards, lastActivity is the creation time
    const boardWithActivity = {
      ...board,
      lastActivity: board.createdAt,
    };

    return NextResponse.json({ board: boardWithActivity }, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
