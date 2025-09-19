import { NextRequest, NextResponse } from "next/server";

/// get the teamId

export async function POST(request: NextRequest) {
  try {
    const token = request.body ? (await request.json()).token : null;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }
    const authResponse = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await authResponse.json();
    console.log("Slack API Response:", data);

    // Return the data as JSON response
    return NextResponse.json(data);
  } catch (error) {
    console.error("Slack auth test error:", error);

    return NextResponse.json({ error: "Failed to test Slack authentication" }, { status: 500 });
  }
}
