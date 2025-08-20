// app/api/reactions/[noteId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db as prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;

    const reactions = await prisma.reaction.findMany({
      where: { noteId: noteId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { noteId } = await params;
    const { emoji } = await request.json();

    if (!emoji || typeof emoji !== "string") {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const existing = await prisma.reaction.findUnique({
      where: {
        noteId_userId_emoji: {
          noteId: noteId,
          userId: session.user.id,
          emoji: emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed" });
    } else {
      await prisma.reaction.create({
        data: { noteId, userId: session.user.id, emoji },
      });
      return NextResponse.json({ action: "added" });
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { noteId } = await params;

    await prisma.reaction.deleteMany({
      where: { noteId: noteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reactions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
