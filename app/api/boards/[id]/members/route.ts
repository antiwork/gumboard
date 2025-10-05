import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const memberSchema = z.object({
  email: z.string().email().transform((email) => email.trim().toLowerCase()),
});

// Get all members of a board
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check if user has board access (is member or org admin)
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

    const isBoardMember = await db.boardMember.findFirst({
      where: {
        boardId: boardId,
        userId: session.user.id,
      },
    });

    if (!isBoardMember && !currentUser.isAdmin) {
      return NextResponse.json({ error: "Only board members or org admins can view members" }, { status: 403 });
    }

    // Get all board members with user details
    const members = await db.boardMember.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching board members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add a member to a board
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const boardId = (await params).id;

    let validatedBody;
    try {
      validatedBody = memberSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { email } = validatedBody;

    // Check if board exists
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
      return NextResponse.json({ error: "Only board members or org admins can add members" }, { status: 403 });
    }

    // Find user to add
    const userToAdd = await db.user.findUnique({
      where: { email },
    });

    if (!userToAdd) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is in the same organization
    if (userToAdd.organizationId !== board.organizationId) {
      return NextResponse.json({ error: "User must be in the same organization" }, { status: 403 });
    }

    // Check if user is already a member
    const existingMember = await db.boardMember.findFirst({
      where: {
        boardId,
        userId: userToAdd.id,
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this board" }, { status: 400 });
    }

    // Add user to board
    const newMember = await db.boardMember.create({
      data: {
        userId: userToAdd.id,
        boardId,
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
      },
    });

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error("Error adding board member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove a member from a board
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boardId = (await params).id;
    const url = new URL(request.url);
    const userIdToRemove = url.searchParams.get("userId");

    if (!userIdToRemove) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if board exists
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
      return NextResponse.json({ error: "Only board members or org admins can remove members" }, { status: 403 });
    }

    // Prevent removing the board creator
    if (board.createdBy === userIdToRemove) {
      return NextResponse.json({ error: "Cannot remove the board creator" }, { status: 403 });
    }

    // Remove member
    await db.boardMember.deleteMany({
      where: {
        boardId,
        userId: userIdToRemove,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing board member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
