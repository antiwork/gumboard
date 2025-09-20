import { WebClient } from "@slack/web-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const client = new WebClient(token);
    const result = await client.auth.test();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Slack auth test error:", error);
    return NextResponse.json(
      { error: "Failed to test Slack authentication" },
      { status: 500 }
    );
  }
}
