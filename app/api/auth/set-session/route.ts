import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const { allowed, retryAfter } = rateLimit(request)
  
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'Retry-After': retryAfter?.toString() || '60',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + (retryAfter || 60) * 1000).toISOString()
        }
      }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const sessionToken = searchParams.get('token')
  const redirectTo = searchParams.get('redirectTo')

  if (!sessionToken || !redirectTo) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  try {
    // Verify the session token exists in the database
    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true }
    })

    if (!session || session.expires < new Date()) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url))

    // Set the NextAuth session cookie
    response.cookies.set("authjs.session-token", sessionToken, {
      expires: session.expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })

    return response

  } catch (error) {
    console.error("Set session error:", error)
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
} 