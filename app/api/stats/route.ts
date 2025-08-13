import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const startDate = new Date("2025-07-21");

    const weeklyStats = await db.$queryRaw`
      WITH week_series AS (
        SELECT 
          date_trunc('week', generate_series(
            date_trunc('week', ${startDate}::timestamp),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          )) as week_start
      ),
      weekly_users AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as users_created
        FROM "users"
        WHERE "createdAt" >= ${startDate}
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_orgs AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as orgs_created
        FROM "organizations"
        WHERE "createdAt" >= ${startDate}
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_boards AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as boards_created
        FROM "boards"
        WHERE "createdAt" >= ${startDate}
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_notes AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as notes_created
        FROM "notes"
        WHERE "createdAt" >= ${startDate}
          AND "deletedAt" IS NULL
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_checklist_items AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as checklist_items_created
        FROM "checklist_items"
        WHERE "createdAt" >= ${startDate}
        GROUP BY date_trunc('week', "createdAt")
      )
      SELECT 
        ws.week_start,
        COALESCE(wu.users_created, 0) as users_created,
        COALESCE(wo.orgs_created, 0) as orgs_created,
        COALESCE(wb.boards_created, 0) as boards_created,
        COALESCE(wn.notes_created, 0) as notes_created,
        COALESCE(wci.checklist_items_created, 0) as checklist_items_created
      FROM week_series ws
      LEFT JOIN weekly_users wu ON ws.week_start = wu.week_start
      LEFT JOIN weekly_orgs wo ON ws.week_start = wo.week_start
      LEFT JOIN weekly_boards wb ON ws.week_start = wb.week_start
      LEFT JOIN weekly_notes wn ON ws.week_start = wn.week_start
      LEFT JOIN weekly_checklist_items wci ON ws.week_start = wci.week_start
      ORDER BY ws.week_start ASC
    `;

    const formattedStats = (
      weeklyStats as Array<{
        week_start: Date;
        users_created: number;
        orgs_created: number;
        boards_created: number;
        notes_created: number;
        checklist_items_created: number;
      }>
    ).map((row) => ({
      week: new Date(row.week_start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      weekStart: row.week_start,
      boardsCreated: Number(row.boards_created),
      usersCreated: Number(row.users_created),
      orgsCreated: Number(row.orgs_created),
      notesCreated: Number(row.notes_created),
      checklistItemsCreated: Number(row.checklist_items_created),
    }));

    const totals = formattedStats.reduce(
      (acc, week) => ({
        totalUsers: acc.totalUsers + week.usersCreated,
        totalOrgs: acc.totalOrgs + week.orgsCreated,
        totalBoards: acc.totalBoards + week.boardsCreated,
        totalNotes: acc.totalNotes + week.notesCreated,
        totalChecklistItems: acc.totalChecklistItems + week.checklistItemsCreated,
      }),
      { totalUsers: 0, totalOrgs: 0, totalBoards: 0, totalNotes: 0, totalChecklistItems: 0 }
    );

    return NextResponse.json({ weeklyStats: formattedStats, totals });
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
