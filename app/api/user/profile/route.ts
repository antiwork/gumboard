import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    let validatedBody;
    try {
      validatedBody = profileSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const { name } = validatedBody;
    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name },
      include: {
        organization: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      organization: updatedUser.organization
        ? {
            id: updatedUser.organization.id,
            name: updatedUser.organization.name,
            members: updatedUser.organization.members,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
