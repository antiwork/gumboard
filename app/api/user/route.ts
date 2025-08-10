import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with organizations
    const user = await db.user.findUnique({
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const userOrg = user.organizations[0]
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      organization: userOrg ? {
        id: userOrg.organization.id,
        name: userOrg.organization.name,
        slackWebhookUrl: userOrg.organization.slackWebhookUrl,
        members: userOrg.organization.members.map(member => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          isAdmin: member.role === 'ADMIN'
        }))
      } : null
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 