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

    const organizationIds = user.organizations.map(org => org.organization.id)
    
    const whereClause = organizationId 
      ? { organizationId: organizationId }
      : { organizationId: { in: organizationIds } }
    
    const boards = await db.board.findMany({
      where: whereClause,
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

    const { name, description, isPublic, organizationId } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
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

    // Check if user is a member of the specified organization
    const userOrg = user.organizations.find(org => org.organization.id === organizationId)
    if (!userOrg) {
      return NextResponse.json({ error: "Access denied to this organization" }, { status: 403 })
    }

    if (userOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can create boards" }, { status: 403 })
    }
    
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