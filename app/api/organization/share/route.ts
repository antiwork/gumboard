import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Helper function to update board-level sharing status when organization sharing changes
async function updateBoardSharingStatus(orgId: string) {
  try {
    // Get all boards in the organization
    const boards = await db.board.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    if (boards.length === 0) return;

    // For each user that has "share all boards" enabled, ensure they have shares for all boards
    // This is handled by the existing logic in the main function, but we could add additional logic here if needed

    // If a user has specific board shares that don't match their "share all boards" status,
    // we might need to adjust, but this is complex and might be better handled in the UI layer
  } catch (error) {
    console.error("Error updating board sharing status:", error);
  }
}

// GET /api/organization/share - Get sharing status for all organization members across all boards
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
        isAdmin: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins can view organization sharing
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Only admins can view organization sharing" }, { status: 403 });
    }

    // Get all organization members
    const organizationMembers = await db.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
      },
      orderBy: { name: "asc" },
    });

    // Get all boards in the organization
    const boards = await db.board.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    // Get all board shares for this organization
    const boardShares = await db.boardShare.findMany({
      where: {
        board: {
          organizationId: user.organizationId,
        },
      },
      select: {
        boardId: true,
        userId: true,
      },
    });

    // Create a map of board shares by user
    const sharesByUser = new Map<string, Set<string>>();
    boardShares.forEach(share => {
      if (!sharesByUser.has(share.userId)) {
        sharesByUser.set(share.userId, new Set());
      }
      sharesByUser.get(share.userId)!.add(share.boardId);
    });

    // For each member, determine if they have all boards shared
    const membersWithSharingStatus = organizationMembers.map(member => {
      const sharedBoardIds = sharesByUser.get(member.id) || new Set();
      const allBoardsShared = boards.length > 0 && sharedBoardIds.size === boards.length;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        isAdmin: member.isAdmin,
        shareAllBoards: allBoardsShared,
        sharedBoardIds: Array.from(sharedBoardIds),
        totalBoards: boards.length,
      };
    });

    return NextResponse.json({
      members: membersWithSharingStatus,
      boards: boards.map(board => ({ id: board.id, name: board.name })),
    });
  } catch (error) {
    console.error("Error fetching organization sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/organization/share - Update sharing for specific users across all boards
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const schema = z.object({
      userSharing: z.array(z.object({
        userId: z.string(),
        shareAllBoards: z.boolean(),
        sharedBoardIds: z.array(z.string()).optional(),
      })),
    });

    const validatedBody = schema.parse(body);
    const { userSharing } = validatedBody;

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
        isAdmin: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const organizationId = user.organizationId;

    // Only admins can update organization sharing
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Only admins can update organization sharing" }, { status: 403 });
    }

    // Get all boards in the organization
    const boards = await db.board.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const boardIds = boards.map(board => board.id);

    // Validate that all userIds are in the same organization
    const validUsers = await db.user.findMany({
      where: {
        id: { in: userSharing.map(us => us.userId) },
        organizationId,
      },
      select: { id: true },
    });

    if (validUsers.length !== userSharing.length) {
      return NextResponse.json({ error: "Some users are not in the organization" }, { status: 400 });
    }

    // Update sharing for each user
    for (const userShare of userSharing) {
      if (userShare.shareAllBoards) {
        // Share all boards with this user
        await db.boardShare.deleteMany({
          where: {
            boardId: { in: boardIds },
            userId: userShare.userId,
          },
        });

        await db.boardShare.createMany({
          data: boardIds.map(boardId => ({
            boardId,
            userId: userShare.userId,
          })),
        });
      } else if (userShare.sharedBoardIds && userShare.sharedBoardIds.length > 0) {
        // Share specific boards with this user
        await db.boardShare.deleteMany({
          where: {
            boardId: { in: boardIds },
            userId: userShare.userId,
          },
        });

        await db.boardShare.createMany({
          data: userShare.sharedBoardIds.map(boardId => ({
            boardId,
            userId: userShare.userId,
          })),
        });
      } else {
        // Share no boards with this user
        await db.boardShare.deleteMany({
          where: {
            boardId: { in: boardIds },
            userId: userShare.userId,
          },
        });
      }
    }

    // Check if this affects any user's board-specific sharing and update accordingly
    await updateBoardSharingStatus(organizationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating organization sharing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
