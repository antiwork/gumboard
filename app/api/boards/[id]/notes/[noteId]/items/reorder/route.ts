import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession, getUserWithOrg, requireNoteAccess } from "@/lib/server/access";
import { ReorderItems } from "@/lib/server/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await requireSession();
    const user = await getUserWithOrg(session.user.id);
    const { noteId } = await params;
    await requireNoteAccess(noteId, user);

    const { items } = ReorderItems.parse(await request.json());

    const existingItems = await db.checklistItem.findMany({
      where: { noteId },
      select: { id: true },
    });

    if (items.length !== existingItems.length) {
      return NextResponse.json(
        { error: "Item count mismatch: expected " + existingItems.length + " items" },
        { status: 400 }
      );
    }

    await db.$transaction(
      items.map((item) =>
        db.checklistItem.updateMany({
          where: { id: item.id, noteId },
          data: { order: item.order },
        })
      )
    );

    const updatedItems = await db.checklistItem.findMany({
      where: { noteId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ items: updatedItems });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error("Error reordering checklist items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
