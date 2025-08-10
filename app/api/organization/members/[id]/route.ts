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

    const { isAdmin } = await request.json()
    const memberId = (await params).id

    // Get current user with organizations
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!currentUser?.organizations || currentUser.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const currentUserOrg = currentUser.organizations[0]

    // Only admins can change admin roles
    if (currentUserOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can change member roles" }, { status: 403 })
    }

    // Get the member to update
    const memberOrg = await db.userOrganization.findUnique({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: currentUserOrg.organization.id
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
          organizationId: currentUserOrg.organization.id
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

    // Get current user with organizations
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!currentUser?.organizations || currentUser.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const currentUserOrg = currentUser.organizations[0]

    // Only admins can remove members
    if (currentUserOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 })
    }

    // Get the member to remove
    const memberOrg = await db.userOrganization.findUnique({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: currentUserOrg.organization.id
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
    if (memberId === currentUser.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 })
    }

    // Remove member from organization
    await db.userOrganization.delete({
      where: { 
        userId_organizationId: {
          userId: memberId,
          organizationId: currentUserOrg.organization.id
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 