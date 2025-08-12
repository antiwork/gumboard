import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

jest.setTimeout(60_000);

function getTestDbUrl(): string {
  let url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    url = "postgresql://postgres:postgres@localhost:5432/gumboard";
    console.warn(`No TEST_DATABASE_URL or DATABASE_URL found, using default: ${url}`);
  }

  if (url.includes("gumboard_test")) {
    url = url.replace("gumboard_test", "gumboard");
    console.warn(
      `Migration test: Using 'gumboard' database instead of 'gumboard_test' (isolated with schema)`
    );
  }

  return url;
}

function findChecklistMigrationSql(): string {
  const prismaDir = path.resolve(process.cwd(), "prisma", "migrations");
  const dirs = fs.readdirSync(prismaDir, { withFileTypes: true });
  const match = dirs
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .find((name) => name.endsWith("_create_checklist_items_table"));
  if (!match) {
    throw new Error(
      `Could not find a migration directory ending with "_create_checklist_items_table" under ${prismaDir}`
    );
  }
  const sqlPath = path.join(prismaDir, match, "migration.sql");
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file not found: ${sqlPath}`);
  }
  return fs.readFileSync(sqlPath, "utf8");
}

async function q<T = Record<string, unknown>>(
  client: PrismaClient,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  return client.$queryRawUnsafe<T[]>(sql, ...params);
}
function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDo = false;

  for (const rawLine of sql.split("\n")) {
    const line = rawLine;
    const trimmed = line.trim();

    if (!current && (!trimmed || trimmed.startsWith("--"))) continue;

    current += line + "\n";

    if (trimmed.startsWith("DO $$")) inDo = true;
    if (inDo && trimmed === "END$$;") {
      inDo = false;
      statements.push(current.trim());
      current = "";
      continue;
    }
    if (!inDo && trimmed.endsWith(";") && !trimmed.startsWith("--")) {
      statements.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

describe("migration: create_checklist_items_table", () => {
  const schema = `mig_checklist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let client: PrismaClient;
  let pgcryptoAvailable = false;
  let shouldSkipTests = false;

  beforeAll(async () => {
    client = new PrismaClient({
      datasources: { db: { url: getTestDbUrl() } },
    });

    try {
      await client.$connect();
    } catch (error) {
      const dbUrl = getTestDbUrl();
      console.error(`Failed to connect to database: ${dbUrl}`);
      console.error("");
      console.error("To fix this:");
      console.error("1. Make sure PostgreSQL is running");
      console.error("2. Make sure the database exists:");
      console.error("   createdb gumboard  # if using default database");
      console.error("3. Or set TEST_DATABASE_URL to a working database:");
      console.error(
        "   TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/gumboard npm run test"
      );
      console.error("");

      if (process.env.CI) {
        console.warn("CI environment detected - marking database tests as skipped");
        shouldSkipTests = true;
        return;
      }

      throw error;
    }

    if (shouldSkipTests) {
      return;
    }

    // Isolate in dedicated schema
    await client.$executeRawUnsafe(`CREATE SCHEMA "${schema}";`);
    await client.$executeRawUnsafe(`SET search_path TO "${schema}";`);

    // Minimal legacy notes table with JSONB checklistItems
    await client.$executeRawUnsafe(`
      CREATE TABLE "notes" (
        id TEXT PRIMARY KEY,
        "checklistItems" JSONB,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed data
    await client.$executeRawUnsafe(
      `
      INSERT INTO "notes"(id, "checklistItems") VALUES
      ($1, $2::jsonb),
      ($3, $4::jsonb),
      ($5, NULL);
    `,
      "n1",
      JSON.stringify([
        { id: "n1_i1", content: "One", checked: false, order: 0 },
        { id: "n1_i2", content: "Two", checked: true, order: 1 },
      ]),
      "n2",
      JSON.stringify([
        { content: "Alpha", checked: false, order: 0 },
        { id: "n2_i2", content: "Beta", checked: false, order: 1 },
      ]),
      "n3"
    );

    // Try enabling pgcrypto so the DO $$ backfill can gen IDs when needed
    try {
      await client.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
      const rows = await q<{ extname: string }>(
        client,
        `SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';`
      );
      pgcryptoAvailable = rows.length > 0;
    } catch {
      pgcryptoAvailable = false;
    }

    // Run the actual migration SQL
    const sql = findChecklistMigrationSql();
    for (const stmt of splitSqlStatements(sql)) {
      await client.$executeRawUnsafe(stmt);
    }
  });

  afterAll(async () => {
    if (client && !shouldSkipTests) {
      try {
        await client.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE;`);
      } catch (error) {
        console.warn(`Could not drop test schema "${schema}":`, error);
      } finally {
        await client.$disconnect();
      }
    } else if (client && shouldSkipTests) {
      // Still disconnect even if tests were skipped
      await client.$disconnect();
    }
  });

  it("backfills checklist items into checklist_items with correct values", async () => {
    if (shouldSkipTests) {
      console.log("Skipping test - database connection failed");
      return;
    }

    const items = await q<{
      id: string;
      content: string;
      checked: boolean;
      order: number;
      noteid: string;
    }>(
      client,
      `SELECT id, content, checked, "order", "noteId" as noteid
       FROM "checklist_items"
       ORDER BY noteid, "order";`
    );

    expect(items).toHaveLength(4);

    // n1 items keep their ids and order
    const n1 = items.filter((r) => r.noteid === "n1");
    expect(n1.map((r) => r.id)).toEqual(["n1_i1", "n1_i2"]);
    expect(n1.map((r) => r.order)).toEqual([0, 1]);
    expect(n1.map((r) => r.content)).toEqual(["One", "Two"]);
    expect(n1.map((r) => r.checked)).toEqual([false, true]);

    // n2 order/content/checked are normalized
    const n2 = items.filter((r) => r.noteid === "n2");
    expect(n2.map((r) => r.order)).toEqual([0, 1]);
    expect(n2.map((r) => r.content)).toEqual(["Alpha", "Beta"]);
    expect(n2.map((r) => r.checked)).toEqual([false, false]);

    // id expectations for n2
    const n2Ids = n2.map((r) => r.id);
    expect(n2Ids[1]).toBe("n2_i2"); // second item had explicit id
    if (pgcryptoAvailable) {
      expect(n2Ids[0]).toEqual(expect.any(String));
      expect(n2Ids[0].length).toBeGreaterThan(0);
      expect(n2Ids[0]).not.toBe("n2_i2");
    } else {
      // If pgcrypto can’t be created on the DB, we still expect some string
      expect(n2Ids[0]).toEqual(expect.any(String));
    }
  });

  it("enforces FK to notes(id)", async () => {
    if (shouldSkipTests) {
      console.log("Skipping test - database connection failed");
      return;
    }

    await expect(
      client.$executeRawUnsafe(
        `INSERT INTO "checklist_items"(id, content, checked, "order", "noteId")
         VALUES ('bogus', 'x', false, 0, 'missing');`
      )
    ).rejects.toThrow();
  });

  it('drops the legacy notes."checklistItems" column', async () => {
    if (shouldSkipTests) {
      console.log("Skipping test - database connection failed");
      return;
    }

    const cols = await q<{ column_name: string }>(
      client,
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'notes'
      ORDER BY column_name;
    `,
      [schema]
    );
    expect(cols.map((c) => c.column_name)).not.toContain("checklistItems");
  });

  it("creates the expected indexes", async () => {
    if (shouldSkipTests) {
      console.log("Skipping test - database connection failed");
      return;
    }

    const idx = await q<{ indexname: string }>(
      client,
      `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = $1 AND tablename = 'checklist_items'
      ORDER BY indexname;
    `,
      [schema]
    );
    const names = idx.map((r) => r.indexname);
    expect(names).toContain("checklist_items_noteId_idx");
    expect(names).toContain("checklist_items_noteId_order_idx");
  });
});
