import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with organization and members
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organization: {
          include: {
            members: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                uploadedProfileImageId: true,
                isAdmin: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get the current avatar URL (prioritize uploaded images)
    const currentAvatarUrl = user.uploadedProfileImageId 
      ? `/api/images/${user.uploadedProfileImageId}` 
      : user.image

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      image: currentAvatarUrl,
      isAdmin: user.isAdmin,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slackWebhookUrl: user.organization.slackWebhookUrl,
        members: user.organization.members.map(member => ({
          ...member,
          image: member.uploadedProfileImageId ? `/api/images/${member.uploadedProfileImageId}` : member.image
        }))
      } : null
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 