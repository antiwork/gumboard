import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isPublic } = await request.json();
    const boardId = (await params).id;

    // Check if board exists and user has access
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: {
        organization: {
          include: {
            members: {
              select: {
                id: true,
                isAdmin: true,
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Check if user is member of the organization
    const currentUser = board.organization.members.find(
      (member) => member.id === session?.user?.id
    );

    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (board.createdBy !== session.user.id && !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Only the board creator or admin can modify board settings" },
        { status: 403 }
      );
    }

    const updatedBoard = await db.board.update({
      where: { id: boardId },
      data: { isPublic: Boolean(isPublic) },
    });

    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error("Error updating board public status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
