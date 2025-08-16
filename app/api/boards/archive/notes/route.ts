import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedSession } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const session = await getAuthenticatedSession();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const notes = await db.note.findMany({
      where: {
        deletedAt: null,
        archivedAt: { not: null },
        board: {
          organizationId: user.organizationId,
        },
      },
      select: {
        id: true,
        color: true,
        boardId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        checklistItems: true,
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
      },
      orderBy: {
        updatedAt: "desc", // Most recently archived first
      },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching archived notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
