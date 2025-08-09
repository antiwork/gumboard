import sharp from 'sharp'
import { db } from '@/lib/db'

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AVATAR_SIZE = 200 // pixels

// Validate file
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size too large (max 5MB)' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed' }
  }

  return { valid: true }
}

// Process and save uploaded image to database
export async function processAndSaveImage(file: File): Promise<string> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Process image with Sharp
  try {
    const processedBuffer = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 }) // Convert to JPEG for consistency
      .toBuffer()

    // Get image metadata
    const metadata = await sharp(processedBuffer).metadata()
    
    // Save to database
    const profileImage = await db.profileImage.create({
      data: {
        data: processedBuffer,
        mimeType: 'image/jpeg',
        size: processedBuffer.length,
        width: metadata.width || AVATAR_SIZE,
        height: metadata.height || AVATAR_SIZE
      }
    })

    // Return the database image URL
    return `/api/images/${profileImage.id}`
  } catch (error) {
    throw new Error('Failed to process image: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

// Delete uploaded image from database
export async function deleteUploadedImage(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith('/api/images/')) {
    return // Not a database image, ignore
  }

  try {
    const imageId = imageUrl.split('/').pop()
    if (imageId) {
      await db.profileImage.delete({
        where: { id: imageId }
      })
    }
  } catch (error) {
    console.error('Failed to delete uploaded image:', error)
    // Don't throw error - image deletion is not critical
  }
}
