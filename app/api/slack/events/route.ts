// app/api/slack/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { db } from "@/lib/db";
import { handleSlackEvent } from "@/lib/slack/event-handler";
import { isDuplicateEvent } from "@/lib/slack/dedupe";

function verifySlackRequest(req: NextRequest, body: string, slackSigningSecret: string): boolean {
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    console.error("Missing timestamp or signature");
    return false;
  }

  // Check if request is too old (more than 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.error("Request too old");
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${body}`;
  const mySig =
    "v0=" +
    crypto.createHmac("sha256", slackSigningSecret).update(sigBaseString, "utf8").digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(mySig, "utf8"), Buffer.from(signature, "utf8"));
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("Raw body:", body);

    // Verify request signature

    const payload = JSON.parse(body);
    console.log("Parsed payload:", JSON.stringify(payload.team_id, null, 2));

    const organization = await db.organization.findFirst({
      where: {
        slackTeamId: payload.team_id,
      },
    });

    if (!verifySlackRequest(req, body, organization?.slackSigningSecret!)) {
      console.error("Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Handle Slack URL verification challenge
    if (payload.type === "url_verification") {
      console.log("URL verification challenge:", payload.challenge);
      return new Response(payload.challenge, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Handle events
    if (payload.type === "event_callback" && payload.event) {
      if (isDuplicateEvent(payload.event_id)) {
        console.log("Skipping duplicate event:", payload.event_id);
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      handleSlackEvent(payload.event);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // return NextResponse.json({ ok: true  }, {status: 200});
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add a GET handler for testing
export async function GET() {
  return NextResponse.json({
    message: "Slack bot endpoint is running!",
    timestamp: new Date().toISOString(),
  });
}
