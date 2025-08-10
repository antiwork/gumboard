import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { createOrganizationWithInvites } from "@/lib/organization"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 })
    }

    return NextResponse.json({
      id: userOrg.organization.id,
      name: userOrg.organization.name,
      slackWebhookUrl: userOrg.organization.slackWebhookUrl,
      members: userOrg.organization.members.map(member => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        isAdmin: member.role === 'ADMIN'
      }))
    })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, teamEmails } = await request.json()

    const organization = await createOrganizationWithInvites(
      session.user.id,
      session.user.name!,
      session.user.email!,
      name,
      teamEmails || []
    )

    return NextResponse.json({ organization })
  } catch (error) {
    console.error("Error creating organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, slackWebhookUrl, organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Verify user has admin access to this organization
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

    // Only admins can update organization settings
    if (userOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can update organization settings" }, { status: 403 })
    }

    // Update the organization
    const updatedOrganization = await db.organization.update({
      where: { id: organizationId },
      data: {
        name: name,
        slackWebhookUrl: slackWebhookUrl
      }
    })

    return NextResponse.json(updatedOrganization)
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}  