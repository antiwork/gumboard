import { auth } from "@/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import OrganizationSetupForm from "./form";
import { createOrganizationWithInvites } from "@/lib/organization";

async function createOrganization(orgName: string, teamEmails: string[]) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  await createOrganizationWithInvites(
    session.user.id,
    session.user.name!,
    session.user.email!,
    orgName,
    teamEmails
  );

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
    include: { 
      organizations: {
        include: { organization: true }
      }
    },
  });

  if (user?.organizations && user.organizations.length > 0) {
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
