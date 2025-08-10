import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"


const resend = new Resend(process.env.AUTH_RESEND_KEY)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Get user with organizations
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organizations: {
          include: { organization: true }
        }
      }
    })

    if (!user?.organizations || user.organizations.length === 0) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // For now, use the first organization the user is a member of
    const userOrg = user.organizations[0]
    
    // Only admins can invite new members
    if (userOrg.role !== 'ADMIN') {
      return NextResponse.json({ error: "Only admins can invite new members" }, { status: 403 })
    }

    // Check if user is already in the organization
    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
      include: {
        organizations: {
          where: { organizationId: userOrg.organization.id }
        }
      }
    })

    if (existingUser && existingUser.organizations.length > 0) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 })
    }

    // Check if there's already a pending invite
    const existingInvite = await db.organizationInvite.findUnique({
      where: {
        email_organizationId: {
          email: cleanEmail,
          organizationId: userOrg.organization.id
        }
      }
    })

    if (existingInvite && existingInvite.status === 'PENDING') {
      return NextResponse.json({ error: "Invite already sent to this email" }, { status: 400 })
    }

    // Create or update the invite
    const invite = await db.organizationInvite.upsert({
      where: {
        email_organizationId: {
          email: cleanEmail,
          organizationId: userOrg.organization.id
        }
      },
      update: {
        status: 'PENDING',
        createdAt: new Date()
      },
      create: {
        email: cleanEmail,
        organizationId: userOrg.organization.id,
        invitedBy: session.user.id,
        status: 'PENDING'
      }
    })

    // Send invite email
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: cleanEmail,
        subject: `${session.user.name} invited you to join ${userOrg.organization.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're invited to join ${userOrg.organization.name}!</h2>
            <p>${session.user.name} (${session.user.email}) has invited you to join their organization on Gumboard.</p>
            <p>Click the link below to accept the invitation:</p>
            <a href="${process.env.AUTH_URL}/invite/accept?token=${invite.id}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
            <p style="margin-top: 20px; color: #666;">
              If you don't want to receive these emails, please ignore this message.
            </p>
          </div>
        `
      })
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError)
      // Don't fail the entire request if email sending fails
    }

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    console.error("Error creating invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 