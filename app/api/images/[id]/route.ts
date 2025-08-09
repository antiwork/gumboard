import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const imageId = (await params).id

    // Find the profile image in the database
    const profileImage = await db.profileImage.findUnique({
      where: { id: imageId },
      select: {
        data: true,
        mimeType: true,
        size: true
      }
    })

    if (!profileImage) {
      return new NextResponse("Profile image not found", { status: 404 })
    }

    // Return the image with appropriate headers
    return new NextResponse(profileImage.data, {
      status: 200,
      headers: {
        'Content-Type': profileImage.mimeType,
        'Content-Length': profileImage.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'ETag': `"${imageId}"`, // Use image ID as ETag for caching
      }
    })

  } catch (error) {
    console.error("Error serving image:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}
