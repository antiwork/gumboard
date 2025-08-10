import { db } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

export async function createOrganizationWithInvites(
  userId: string,
  userName: string,
  userEmail: string,
  orgName: string,
  teamEmails: string[]
) {
  if (!orgName?.trim()) {
    throw new Error("Organization name is required");
  }

  const organization = await db.organization.create({
    data: {
      name: orgName.trim(),
      members: {
        create: {
          userId: userId,
          role: "ADMIN",
        },
      },
    },
  });

  // Send invitations to team members
  if (teamEmails && teamEmails.length > 0) {
    for (const email of teamEmails) {
      try {
        const invite = await db.organizationInvite.create({
          data: {
            email,
            organizationId: organization.id,
            invitedBy: userId,
          },
        });

        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: `${userName} invited you to join ${orgName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You&apos;re invited to join ${orgName}!</h2>
              <p>${userName} (${userEmail}) has invited you to join their organization on Gumboard.</p>
              <p>Click the link below to accept the invitation:</p>
              <a href="${process.env.AUTH_URL}/invite/accept?token=${invite.id}"
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
              <p style="margin-top: 20px; color: #666;">
                If you don&apos;t want to receive these emails, please ignore this message.
              </p>
            </div>
          `,
        });
      } catch (error) {
        console.error(`Failed to send invite to ${email}:`, error);
      }
    }
  }

  return organization;
}
