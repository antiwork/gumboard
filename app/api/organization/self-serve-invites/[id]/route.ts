import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inviteId = (await params).id;

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins can delete self-serve invites
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can delete self-serve invites" },
        { status: 403 }
      );
    }

    // Verify the invite belongs to this organization
    const invite = await db.organizationSelfServeInvite.findUnique({
      where: { token: inviteId },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete the invite
    await db.organizationSelfServeInvite.delete({
      where: { token: inviteId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting self-serve invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
