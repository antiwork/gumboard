import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boardSchema } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    let validatedBody;
    try {
      validatedBody = boardSchema
        .extend({
          name: z.string().min(1, "Board name is required and cannot be empty or only whitespace"),
        })
        .parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { name, description, isPublic } = validatedBody;
    const trimmedName = name.trim();

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const existingBoard = await db.board.findFirst({
      where: {
        name: trimmedName,
        organizationId: user.organizationId,
      },
    });

    console.log("Existing board check:", { existingBoard });

    if (existingBoard) {
      return NextResponse.json({ error: "Board already exists" }, { status: 200 });
    }
    // Create new board
    const board = await db.board.create({
      data: {
        name: trimmedName,
        description,
        isPublic: Boolean(isPublic),
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
