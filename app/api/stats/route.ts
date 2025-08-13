import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));

    const weeklyStats = await db.$queryRaw`
      WITH week_series AS (
        SELECT 
          date_trunc('week', generate_series(
            date_trunc('week', ${twelveWeeksAgo}::timestamp),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          )) as week_start
      ),
      weekly_notes AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as notes_created
        FROM "notes"
        WHERE "createdAt" >= ${twelveWeeksAgo}
          AND "deletedAt" IS NULL
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_users AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as users_created
        FROM "users"
        WHERE "createdAt" >= ${twelveWeeksAgo}
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_orgs AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as orgs_created
        FROM "organizations"
        WHERE "createdAt" >= ${twelveWeeksAgo}
        GROUP BY date_trunc('week', "createdAt")
      ),
      weekly_boards AS (
        SELECT 
          date_trunc('week', "createdAt") as week_start,
          COUNT(*) as boards_created
        FROM "boards"
        WHERE "createdAt" >= ${twelveWeeksAgo}
        GROUP BY date_trunc('week', "createdAt")
      )
      SELECT 
        ws.week_start,
        COALESCE(wn.notes_created, 0) as notes_created,
        COALESCE(wu.users_created, 0) as users_created,
        COALESCE(wo.orgs_created, 0) as orgs_created,
        COALESCE(wb.boards_created, 0) as boards_created
      FROM week_series ws
      LEFT JOIN weekly_notes wn ON ws.week_start = wn.week_start
      LEFT JOIN weekly_users wu ON ws.week_start = wu.week_start
      LEFT JOIN weekly_orgs wo ON ws.week_start = wo.week_start
      LEFT JOIN weekly_boards wb ON ws.week_start = wb.week_start
      ORDER BY ws.week_start ASC
    `;

    interface WeeklyStatsRow {
      week_start: Date;
      notes_created: bigint;
      users_created: bigint;
      orgs_created: bigint;
      boards_created: bigint;
    }

    const formattedStats = (weeklyStats as WeeklyStatsRow[]).map(row => ({
      week: new Date(row.week_start).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      weekStart: row.week_start,
      notesCreated: Number(row.notes_created),
      usersCreated: Number(row.users_created),
      orgsCreated: Number(row.orgs_created),
      boardsCreated: Number(row.boards_created),
    }));

    return NextResponse.json({ weeklyStats: formattedStats });
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
