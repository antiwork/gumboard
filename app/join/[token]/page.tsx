import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";

async function joinOrganization(token: string) {
  "use server";

  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Not authenticated");
  }

  // Find the self-serve invite by token
  const invite = await db.organizationSelfServeInvite.findUnique({
    where: { token: token },
    include: { organization: true },
  });

  if (!invite) {
    throw new Error("Invalid or expired invitation link");
  }

  if (!invite.isActive) {
    throw new Error("This invitation link has been deactivated");
  }

  // Check if invite has expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error("This invitation link has expired");
  }

  // Check if usage limit has been reached
  if (invite.usageLimit && invite.usageCount >= invite.usageLimit) {
    throw new Error("This invitation link has reached its usage limit");
  }

  // Check if user is already in an organization
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (user?.organizationId === invite.organizationId) {
    throw new Error("You are already a member of this organization");
  }

  if (user?.organizationId) {
    throw new Error(
      "You are already a member of another organization. Please leave your current organization first."
    );
  }

  // Join the organization
  await db.user.update({
    where: { id: session.user.id },
    data: { organizationId: invite.organizationId },
  });

  // Increment usage count
  await db.organizationSelfServeInvite.update({
    where: { token: token },
    data: { usageCount: { increment: 1 } },
  });

  redirect("/dashboard");
}

async function autoCreateAccountAndJoin(token: string, formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString();
  if (!email) {
    throw new Error("Email is required");
  }

  try {
    // Find the self-serve invite by token
    const invite = await db.organizationSelfServeInvite.findUnique({
      where: { token: token },
      include: { organization: true },
    });

    if (!invite || !invite.isActive) {
      throw new Error("Invalid or inactive invitation link");
    }

    // Check if invite has expired
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new Error("This invitation link has expired");
    }

    // Check if usage limit has been reached
    if (invite.usageLimit && invite.usageCount >= invite.usageLimit) {
      throw new Error("This invitation link has reached its usage limit");
    }

    // Check if user already exists
    let user = await db.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create one with verified email and auto-join organization
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          emailVerified: new Date(), // Auto-verify since they clicked the invite link
          organizationId: invite.organizationId, // Auto-join the organization
        },
      });
    } else if (!user.organizationId) {
      // If user exists but isn't in an organization, add them to this one
      user = await db.user.update({
        where: { id: user.id },
        data: { organizationId: invite.organizationId },
      });
    } else if (user.organizationId === invite.organizationId) {
      // User is already in this organization, just continue
    } else {
      throw new Error("You are already a member of another organization");
    }

    // Verify email if not already verified
    if (!user.emailVerified) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    // Increment usage count only if this is a new join
    if (user.organizationId === invite.organizationId) {
      await db.organizationSelfServeInvite.update({
        where: { token: token },
        data: { usageCount: { increment: 1 } },
      });
    }

    // Create a session for the user
    const sessionToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    // Redirect to a special endpoint that will set the session cookie and redirect to dashboard
    redirect(
      `/api/auth/set-session?token=${sessionToken}&redirectTo=${encodeURIComponent("/dashboard")}`
    );
  } catch (error) {
    console.error("Auto-join error:", error);
    // Fallback to regular auth flow
    redirect(
      `/auth/signin?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(`/join/${token}`)}`
    );
  }
}

interface JoinPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
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

  // Find the self-serve invite by token
  const invite = await db.organizationSelfServeInvite.findUnique({
    where: { token: token },
    include: {
      organization: true,
      user: true, // The user who created the invite
    },
  });

  if (!invite) {
    return (
      <ErrorCard
        title="Invalid Invitation"
        description="This invitation link is invalid or has expired."
      />
    );
  }

  // Check if invite is active
  if (!invite.isActive) {
    return (
      <ErrorCard
        title="Invitation Deactivated"
        description="This invitation link has been deactivated by the organization."
      />
    );
  }

  // Check if invite has expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return (
      <ErrorCard
        title="Invitation Expired"
        description={`This invitation expired on ${invite.expiresAt.toLocaleDateString()}.`}
      />
    );
  }

  // Check if usage limit has been reached
  if (invite.usageLimit && invite.usageCount >= invite.usageLimit) {
    return (
      <ErrorCard
        title="Invitation Limit Reached"
        description={`This invitation has reached its maximum usage limit of ${invite.usageLimit} uses.`}
      />
    );
  }

  // If user is not authenticated, show join form
  if (!session?.user) {
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
              <form
                action={autoCreateAccountAndJoin.bind(null, invite.token!)}
                className="space-y-5"
              >
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

  // Check if user is already in an organization
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });

  if (user?.organizationId === invite.organizationId) {
    redirect("/dashboard");
  }

  if (user?.organizationId) {
    return (
      <ErrorCard
        title="Already in Organization"
        description={`You are already a member of ${user.organization?.name}. You can only be a member of one organization at a time.`}
      />
    );
  }

  const usageInfo = invite.usageLimit
    ? `${invite.usageCount}/${invite.usageLimit} used`
    : `${invite.usageCount} members joined`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            Join {invite.organization.name} on Gumboard!
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            You&apos;ve been invited to join{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {invite.organization.name}
            </span>{" "}
            on Gumboard
          </p>
        </div>
        <Card className="border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 shadow-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800">
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {invite.organization.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-2xl font-semibold text-slate-900 dark:text-slate-100 -mt-2">
              {invite.organization.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Created by</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {invite.user.name || invite.user.email}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Organization info
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{usageInfo}</p>
              </div>
              {invite.expiresAt && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Expires: {invite.expiresAt.toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <form action={joinOrganization.bind(null, token)} className="pt-2">
              <Button type="submit" className="w-full h-12 text-base font-medium" size="lg">
                Join {invite.organization.name}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
