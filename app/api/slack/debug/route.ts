import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    env_check: {
      SLACK_CLIENT_ID: !!env.SLACK_CLIENT_ID,
      SLACK_CLIENT_SECRET: !!env.SLACK_CLIENT_SECRET,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL,
      request_origin: request.nextUrl.origin,
    },
    redirect_uri_that_will_be_used: `${env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/slack/oauth/callback`,
  });
}
