import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Helper function to update organization-level sharing status when board sharing changes
async function updateOrganizationSharingStatus(organizationId: string) {
  try {
    // Get all boards in the organization
    const boards = await db.board.findMany({
      where: { organizationId },
      select: { id: true },
    });

    if (boards.length === 0) return;

    // Get all users in the organization
    const users = await db.user.findMany({
      where: { organizationId },
      select: { id: true },
    });

    // Get current board shares for all boards in the organization
    const allBoardShares = await db.boardShare.findMany({
      where: {
        boardId: { in: boards.map(b => b.id) },
      },
      select: {
        boardId: true,
        userId: true,
      },
    });

    // Group shares by user
    const sharesByUser = new Map<string, Set<string>>();
    allBoardShares.forEach(share => {
      if (!sharesByUser.has(share.userId)) {
        sharesByUser.set(share.userId, new Set());
      }
      sharesByUser.get(share.userId)!.add(share.boardId);
    });

    // For each user, check if they should have "share all boards" status
    for (const user of users) {
      const sharedBoardIds = sharesByUser.get(user.id) || new Set();
      const shouldShareAllBoards = boards.length > 0 && sharedBoardIds.size === boards.length;

      // If user should share all boards but doesn't have shares for all boards, add them
      if (shouldShareAllBoards) {
        const missingBoardIds = boards
          .map(b => b.id)
          .filter(id => !sharedBoardIds.has(id));

        if (missingBoardIds.length > 0) {
          await db.boardShare.createMany({
            data: missingBoardIds.map(boardId => ({
              boardId,
              userId: user.id,
            })),
          });
        }
      }
    }
  } catch (error) {
    console.error("Error updating organization sharing status:", error);
  }
}

// Get sharing status for a board
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

    // Get all organization members
    const organizationMembers = await db.user.findMany({
      where: { organizationId: board.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
      },
      orderBy: { name: "asc" },
    });

    // Get current board shares for this board
    const boardShares = await db.boardShare.findMany({
      where: { boardId },
      select: { userId: true },
    });

    const sharedUserIds = new Set(boardShares.map(share => share.userId));

    // Combine member data with sharing status
    const membersWithSharing = organizationMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      isAdmin: member.isAdmin,
      isShared: sharedUserIds.has(member.id),
    }));

    return NextResponse.json({
      members: membersWithSharing,
      boardCreator: board.createdBy
    });
  } catch (error) {
    console.error("Error fetching board sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update sharing for specific users on this board
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const boardId = (await params).id;
    const body = await request.json();

    const schema = z.object({
      userIds: z.array(z.string()),
    });

    const validatedBody = schema.parse(body);
    const { userIds } = validatedBody;

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

    // Only admins can update board sharing
    if (!currentUser.isAdmin) {
      return NextResponse.json({ error: "Only admins can update board sharing" }, { status: 403 });
    }

    // Validate that all userIds are in the same organization
    const validUsers = await db.user.findMany({
      where: {
        id: { in: userIds },
        organizationId: board.organizationId,
      },
      select: { id: true },
    });

    if (validUsers.length !== userIds.length) {
      return NextResponse.json({ error: "Some users are not in the organization" }, { status: 400 });
    }

    // Update board shares - delete existing and create new ones
    await db.$transaction([
      db.boardShare.deleteMany({ where: { boardId } }),
      ...userIds.map(userId =>
        db.boardShare.create({
          data: {
            boardId,
            userId,
          },
        })
      ),
    ]);

    // Check if this affects any user's "share all boards" status and update organization settings
    await updateOrganizationSharingStatus(board.organizationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating board sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
