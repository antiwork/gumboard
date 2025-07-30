import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, slackWebhookUrl } = await request.json();

    console.log("code is here 1");
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    console.log("code is here 2");
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

    console.log("code is here 3");
    if (!user?.organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    console.log("code is here 4");
    // Only admins can update organization name
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update organization settings" },
        { status: 403 }
      );
    }

    console.log("code is here 5");
    // Update organization name and Slack webhook
    await db.organization.update({
      where: { id: user.organizationId },
      data: {
        name: name.trim(),
        ...(slackWebhookUrl !== undefined && {
          slackWebhookUrl: slackWebhookUrl || null,
        }),
      },
    });

    console.log("code is here 6");
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

    console.log("code is here 7");
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
            members: updatedUser!.organization.members,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
