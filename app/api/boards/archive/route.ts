import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const boards = await db.board.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: { not: null },
      },
      include: {
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
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
      orderBy: {
        archivedAt: "desc",
      },
    });

    const boardsWithLastActivity = boards.map((board) => ({
      ...board,
      lastActivityAt: board.updatedAt.toISOString(),
    }));

    return NextResponse.json({ boards: boardsWithLastActivity });
  } catch (error) {
    console.error("Error fetching archived boards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
