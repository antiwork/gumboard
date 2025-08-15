import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items } = await request.json();
    const { noteId } = await params;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Items must be an array" }, { status: 400 });
    }

    for (const item of items) {
      if (typeof item.id !== "string" || typeof item.order !== "number") {
        return NextResponse.json(
          { error: "Each item must have id (string) and order (number)" },
          { status: 400 }
        );
      }
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: { select: { id: true } },
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      include: {
        board: { select: { organizationId: true } },
      },
    });

    if (!note || note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (note.board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "Only the note author or admin can reorder items" },
        { status: 403 }
      );
    }

    await db.$transaction(async (tx) => {
      for (const item of items) {
        await tx.checklistItem.update({
          where: {
            id: item.id,
            noteId: noteId,
          },
          data: { order: item.order },
        });
      }
    });

    const updatedItems = await db.checklistItem.findMany({
      where: { noteId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ items: updatedItems });
  } catch (error) {
    console.error("Error reordering checklist items:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
