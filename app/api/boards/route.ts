import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boardSchema } from "@/lib/types";

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

    // Get current user's org access setting
    const currentUserAccess = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hasOrgWideAccess: true },
    });

    // Get boards user has access to based on sharing settings
    const boards = await db.board.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          // User is explicitly a member of the board
          {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
          // Board is shared with organization AND user has org-wide access
          {
            shareWithOrganization: true,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        shareWithOrganization: true,
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
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const boardsWithLastActivityTimestamp = boards.map((board) => ({
      id: board.id,
      name: board.name,
      description: board.description,
      isPublic: board.isPublic,
      shareWithOrganization: board.shareWithOrganization,
      createdBy: board.createdBy,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      _count: board._count,
      lastActivityAt: board.notes[0]?.updatedAt ?? board.updatedAt,
    }));

    return NextResponse.json({ boards: boardsWithLastActivityTimestamp });
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

    const body = await request.json();

    let validatedBody;
    try {
      validatedBody = boardSchema
        .extend({
          name: z.string().min(1, "Board name is required and cannot be empty or only whitespace"),
        })
        .parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { name, description, isPublic } = validatedBody;
    const trimmedName = name.trim();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
        organization: {
          select: {
            shareAllBoardsByDefault: true,
          },
        },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const shareWithOrganization = user.organization?.shareAllBoardsByDefault ?? true;

    // Create new board
    const board = await db.board.create({
      data: {
        name: trimmedName,
        description,
        isPublic: Boolean(isPublic),
        shareWithOrganization,
        organizationId: user.organizationId,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        shareWithOrganization: true,
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

    // Add creator to board members
    await db.boardMember.create({
      data: {
        userId: session.user.id,
        boardId: board.id,
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
