import { auth } from "@/auth"
import { db } from "@/lib/db"
import { processAndSaveImage, deleteUploadedImage } from "@/lib/upload"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the uploaded file
    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Get current user to check for existing uploaded image
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { image: true, profileImageId: true }
    })

    // Process and save the new image
    const imageUrl = await processAndSaveImage(file)
    const imageId = imageUrl.split('/').pop() // Extract ID from /api/images/{id}

    // Delete old uploaded image if it exists
    if (currentUser?.profileImageId) {
      await deleteUploadedImage(`/api/images/${currentUser.profileImageId}`)
    }

    // Update user's image and profileImageId in database
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { 
        image: null, // Clear external image URL
        profileImageId: imageId // Set reference to uploaded image
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
      image: imageUrl, // Return the new uploaded image URL
      isAdmin: updatedUser.isAdmin,
      organization: updatedUser.organization ? {
        id: updatedUser.organization.id,
        name: updatedUser.organization.name,
        members: updatedUser.organization.members
      } : null
    })

  } catch (error) {
    console.error("Error uploading avatar:", error)
    
    // Return appropriate error message
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle file size limit (Next.js config)
export const runtime = 'nodejs'
export const maxDuration = 30
