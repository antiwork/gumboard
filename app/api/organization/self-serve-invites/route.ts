import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

// Generate a cryptographically secure token using nanoid
function generateSecureToken(): string {
  return nanoid(32); // 32 characters, URL-safe
}

// Get all active self-serve invites for the organization
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

    // Get all active self-serve invites for this organization
    const selfServeInvites = await db.organizationSelfServeInvite.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ selfServeInvites });
  } catch (error) {
    console.error("Error fetching self-serve invites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create a new self-serve invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, expiresAt, usageLimit } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invite name is required" }, { status: 400 });
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        organizationId: true,
        organization: true,
      },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins can create self-serve invites
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create self-serve invites" },
        { status: 403 }
      );
    }

    // Parse expiration date if provided
    let expirationDate = null;
    if (expiresAt) {
      // Parse as date and set to end of day (23:59:59.999)
      expirationDate = new Date(expiresAt);
      expirationDate.setHours(23, 59, 59, 999);

      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return NextResponse.json(
          { error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
    }

    // Validate usage limit if provided
    let validUsageLimit = null;
    if (usageLimit !== undefined && usageLimit !== null) {
      const limit = parseInt(usageLimit);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: "Usage limit must be a positive number" },
          { status: 400 }
        );
      }
      validUsageLimit = limit;
    }

    // Create the self-serve invite
    const selfServeInvite = await db.organizationSelfServeInvite.create({
      data: {
        token: generateSecureToken(),
        name: name.trim(),
        organizationId: user.organizationId,
        createdBy: session.user.id,
        expiresAt: expirationDate,
        usageLimit: validUsageLimit,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ selfServeInvite }, { status: 201 });
  } catch (error) {
    console.error("Error creating self-serve invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
