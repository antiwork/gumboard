import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// Update member (toggle admin role)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { isAdmin, organizationId } = await request.json()
    const memberId = (await params).id

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Verify current user has admin access to this organization
    const currentUserOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organizationId
        }
      }
    })

    if (!currentUserOrg) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 })
    }

    // Only admins can change admin roles
    if (currentUserOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can change member roles" }, { status: 403 })
    }

    // Get the member to update
    const memberOrg = await db.userOrganization.findUnique({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: organizationId
        }
      },
      include: {
        user: true
      }
    })

    if (!memberOrg) {
      return NextResponse.json({ error: "Member not found in your organization" }, { status: 404 })
    }

    // Update the member's role
    const updatedMemberOrg = await db.userOrganization.update({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: organizationId
        }
      },
      data: { role: isAdmin ? 'ADMIN' : 'MEMBER' },
      include: {
        user: true
      }
    })

    return NextResponse.json({ member: updatedMemberOrg.user })
  } catch (error) {
    console.error("Error updating member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Remove member from organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberId = (await params).id
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Verify current user has admin access to this organization
    const currentUserOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: organizationId
        }
      }
    })

    if (!currentUserOrg) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 })
    }

    // Only admins can remove members
    if (currentUserOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 })
    }

    // Get the member to remove
    const memberOrg = await db.userOrganization.findUnique({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: organizationId
        }
      },
      include: {
        user: true
      }
    })

    if (!memberOrg) {
      return NextResponse.json({ error: "Member not found in your organization" }, { status: 404 })
    }

    // Can't remove yourself
    if (memberId === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 })
    }

    // Remove member from organization
    await db.userOrganization.delete({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: organizationId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 