import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with all organizations
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Map the organizations to the expected format
    const organizations = user.organizations.map(userOrg => ({
      id: userOrg.organization.id,
      name: userOrg.organization.name,
      role: userOrg.role
    }))

    return NextResponse.json({ organizations })
  } catch (error) {
    console.error("Error fetching user organizations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
