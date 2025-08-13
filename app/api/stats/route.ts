import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      usersCount,
      organizationsCount,
      boardsCount,
      activeNotesCount,
      deletedNotesCount,
      orgInvitesCount,
      pendingOrgInvitesCount,
      acceptedOrgInvitesCount,
      activeSelfServeInvitesCount,
      usersWithNotesResult,
      totalChecklistItemsCount,
      checkedItemsCount,
      uncheckedItemsCount,
    ] = await Promise.all([
      db.user.count(),
      db.organization.count(),
      db.board.count(),
      db.note.count({ where: { deletedAt: null } }),
      db.note.count({ where: { deletedAt: { not: null } } }),
      db.organizationInvite.count(),
      db.organizationInvite.count({ where: { status: "PENDING" } }),
      db.organizationInvite.count({ where: { status: "ACCEPTED" } }),
      db.organizationSelfServeInvite.count({ where: { isActive: true } }),
      db.note.groupBy({
        by: ["createdBy"],
        _count: { createdBy: true },
      }),
      db.checklistItem.count(),
      db.checklistItem.count({ where: { checked: true } }),
      db.checklistItem.count({ where: { checked: false } }),
    ]);

    const usersWithNotesCount = usersWithNotesResult.length;

    const stats = [
      { metric: "Users", value: usersCount },
      { metric: "Organizations", value: organizationsCount },
      { metric: "Boards", value: boardsCount },
      { metric: "Active Notes", value: activeNotesCount },
      { metric: "Deleted Notes", value: deletedNotesCount },
      { metric: "Org Invites", value: orgInvitesCount },
      { metric: "Pending Org Invites", value: pendingOrgInvitesCount },
      { metric: "Accepted Org Invites", value: acceptedOrgInvitesCount },
      { metric: "Active Self-Serve Invites", value: activeSelfServeInvitesCount },
      { metric: "Users with Notes", value: usersWithNotesCount },
      { metric: "Total Checklist Items", value: totalChecklistItemsCount },
      { metric: "Checked Items", value: checkedItemsCount },
      { metric: "Unchecked Items", value: uncheckedItemsCount },
    ];

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
