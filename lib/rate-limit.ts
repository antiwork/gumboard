import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, RateLimitEntry>()

// Configuration
const WINDOW_SIZE = 60 * 1000 // 1 minute window
const MAX_REQUESTS = 10 // Max 10 requests per minute
const CLEANUP_INTERVAL = 5 * 60 * 1000 // Clean up every 5 minutes

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }
}, CLEANUP_INTERVAL)

export function rateLimit(request: NextRequest): { allowed: boolean; retryAfter?: number } {
  // Get client identifier (IP address or fallback to a generic key)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const key = `rate-limit:${ip}`
  
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + WINDOW_SIZE
    })
    return { allowed: true }
  }
  
  if (entry.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }
  
  // Increment count
  entry.count++
  return { allowed: true }
}

// Export configuration for testing or adjustment
export const rateLimitConfig = {
  windowSize: WINDOW_SIZE,
  maxRequests: MAX_REQUESTS
}