import { NextResponse } from "next/server";

export async function GET() {
  try {
    const stats = [
      { metric: "Users", value: 1178 },
      { metric: "Organizations", value: 97 },
      { metric: "Boards", value: 76 },
      { metric: "Active Notes", value: 1149 },
      { metric: "Deleted Notes", value: 21 },
      { metric: "Org Invites", value: 33 },
      { metric: "Pending Org Invites", value: 26 },
      { metric: "Accepted Org Invites", value: 7 },
      { metric: "Active Self-Serve Invites", value: 1 },
    ];

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
