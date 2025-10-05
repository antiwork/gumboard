import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { organizationSchema } from "@/lib/types";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
              },
            },
          },
        },
      },
    });

    if (!user?.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        slackWebhookUrl: user.organization.slackWebhookUrl,
        shareAllBoardsByDefault: user.organization.shareAllBoardsByDefault,
        members: user.organization.members,
      },
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    let validatedBody;
    try {
      validatedBody = organizationSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { name, slackWebhookUrl, shareAllBoardsByDefault } = validatedBody;

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

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins can update organization name
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update organization settings" },
        { status: 403 }
      );
    }

    // Update organization name, Slack webhook URL, and sharing settings
    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        name: name.trim(),
        ...(slackWebhookUrl !== undefined && { slackWebhookUrl: slackWebhookUrl?.trim() || null }),
        ...(shareAllBoardsByDefault !== undefined && { shareAllBoardsByDefault }),
      },
    });

    // Return updated user data
    const updatedUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        organization: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedUser!.id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      isAdmin: updatedUser!.isAdmin,
      organization: updatedUser!.organization
        ? {
            id: updatedUser!.organization.id,
            name: updatedUser!.organization.name,
            slackWebhookUrl: updatedUser!.organization.slackWebhookUrl,
            shareAllBoardsByDefault: updatedUser!.organization.shareAllBoardsByDefault,
            members: updatedUser!.organization.members,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
