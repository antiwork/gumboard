import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Update member (toggle admin role)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isAdmin } = await request.json();
    const memberId = (await params).id;

    // Get current user with organization
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!currentUser?.organizationId || !currentUser.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins or the first user (organization creator) can change admin roles
    if (!currentUser.isAdmin) {
      return NextResponse.json({ error: "Only admins can change member roles" }, { status: 403 });
    }

    // Get the member to update
    const member = await db.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if member belongs to the same organization
    if (member.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ error: "Member not in your organization" }, { status: 403 });
    }

    // Update the member's admin status
    const updatedMember = await db.user.update({
      where: { id: memberId },
      data: { isAdmin: typeof isAdmin === "boolean" ? isAdmin : false },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error("Error updating member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Remove member from organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberId = (await params).id;

    // Get current user with organization
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        isAdmin: true,
        organizationId: true,
        organization: true,
      },
    });

    if (!currentUser?.organizationId || !currentUser.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins can remove members
    if (!currentUser.isAdmin) {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 });
    }

    // Get the member to remove
    const member = await db.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Check if member belongs to the same organization
    if (member.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ error: "Member not in your organization" }, { status: 403 });
    }

    // Can't remove yourself
    if (member.id === currentUser.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Remove member from organization
    await db.user.update({
      where: { id: memberId },
      data: {
        organizationId: null,
        isAdmin: false, // Reset admin status when leaving organization
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
