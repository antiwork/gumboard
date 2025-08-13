import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [totalUsers, totalOrgs, totalBoards, totalNotes, totalChecklistItems] = await Promise.all(
      [
        db.user.count(),
        db.organization.count(),
        db.board.count(),
        db.note.count({ where: { deletedAt: null } }),
        db.checklistItem.count(),
      ]
    );

    const totals = {
      totalUsers,
      totalOrgs,
      totalBoards,
      totalNotes,
      totalChecklistItems,
    };

    return NextResponse.json({ totals });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
