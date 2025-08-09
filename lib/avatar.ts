import crypto from 'crypto'

/**
 * Generate a Gravatar URL for a given email
 */
export function getGravatarUrl(email: string, size: number = 200): string {
  const hash = crypto
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex')
  
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`
}

/**
 * Generate a GitHub avatar URL for a username
 */
export function getGitHubAvatarUrl(username: string, size: number = 200): string {
  return `https://github.com/${username}.png?size=${size}`
}

/**
 * Get the best available avatar URL for a user
 * Priority: uploadedImage > user.image (OAuth) > Gravatar > fallback to null
 */
export async function getUserAvatarUrl(
  email: string, 
  existingImage?: string | null,
  profileImageId?: string | null,
  size: number = 200
): Promise<string | null> {
  // If user has an uploaded profile image, prioritize it
  if (profileImageId) {
    return `/api/images/${profileImageId}`
  }

  // If user already has an external image (from OAuth), use it
  if (existingImage) {
    return existingImage
  }

  // Try Gravatar
  const gravatarUrl = getGravatarUrl(email, size)
  
  try {
    const response = await fetch(gravatarUrl, { method: 'HEAD' })
    if (response.ok) {
      return gravatarUrl
    }
  } catch {
    // Gravatar not available, continue to fallback
  }

  return null
}

/**
 * Check if a URL is a valid image by making a HEAD request
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return response.ok && contentType?.startsWith('image/') === true
  } catch {
    return false
  }
}
