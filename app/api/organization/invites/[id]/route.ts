import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inviteId = (await params).id
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Verify user has access to this organization
    const userOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organizationId
        }
      }
    })

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 })
    }

    // Verify the invite belongs to this organization
    const invite = await db.organizationInvite.findUnique({
      where: { id: inviteId }
    })

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })
    }

    if (invite.organizationId !== organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Delete the invite
    await db.organizationInvite.delete({
      where: { id: inviteId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 