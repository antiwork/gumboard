import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Resend } from "resend";
import OrganizationSetupForm from "./form";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

async function createOrganization(orgName: string, teamEmails: string[]) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  if (!orgName?.trim()) {
    throw new Error("Organization name is required");
  }

  const organization = await db.organization.create({
    data: {
      name: orgName.trim(),
    },
  });

  await db.user.update({
    where: { id: session.user.id },
    data: {
      organizationId: organization.id,
      isAdmin: true,
    },
  });

  if (teamEmails.length > 0) {
    for (const email of teamEmails) {
      try {
        const invite = await db.organizationInvite.create({
          data: {
            email,
            organizationId: organization.id,
            invitedBy: session.user.id!,
          },
        });

        await resend.emails.send({
          from: process.env.EMAIL_FROM!,
          to: email,
          subject: `${session.user.name} invited you to join ${orgName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>You&apos;re invited to join ${orgName}!</h2>
              <p>${session.user.name} (${session.user.email}) has invited you to join their organization on Gumboard.</p>
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

  redirect("/dashboard");
}

export default async function OrganizationSetup() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (!session.user.name) {
    redirect("/setup/profile");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (user?.organization) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-sm sm:max-w-md mx-auto space-y-6 sm:space-y-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-blue-700 dark:text-blue-300">
              Setup Your Organization
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-zinc-400">
              Create your workspace and invite your team
            </p>
          </div>
          <Card className="border-2 bg-white dark:bg-zinc-900 dark:border-zinc-800">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 dark:from-zinc-800 dark:to-blue-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-lg sm:text-xl text-blue-700 dark:text-blue-300">
                Welcome, {session.user.name}!
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground dark:text-zinc-400">
                Let&apos;s set up your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationSetupForm onSubmit={createOrganization} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
