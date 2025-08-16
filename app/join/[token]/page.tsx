import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { OrganizationSelfServeInvite } from "@prisma/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Reusable type for validation result
interface ValidationResult {
  invite?: OrganizationSelfServeInvite & {
    organization: { name: string };
    user: { name?: string | null; email: string };
  };
  error?: { title: string; description: string };
}

// Server action for authenticated users to join
async function joinOrganization(token: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Not authenticated");
  }

  //validating the invitation here (validateInvite is a unified function that is used both frontend and server actions)
  const { invite, error } = await validateInvite(token);
  if (error || !invite) {
    throw new Error(error?.description || "Invalid invitation");
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  });
  if (!user) throw new Error("No user found");
  if (user.organizationId) throw new Error("User is already in an organization");

  await db.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      organizationId: invite.organizationId,
    },
  });

  await db.organizationSelfServeInvite.update({
    where: {
      token,
    },
    data: {
      usageCount: { increment: 1 },
    },
  });

  redirect("/dashboard");
}

// Server action for new users (auto-creation)
async function autoCreateAccountAndJoin(token: string, formData: FormData) {
  "use server";
  const email = formData.get("email")?.toString();
  if (!email) throw new Error("Email required");

  try {
    //validating the invitation here (validateInvite is a unified function that is used both frontend and server actions)
    const { invite, error } = await validateInvite(token);
    if (error || !invite) throw new Error("Invalid invitation");

    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          emailVerified: new Date(),
          organizationId: invite.organizationId,
        },
      });
    } else if (user.organizationId) {
      if (user.organizationId !== invite.organizationId) {
        throw new Error("Already in another organization");
      }
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: { organizationId: invite.organizationId },
      });
    }

    if (!user.emailVerified)
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });

    await db.organizationSelfServeInvite.update({
      where: { token },
      data: { usageCount: { increment: 1 } },
    });

    const sessionToken = crypto.randomUUID();
    await db.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    redirect(
      `/api/auth/set-session?token=${sessionToken}&redirectTo=${encodeURIComponent("/dashboard")}`
    );
  } catch {
    redirect(
      `/auth/signin?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(`/join/${token}`)}`
    );
  }
}

// Unified validation logic
async function validateInvite(token: string): Promise<ValidationResult> {
  const invite = await db.organizationSelfServeInvite.findUnique({
    where: { token },
    include: {
      organization: true,
      user: true,
    },
  });

  if (!invite) {
    return {
      error: {
        title: "Invalid Invitation",
        description: "This invitation link doesn't exist.",
      },
    };
  }

  if (!invite.isActive) {
    return {
      error: {
        title: "Invitation Deactivated",
        description: "This invitation has been deactivated by the organization.",
      },
    };
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return {
      error: {
        title: "Invitation Expired",
        description: `This invitation expired on ${invite.expiresAt.toLocaleDateString()}.`,
      },
    };
  }

  if (invite.usageLimit && invite.usageCount >= invite.usageLimit) {
    return {
      error: {
        title: "Invitation Limit Reached",
        description: `This invitation has reached its maximum usage limit of ${invite.usageLimit}.`,
      },
    };
  }

  return { invite };
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  const { token } = await params;

  if (!token) {
    return (
      <ErrorCard
        title="Invalid Link"
        description="This invitation link is invalid or missing required information."
      />
    );
  }
  const { invite, error } = await validateInvite(token);
  if (error) {
    return <ErrorCard title={error.title} description={error.description} />;
  }

  // Case 1: Unauthenticated user
  if (!session?.user) {
    return <JoinForm invite={invite!} />;
  }

  // Case 2: Authenticated user
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (user?.organizationId === invite!.organizationId) {
    redirect("/dashboard"); //should redirect to dashboard according to the tests
  }

  if (user?.organizationId) {
    return (
      <ErrorCard
        title="Already in Organization"
        description={`You are already a member of ${user.organization?.name}. You can only be a member of one organization at a time.`}
      />
    );
  }

  return <JoinConfirmationCard invite={invite!} token={token} />;
}

// Reusable components for different states
function JoinForm({ invite }: { invite: NonNullable<ValidationResult["invite"]> }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Join {invite.organization.name} on Gumboard!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            You&apos;ve been invited to join{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {invite.organization.name}
            </span>{" "}
            on Gumboard
          </p>
        </div>
        <Card className="border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto border border-slate-200 dark:border-zinc-800 mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {invite.organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100 -mt-5">
              {invite.organization.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(invite.usageLimit || invite.expiresAt) && (
              <div className="text-center space-y-2 rounded-lg">
                {invite.usageLimit && (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Usage: {invite.usageCount}/{invite.usageLimit}
                  </p>
                )}
                {invite.expiresAt && (
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Expires: {invite.expiresAt.toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            <form action={autoCreateAccountAndJoin.bind(null, invite.token!)} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  Email Address
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="px-4 py-5"
                  placeholder="Enter your email address"
                />
              </div>
              <Button type="submit" className="w-full px-4 py-5">
                Join {invite.organization.name}
              </Button>
            </form>
            <div className="text-center pt-4 border-t border-slate-200 dark:border-zinc-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{" "}
                <a
                  href={`/auth/signin?callbackUrl=${encodeURIComponent(`/join/${invite.token}`)}`}
                  className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Sign in instead
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function JoinConfirmationCard({
  invite,
  token,
}: {
  invite: NonNullable<ValidationResult["invite"]>;
  token: string;
}) {
  const usageInfo = invite.usageLimit
    ? `${invite.usageCount}/${invite.usageLimit} used`
    : `${invite.usageCount} members joined`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Join Organization</h1>
          <p className="text-muted-foreground">You&apos;ve been invited to join an organization</p>
        </div>
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600">
              <span className="text-2xl font-bold text-white">
                {invite.organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-xl">{invite.organization.name}</CardTitle>
            <CardDescription className="text-base">{invite.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Created by: {invite.user.name || invite.user.email}
              </p>
              <p className="text-sm text-muted-foreground">{usageInfo}</p>
              {invite.expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Expires: {invite.expiresAt.toLocaleDateString()}
                </p>
              )}
            </div>
            <form action={joinOrganization.bind(null, token)}>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Join {invite.organization.name}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Reusable Component to render an error card
function ErrorCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-semibold text-red-600">{title}</CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Button asChild className="w-full px-4 py-5">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
