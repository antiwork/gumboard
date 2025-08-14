import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { Resend } from "resend";
import { hash } from "bcrypt-ts";
import { getBaseUrl } from "@/lib/utils";

const resend = new Resend(env.AUTH_RESEND_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    await db.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: name || null,
        emailVerified: null,
      },
    });

    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const verificationUrl = `${getBaseUrl(request)}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Verify your email address",
        html: `
          <h2>Welcome to Gumboard!</h2>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);

      if (process.env.NODE_ENV === "development") {
        return NextResponse.json(
          {
            error:
              "Email service not configured. Please set AUTH_RESEND_KEY and EMAIL_FROM environment variables.",
            details: "For local development, contact your administrator for Resend credentials.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to send verification email. Please try again later.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Account created successfully. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "An error occurred during signup" }, { status: 500 });
  }
}
