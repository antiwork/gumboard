import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionToken = searchParams.get("token");
  const redirectTo = searchParams.get("redirectTo");

  if (!sessionToken || !redirectTo) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  try {
    // Verify the session token exists in the database
    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    // Set the NextAuth session cookie
    response.cookies.set("authjs.session-token", sessionToken, {
      expires: session.expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Set session error:", error);
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
}
