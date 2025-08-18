import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return { user: { id: session.user.id } };
}

export async function getUserWithOrg(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isAdmin: true,
      organizationId: true,
      name: true,
      email: true,
      organization: {
        select: {
          id: true,
          name: true,
          slackWebhookUrl: true,
        },
      },
    },
  });
  
  if (!user?.organizationId) {
    throw new NextResponse(JSON.stringify({ error: "No organization found" }), { status: 403 });
  }
  
  return {
    ...user,
    organizationId: user.organizationId,
  };
}

export async function requireNoteAccess(noteId: string, user: { id: string; isAdmin: boolean; organizationId: string }) {
  const note = await db.note.findUnique({
    where: { id: noteId },
    include: {
      board: {
        select: {
          organizationId: true,
          name: true,
          sendSlackUpdates: true,
        },
      },
      checklistItems: {
        select: { order: true },
      },
    },
  });

  if (!note || note.deletedAt) {
    throw new NextResponse(JSON.stringify({ error: "Note not found" }), { status: 404 });
  }

  if (note.board.organizationId !== user.organizationId) {
    throw new NextResponse(JSON.stringify({ error: "Access denied" }), { status: 403 });
  }

  if (note.createdBy !== user.id && !user.isAdmin) {
    throw new NextResponse(JSON.stringify({ error: "Only the note author or admin can edit this note" }), { status: 403 });
  }

  return note;
}
