import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Get pending invites for this organization
    const invites = await db.organizationInvite.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
