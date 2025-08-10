import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user?.organizations || user.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const userOrg = user.organizations[0]

    // Get pending invites for this organization
    const invites = await db.organizationInvite.findMany({
      where: { 
        organizationId: userOrg.organization.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error("Error fetching invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 