import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

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
      }
    })

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 })
    }

    // Get pending invites for this organization
    const invites = await db.organizationInvite.findMany({
      where: { 
        organizationId: organizationId,
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