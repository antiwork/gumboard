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
    const sort = searchParams.get("sort") || "updatedAt";
    const order = searchParams.get("order") || "desc";
    const whereClause = { organizationId: user.organizationId };

    type OrderByClause = {
      name?: "asc" | "desc";
      updatedAt?: "asc" | "desc";
      createdAt?: "asc" | "desc";
    };

    let orderBy: OrderByClause = { createdAt: "desc" };

    switch (sort) {
      case "title":
        orderBy = { name: order as "asc" | "desc" };
        break;
      case "notesCount":
        orderBy = { updatedAt: "desc" };
        break;
      case "updatedAt":
      default:
        orderBy = { updatedAt: order as "asc" | "desc" };
        break;
    }

    const boards = await db.board.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy,
    });

    if (sort === "notesCount") {
      boards.sort((a, b) => {
        const diff = b._count.notes - a._count.notes;
        return order === "asc" ? -diff : diff;
      });
    }

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

    const { name, description, isPublic, tags } = await request.json();

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
        tags: tags || [],
        isPublic: Boolean(isPublic || false),
        organizationId: user.organizationId,
        createdBy: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        tags: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        _count: {
          select: { notes: true },
        },
      },
    });

    return NextResponse.json({ board }, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
