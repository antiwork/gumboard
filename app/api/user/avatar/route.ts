import { auth } from "@/auth"
import { db } from "@/lib/db"
import { getUserAvatarUrl, getGravatarUrl, isValidImageUrl } from "@/lib/avatar"
import { deleteUploadedProfileImage } from "@/lib/upload"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageUrl, source } = await request.json()

    if (!imageUrl && !source) {
      return NextResponse.json({ error: "Image URL or source is required" }, { status: 400 })
    }

    let finalImageUrl: string | null = null

    if (source === 'gravatar') {
      // Generate Gravatar URL
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true }
      })
      
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      finalImageUrl = getGravatarUrl(user.email)
      
      // Verify Gravatar exists
      if (!(await isValidImageUrl(finalImageUrl))) {
        return NextResponse.json({ error: "No Gravatar found for this email" }, { status: 404 })
      }
    } else if (source === 'github') {
      // For GitHub, we need to get the username from their accounts
      const account = await db.account.findFirst({
        where: {
          userId: session.user.id,
          provider: 'github'
        },
        select: { providerAccountId: true }
      })

      if (!account) {
        return NextResponse.json({ error: "No GitHub account connected" }, { status: 404 })
      }

      finalImageUrl = `https://github.com/${account.providerAccountId}.png?size=200`
    } else if (source === 'remove') {
      // Remove current image and uploaded image
      const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        select: { uploadedProfileImageId: true }
      })
      
      if (currentUser?.uploadedProfileImageId) {
        await deleteUploadedProfileImage(`/api/images/${currentUser.uploadedProfileImageId}`)
      }
      
      finalImageUrl = null
    } else {
      // Custom URL provided
      if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
        return NextResponse.json({ error: "Valid image URL is required" }, { status: 400 })
      }

      // Validate the provided URL
      if (!(await isValidImageUrl(imageUrl))) {
        return NextResponse.json({ error: "Invalid or inaccessible image URL" }, { status: 400 })
      }

      finalImageUrl = imageUrl
    }

    // Update user's image (clear uploaded image when setting external image)
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { 
        image: finalImageUrl,
        uploadedProfileImageId: source === 'remove' ? null : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isAdmin: true,
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

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      image: updatedUser.image,
      isAdmin: updatedUser.isAdmin,
      organization: updatedUser.organization ? {
        id: updatedUser.organization.id,
        name: updatedUser.organization.name,
        members: updatedUser.organization.members
      } : null
    })
  } catch (error) {
    console.error("Error updating avatar:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, image: true, uploadedProfileImageId: true }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get available avatar options
    const currentAvatarUrl = user.uploadedProfileImageId 
      ? `/api/images/${user.uploadedProfileImageId}` 
      : user.image
    const avatarUrl = await getUserAvatarUrl(user.email, user.image, user.uploadedProfileImageId)
    const gravatarUrl = getGravatarUrl(user.email)
    
    // Check if user has GitHub account
    const githubAccount = await db.account.findFirst({
      where: {
        userId: session.user.id,
        provider: 'github'
      },
      select: { providerAccountId: true }
    })

    const githubUrl = githubAccount 
      ? `https://github.com/${githubAccount.providerAccountId}.png?size=200`
      : null

    return NextResponse.json({
      current: currentAvatarUrl,
      suggested: avatarUrl,
      gravatar: gravatarUrl,
      github: githubUrl,
      hasGithub: !!githubAccount
    })
  } catch (error) {
    console.error("Error fetching avatar options:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
