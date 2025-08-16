import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const isCheckOnly = searchParams.get("check") === "true";

    if (isCheckOnly) {
      const [latestBoard, latestNote, latestChecklistItem] = await Promise.all([
        db.board.findFirst({
          where: { organizationId: user.organizationId },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        db.note.findFirst({
          where: { board: { organizationId: user.organizationId } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        db.checklistItem.findFirst({
          where: { note: { board: { organizationId: user.organizationId } } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
      ]);

      const timestamps = [
        latestBoard?.updatedAt,
        latestNote?.updatedAt,
        latestChecklistItem?.updatedAt,
      ].filter(Boolean) as Date[];

      const lastModified =
        timestamps.length > 0
          ? new Date(Math.max(...timestamps.map((t) => t.getTime()))).toISOString()
          : null;

      return NextResponse.json({ lastModified });
    }

    // Get all boards for the organization
    const boards = await db.board.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
                archivedAt: null,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ boards });
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, isPublic } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Create new board
    const board = await db.board.create({
      data: {
        name,
        description,
        isPublic: Boolean(isPublic || false),
        organizationId: user.organizationId,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
                archivedAt: null,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
