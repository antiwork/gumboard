import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, slackWebhookUrl } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    // Get user with organizations
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: { organization: true }
        }
      }
    })

    if (!user?.organizations || user.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const userOrg = user.organizations[0]
    
    // Only admins can update organization name
    if (userOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can update organization settings" }, { status: 403 })
    }

    // Update organization name and Slack webhook URL
    await db.organization.update({
      where: { id: userOrg.organization.id },
      data: { 
        name: name.trim(),
        ...(slackWebhookUrl !== undefined && { slackWebhookUrl: slackWebhookUrl?.trim() || null })
      }
    })

    // Return updated user data
    const updatedUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
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
        }
      }
    })

    const updatedUserOrg = updatedUser!.organizations[0]
    
    return NextResponse.json({
      id: updatedUser!.id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      organization: updatedUserOrg ? {
        id: updatedUserOrg.organization.id,
        name: updatedUserOrg.organization.name,
        slackWebhookUrl: updatedUserOrg.organization.slackWebhookUrl,
        members: updatedUserOrg.organization.members.map(member => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          isAdmin: member.role === 'ADMIN'
        }))
      } : null
    })
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}  