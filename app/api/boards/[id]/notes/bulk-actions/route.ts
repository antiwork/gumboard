import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const bulkArchiveSchema = z.object({
  ids: z.array(z.string().min(1)),
  archivedAt: z.date().nullable(),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: boardId } = await params;
    const body = await request.json();

    const validated = bulkArchiveSchema.parse({
      ...body,
      archivedAt: body.archivedAt ? new Date(body.archivedAt) : null,
    });

    const { ids, archivedAt } = validated;

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const notes = await db.note.findMany({
      where: { id: { in: ids }, boardId, deletedAt: null },
      include: { board: true },
    });

    if (notes.length !== ids.length) {
      return NextResponse.json({ error: "Some notes not found" }, { status: 404 });
    }

    for (const note of notes) {
      if (note.board.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (note.createdBy !== session.user.id && !user.isAdmin) {
        return NextResponse.json(
          { error: "Only the note author or admin can update this note" },
          { status: 403 }
        );
      }
    }

    await db.$transaction(async (tx) => {
      await tx.note.updateMany({
        where: { id: { in: ids } },
        data: { archivedAt, updatedAt: new Date() },
      });

      // optional: update boards' updatedAt
      await tx.board.update({
        where: { id: boardId },
        data: { updatedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      action: archivedAt ? "archived" : "unarchived",
      count: ids.length,
    });
  } catch (err) {
    console.error("Error bulk archive/unarchive:", err);
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

    const { id: boardId } = await params;
    const body = await request.json();

    let validated;
    try {
      validated = bulkDeleteSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: err.errors },
          { status: 400 }
        );
      }
      throw err;
    }

    const { ids } = validated;

    // Check user org
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });
    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Check notes
    const notes = await db.note.findMany({
      where: { id: { in: ids }, boardId, deletedAt: null },
      include: { board: true },
    });

    if (notes.length !== ids.length) {
      return NextResponse.json({ error: "Some notes not found" }, { status: 404 });
    }

    for (const note of notes) {
      if (note.board.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (note.createdBy !== session.user.id && !user.isAdmin) {
        return NextResponse.json(
          { error: "Only the note author or admin can delete this note" },
          { status: 403 }
        );
      }
    }

    await db.note.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
      },
    });

    // Update the board's updatedAt field separately
    await db.board.update({
      where: { id: boardId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error("Error bulk delete:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
