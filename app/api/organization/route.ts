import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let requestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { name, slackWebhookUrl } = requestBody || {}

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: "Organization name is required and must be a non-empty string" }, { status: 400 })
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Organization name must be 100 characters or less" }, { status: 400 })
    }

    if (slackWebhookUrl !== undefined && slackWebhookUrl !== null && typeof slackWebhookUrl !== 'string') {
      return NextResponse.json({ error: "Slack webhook URL must be a string" }, { status: 400 })
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
        organization: true
      }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Only admins can update organization name
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Only admins can update organization settings" }, { status: 403 })
    }

    // Update organization name and Slack webhook URL
    await db.organization.update({
      where: { id: user.organizationId },
      data: { 
        name: name.trim(),
        ...(slackWebhookUrl !== undefined && { slackWebhookUrl: slackWebhookUrl?.trim() || null })
      }
    })

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
                isAdmin: true
              }
            }
          }
        }
      }
    })

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to fetch updated user data" }, { status: 500 })
    }

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      organization: updatedUser.organization ? {
        id: updatedUser.organization.id,
        name: updatedUser.organization.name,
        slackWebhookUrl: updatedUser.organization.slackWebhookUrl,
        members: updatedUser.organization.members
      } : null
    })
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}  