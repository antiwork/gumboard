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
    const boardsWithLastActivity = boards.map((board) => {
      let lastActivity = board.updatedAt;

      // Check if there are notes and get the most recent activity
      if (board.notes.length > 0) {
        const latestNote = board.notes[0];
        const noteUpdatedAt = new Date(latestNote.updatedAt);
        
        // Check if the note has checklist items and get the most recent one
        if (latestNote.checklistItems.length > 0) {
          const latestChecklistItem = latestNote.checklistItems[0];
          const checklistUpdatedAt = new Date(latestChecklistItem.updatedAt);
          lastActivity = checklistUpdatedAt > noteUpdatedAt ? checklistUpdatedAt : noteUpdatedAt;
        } else {
          lastActivity = noteUpdatedAt;
        }
        
        // Compare with board's own updatedAt
        const boardUpdatedAt = new Date(board.updatedAt);
        lastActivity = lastActivity > boardUpdatedAt ? lastActivity : boardUpdatedAt;
      }

      // Remove the notes field from the response since we only used it for calculation
      const { notes, ...boardWithoutNotes } = board;
      
      return {
        ...boardWithoutNotes,
        lastActivity: lastActivity.toISOString(),
      };
    });

    return NextResponse.json({ boards: boardsWithLastActivity });
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

    // Add lastActivity field for new boards (same as createdAt since it's new)
    const boardWithLastActivity = {
      ...board,
      lastActivity: board.createdAt.toISOString(),
    };

    return NextResponse.json({ board: boardWithLastActivity }, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
