import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boardSchema } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const boardId = (await params).id;

    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { organization: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.isPublic) {
      const { organization, ...boardData } = board;
      return NextResponse.json({
        board: {
          ...boardData,
          organization: {
            id: organization.id,
            name: organization.name,
          },
        },
      });
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access: board is public, shared with org, or user is member
    const hasAccess = board.isPublic ||
      board.shareWithOrganization ||
      await db.boardMember.findFirst({
        where: {
          boardId: boardId,
          userId: session.user.id,
        },
      });

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Return board data without sensitive organization member details
    const { organization, ...boardData } = board;

    return NextResponse.json({
      board: {
        ...boardData,
        shareWithOrganization: board.shareWithOrganization,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boardId = (await params).id;
    const body = await request.json();

    let validatedBody;
    try {
      validatedBody = boardSchema
        .extend({
          name: z.string().optional(),
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

    const { name, description, isPublic, sendSlackUpdates, shareWithOrganization } = validatedBody;

    // Check if board exists and user has access
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { organization: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user is member of the organization and get admin status
    const currentUser = await db.user.findFirst({
      where: {
        id: session.user.id,
        organizationId: board.organizationId,
      },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user has board access (is member or org admin)
    const isBoardMember = await db.boardMember.findFirst({
      where: {
        boardId: boardId,
        userId: session.user.id,
      },
    });

    if (!isBoardMember && !currentUser.isAdmin) {
      return NextResponse.json({ error: "Only board members or org admins can edit this board" }, { status: 403 });
    }

    // For name/description/isPublic updates, check if user can edit this board (board creator or admin)
    if (
      (name !== undefined || description !== undefined || isPublic !== undefined) &&
      board.createdBy !== session.user.id &&
      !currentUser.isAdmin
    ) {
      return NextResponse.json(
        { error: "Only the board creator or admin can edit this board" },
        { status: 403 }
      );
    }

    const updateData: {
      name?: string;
      description?: string | null;
      isPublic?: boolean;
      sendSlackUpdates?: boolean;
      shareWithOrganization?: boolean;
    } = {};
    if (name !== undefined) updateData.name = name.trim() || board.name;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (sendSlackUpdates !== undefined) updateData.sendSlackUpdates = sendSlackUpdates;
    if (shareWithOrganization !== undefined) updateData.shareWithOrganization = shareWithOrganization;

    const updatedBoard = await db.board.update({
      where: { id: boardId },
      data: updateData,
      include: {
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
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boardId = (await params).id;

    // Check if board exists and user has access
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { organization: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user is member of the organization and get admin status
    const currentUser = await db.user.findFirst({
      where: {
        id: session.user.id,
        organizationId: board.organizationId,
      },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user has board access (is member or org admin)
    const isBoardMember = await db.boardMember.findFirst({
      where: {
        boardId: boardId,
        userId: session.user.id,
      },
    });

    if (!isBoardMember && !currentUser.isAdmin) {
      return NextResponse.json({ error: "Only board members or org admins can delete this board" }, { status: 403 });
    }

    // Check if user can delete this board (board creator or admin)
    if (board.createdBy !== session.user.id && !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Only the board creator or admin can delete this board" },
        { status: 403 }
      );
    }

    // Delete the board
    await db.board.delete({
      where: { id: boardId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
