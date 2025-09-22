import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      organizationId: true,
      isAdmin: true,
    },
  });

  if (!user?.isAdmin) {
    return NextResponse.json(
      { error: "Only admins can configure Slack integration" },
      { status: 403 }
    );
  }

  if (!user?.organizationId) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // encode orgId in state
  const state = encodeURIComponent(
    JSON.stringify({
      orgId: user.organizationId,
    })
  );

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
  url.searchParams.set(
    "scope",
    "chat:write,im:history,app_mentions:read,channels:read,channels:join"
  );
  url.searchParams.set("redirect_uri", process.env.SLACK_REDIRECT_URI!);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
