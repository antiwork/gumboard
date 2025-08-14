import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(new URL("/auth/error?error=Verification", request.url));
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/auth/error?error=Verification", request.url));
    }

    if (verificationToken.expires < new Date()) {
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token,
          },
        },
      });
      return NextResponse.redirect(new URL("/auth/error?error=Verification", request.url));
    }

    await db.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token,
        },
      },
    });

    return NextResponse.redirect(new URL("/auth/signin?verified=true", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/auth/error?error=Verification", request.url));
  }
}
