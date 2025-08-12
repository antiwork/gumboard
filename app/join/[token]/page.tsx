import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invalid Link</CardTitle>
                <CardDescription>
                  This invitation link is invalid or missing required information.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invalid Invitation</CardTitle>
                <CardDescription>This invitation link is invalid or has expired.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check if invite is active
  if (!invite.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invitation Deactivated</CardTitle>
                <CardDescription>
                  This invitation link has been deactivated by the organization.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check if invite has expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invitation Expired</CardTitle>
                <CardDescription>
                  This invitation link expired on {invite.expiresAt.toLocaleDateString()}.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check if usage limit has been reached
  if (invite.usageLimit && invite.usageCount >= invite.usageLimit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invitation Full</CardTitle>
                <CardDescription>
                  This invitation link has reached its maximum usage limit of {invite.usageLimit}{" "}
                  uses.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show join form
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">
                Join {invite.organization.name} on Gumboard!
              </h1>
              <p className="text-muted-foreground">
                You&apos;ve been invited to join {invite.organization.name}
              </p>
            </div>

            {/* Join Form */}
            <Card className="border-2">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {invite.organization.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="text-xl">{invite.organization.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {invite.usageLimit ? `${invite.usageCount}/${invite.usageLimit} used` : ""}
                  </p>
                  {invite.expiresAt && (
                    <p className="text-sm text-muted-foreground">
                      Expires: {invite.expiresAt.toLocaleDateString()}
                    </p>
                  )}
                </div>

                <form action={autoCreateAccountAndJoin.bind(null, token)} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-foreground mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Join {invite.organization.name}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <a
                      href={`/auth/signin?callbackUrl=${encodeURIComponent(`/join/${token}`)}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      Sign in instead
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-black dark:text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-blue-600">Already a Member</CardTitle>
                <CardDescription>
                  You are already a member of {invite.organization.name}.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Button asChild className="w-full">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (user?.organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-yellow-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-yellow-600">Already in Organization</CardTitle>
                <CardDescription>
                  You are already a member of {user.organization?.name}. You can only be a member of
                  one organization at a time.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const usageInfo = invite.usageLimit
    ? `${invite.usageCount}/${invite.usageLimit} used`
    : `${invite.usageCount} members joined`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Join Organization</h1>
            <p className="text-muted-foreground">
              You&apos;ve been invited to join an organization
            </p>
          </div>

          {/* Invitation Details Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
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

              <div className="flex flex-col space-y-3">
                <form action={joinOrganization.bind(null, token)}>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Join {invite.organization.name}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
