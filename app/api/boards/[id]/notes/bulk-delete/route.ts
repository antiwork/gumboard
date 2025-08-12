import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const noteIds: string[] = body.noteIds;

    if (noteIds.length === 0) {
      return NextResponse.json({ error: "No noteIds provided" }, { status: 400 });
    }

    const sessionUserId: string = session.user.id;
    const user = await db.user.findUnique({
      where: { id: sessionUserId },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const notes = await db.note.findMany({
      where: { id: { in: noteIds } },
      include: { board: true },
    });

    if (notes.length === 0) {
      return NextResponse.json({ error: "Notes not found" }, { status: 404 });
    }

    const deletableNoteIds = notes
      .filter((note) => {
        if (note.createdBy !== sessionUserId) return false;
        return true;
      })
      .map((n) => n.id);

    if (deletableNoteIds.length === 0) {
      return NextResponse.json({ deleted: 0, deletedIds: [] });
    }

    await db.note.updateMany({
      where: { id: { in: deletableNoteIds } },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ deleted: deletableNoteIds.length, deletedIds: deletableNoteIds });
  } catch (error) {
    console.error("Error bulk deleting notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
