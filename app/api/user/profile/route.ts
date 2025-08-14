import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcrypt-ts";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, newPassword } = await request.json();

    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters long" },
          { status: 400 }
        );
      }

      const hashedNewPassword = await hash(newPassword, 12);

      const updatedUser = await db.user.update({
        where: { id: session.user.id },
        data: {
          ...(name && { name: name.trim() }),
          passwordHash: hashedNewPassword,
        },
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
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
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
