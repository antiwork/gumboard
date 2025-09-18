import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    console.log("REQ ------------------------------");

    const params = req.nextUrl.searchParams;
    const { code, state } = Object.fromEntries(params);

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID as string,
        client_secret: process.env.SLACK_CLIENT_SECRET as string,
        redirect_uri: process.env.SLACK_REDIRECT_URI as string,
      }),
    });

    const data = await response.json();
    console.log(data);

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // Get organizationId for current user
    // const user = await db.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { organizationId: true },
    // });

    // const organizationId = user?.organizationId;

    const { orgId } = JSON.parse(decodeURIComponent(state));
    console.log("ORGID", orgId);

    // if (!organizationId) {
    //   return NextResponse.json({ error: "No organization found" }, { status: 404 });
    // }
    // Save Slack installation details
    await db.organization.update({
      where: { id: orgId },
      data: {
        slackTeamId: data.team?.id,
        slackTeamName: data.team?.name,
        slackBotToken: data.access_token,
        slackAppId: data.app_id,
      },
    });

    // Option 1: return JSON (API usage)
    // return NextResponse.json({ success: true });

    // TODO : Figutre oout how to close when login is complete
    const html = `
        <html>
  <body>
    <script>
      window.opener.postMessage(
        { type: "SLACK_CONNECTED", success: true },
        window.location.origin
      );
      window.close();
    </script>
    <p>Slack connected! You can close this window.</p>
  </body>
  </html>
    `;
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });

    // Option 2: redirect to a dashboard/settings page
  } catch (error) {
    console.error("Slack OAuth error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
