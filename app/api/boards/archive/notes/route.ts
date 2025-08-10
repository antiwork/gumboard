import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Get organization IDs the user has access to
    const organizationIds = user.organizations.map(org => org.organization.id)

    const notes = await db.note.findMany({
      where: {
        deletedAt: null,
        done: true, // Only archived notes
        board: {
          organizationId: { in: organizationIds }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        board: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc' // Most recently archived first
      }
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Error fetching archived notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
