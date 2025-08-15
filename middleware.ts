import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    // NOTE: We can't call prisma client here so calling this endpoint
    // is a workaround.
    const authCheckUrl = new URL("/api/auth/check", request.url);
    const authResponse = await fetch(authCheckUrl.toString(), {
      headers: {
        // Forward cookies to maintain session
        cookie: request.headers.get("cookie") || "",
      },
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // User is authenticated, continue with the request
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth check failed:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

export const config = {
  matcher: ["/api/boards/:path*", "/api/organization/:path*", "/api/user/:path*"],
};
