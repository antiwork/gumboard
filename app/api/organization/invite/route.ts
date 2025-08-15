import { auth } from "@/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getBaseUrl } from "@/lib/utils";

const resend = new Resend(env.AUTH_RESEND_KEY);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        organizationId: true,
        organization: true,
      },
    });

    if (!user?.organizationId || !user.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Only admins can invite new members
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Only admins can invite new members" }, { status: 403 });
    }

    // Check if user is already in the organization
    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.organizationId === user.organizationId) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invite
    const existingInvite = await db.organizationInvite.findUnique({
      where: {
        email_organizationId: {
          email: cleanEmail,
          organizationId: user.organizationId,
        },
      },
    });

    if (existingInvite && existingInvite.status === "PENDING") {
      return NextResponse.json({ error: "Invite already sent to this email" }, { status: 400 });
    }

    // Create or update the invite
    const invite = await db.organizationInvite.upsert({
      where: {
        email_organizationId: {
          email: cleanEmail,
          organizationId: user.organizationId,
        },
      },
      update: {
        status: "PENDING",
        createdAt: new Date(),
      },
      create: {
        email: cleanEmail,
        organizationId: user.organizationId,
        invitedBy: session.user.id,
        status: "PENDING",
      },
    });

    // Send invite email
    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: cleanEmail,
        subject: `${session.user.name} invited you to join ${user.organization.name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f9f9f9; color: #333;">
              <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                <h2 style="margin-top: 0; font-size: 22px; color: #222;">You’re Invited to Join <span style="color: #007bff;">${user.organization.name}</span> 🎉</h2>
                
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                  <strong>${session.user.name}</strong> (<a href="mailto:${session.user.email}" style="color: #007bff; text-decoration: none;">${session.user.email}</a>) 
                  has invited you to join their organization on <strong>Gumboard</strong>.
                </p>
                
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                  Click the button below to accept the invitation and get started:
                </p>

                <p style="text-align: center; margin: 24px 0;">
                  <a href="${getBaseUrl(request)}/invite/accept?token=${invite.id}"
                    style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Accept Invitation
                  </a>
                </p>

                <p style="font-size: 14px; line-height: 1.5; color: #666; margin-top: 20px;">
                  If you didn’t expect this invitation, you can safely ignore this email.
                </p>
              </div>

              <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
                © ${new Date().getFullYear()} Gumboard. All rights reserved.
              </p>
            </div>
          `});
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
    }

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
