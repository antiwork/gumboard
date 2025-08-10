import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

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
          include: { organization: true }
        }
      }
    })

    if (!user?.organizations || user.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const userOrg = user.organizations[0]
    
    // Get all boards for the organization
    const boards = await db.board.findMany({
      where: { organizationId: userOrg.organization.id },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ boards })
  } catch (error) {
    console.error("Error fetching boards:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, isPublic } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 })
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
    
    // Create new board
    const board = await db.board.create({
      data: {
        name,
        description,
        isPublic: Boolean(isPublic || false),
        organizationId: userOrg.organization.id,
        createdBy: session.user.id
      },
      include: {
        _count: {
          select: { notes: true },
        },
      },
    })

    return NextResponse.json({ board }, { status: 201 })
  } catch (error) {
    console.error("Error creating board:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}    