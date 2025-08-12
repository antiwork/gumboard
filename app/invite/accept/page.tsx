import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

async function acceptInvite(token: string) {
  "use server";

  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  // Find the invite by token (ID)
  const invite = await db.organizationInvite.findUnique({
    where: { id: token },
    include: { organization: true },
  });

  if (!invite) {
    throw new Error("Invalid or expired invitation");
  }

  if (invite.email !== session.user.email) {
    throw new Error("This invitation is not for your email address");
  }

  if (invite.status !== "PENDING") {
    throw new Error("This invitation has already been processed");
  }

  // Update user to join the organization
  await db.user.update({
    where: { id: session.user.id },
    data: { organizationId: invite.organizationId },
  });

  // Mark invite as accepted
  await db.organizationInvite.update({
    where: { id: token },
    data: { status: "ACCEPTED" },
  });

  redirect("/dashboard");
}

async function declineInvite(token: string) {
  "use server";

  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  // Find the invite by token (ID)
  const invite = await db.organizationInvite.findUnique({
    where: { id: token },
  });

  if (!invite) {
    throw new Error("Invalid or expired invitation");
  }

  if (invite.email !== session.user.email) {
    throw new Error("This invitation is not for your email address");
  }

  // Mark invite as declined
  await db.organizationInvite.update({
    where: { id: token },
    data: { status: "DECLINED" },
  });

  redirect("/dashboard");
}

async function autoVerifyAndCreateSession(email: string, token: string) {
  "use server";

  try {
    // Check if user already exists
    let user = await db.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create one with verified email
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          emailVerified: new Date(), // Auto-verify since they clicked the invite link
        },
      });
    } else if (!user.emailVerified) {
      // If user exists but isn't verified, verify them
      user = await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
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

    // Redirect to a special endpoint that will set the session cookie and redirect back
    redirect(
      `/api/auth/set-session?token=${sessionToken}&redirectTo=${encodeURIComponent(`/invite/accept?token=${token}&verified=true`)}`
    );
  } catch (error) {
    console.error("Auto-verification error:", error);
    // Fallback to regular auth flow
    redirect(
      `/auth/signin?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`
    );
  }
}

interface InviteAcceptPageProps {
  searchParams: Promise<{
    token?: string;
    verified?: string;
  }>;
}

export default async function InviteAcceptPage({ searchParams }: InviteAcceptPageProps) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token;
  const isJustVerified = resolvedSearchParams.verified === "true";

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invalid Invitation</CardTitle>
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

  // Find the invite by token
  const invite = await db.organizationInvite.findUnique({
    where: { id: token },
    include: {
      organization: true,
      user: true, // The user who sent the invite
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

  // If user is not authenticated, auto-verify them
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Organization Invitation</h1>
            </div>

            {/* Auto-verification Card */}
            <Card className="border-2">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {invite.organization.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <CardTitle className="text-xl">{invite.organization.name}</CardTitle>
                <CardDescription className="text-base">
                  {invite.user.name || invite.user.email} has invited you to join their organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <form action={autoVerifyAndCreateSession.bind(null, invite.email, token)}>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Continue to Invitation
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

  // Check if the invite is for the current user's email
  if (invite.email !== session.user.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-yellow-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-yellow-600">Wrong Account</CardTitle>
                <CardDescription>
                  This invitation is for {invite.email}, but you&apos;re signed in as{" "}
                  {session.user.email}. Please sign out and use the invitation link again to sign in
                  with the correct account.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form action={autoVerifyAndCreateSession.bind(null, invite.email, token)}>
                  <Button type="submit" className="w-full" variant="outline">
                    Sign in as {invite.email}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Check if invite has already been processed
  if (invite.status !== "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-blue-600">
                  Invitation{" "}
                  {invite.status === "ACCEPTED" ? "Already Accepted" : "Already Declined"}
                </CardTitle>
                <CardDescription>
                  You have already {invite.status === "ACCEPTED" ? "accepted" : "declined"} this
                  invitation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Organization Invitation</h1>
            <p className="text-muted-foreground">
              You&apos;ve been invited to join an organization
            </p>
          </div>

          {/* Success message if just verified */}
          {isJustVerified && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-700 dark:text-green-300 text-center">
                ✅ Account verified successfully! You can now accept or decline the invitation
                below.
              </p>
            </div>
          )}

          {/* Invitation Details Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {invite.organization.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl">{invite.organization.name}</CardTitle>
              <CardDescription className="text-base">
                {invite.user.name || invite.user.email} has invited you to join their organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Invited: {invite.createdAt.toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">Your email: {invite.email}</p>
              </div>

              <div className="flex flex-col space-y-3">
                <form action={acceptInvite.bind(null, token)}>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Accept Invitation
                  </Button>
                </form>

                <form action={declineInvite.bind(null, token)}>
                  <Button type="submit" variant="outline" className="w-full">
                    Decline Invitation
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
