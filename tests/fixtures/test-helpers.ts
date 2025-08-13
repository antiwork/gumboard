import { test as base, Page } from "@playwright/test";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

function getTestPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export class TestContext {
  testId: string;
  testName: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  sessionToken: string;

  constructor(testTitle?: string) {
    // Create a short, unique identifier
    const timestamp = Date.now().toString(36); // Base36 for shorter IDs
    const random = randomBytes(3).toString("hex"); // 6 hex chars

    // Clean test name for readability in the database
    this.testName = testTitle?.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "test";
    this.testId = `${timestamp}-${random}`;

    // All entities use consistent prefixing for easy identification
    this.userId = `usr_${this.testId}`;
    this.userEmail = `test-${this.testId}@example.com`;
    this.organizationId = `org_${this.testId}`;
    this.sessionToken = `sess_${this.testId}_${randomBytes(16).toString("hex")}`;
  }

  async setup() {
    const prisma = getTestPrismaClient();

    await prisma.organization.create({
      data: {
        id: this.organizationId,
        name: `Test Org ${this.testId}`,
      },
    });

    await prisma.user.create({
      data: {
        id: this.userId,
        email: this.userEmail,
        name: `Test User ${this.testId}`,
        organizationId: this.organizationId,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken: this.sessionToken,
        userId: this.userId,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  }

  async cleanup() {
    const prisma = getTestPrismaClient();

    await prisma.$transaction([
      prisma.session.deleteMany({
        where: { userId: this.userId },
      }),
      prisma.note.deleteMany({
        where: { board: { organizationId: this.organizationId } },
      }),
      prisma.board.deleteMany({
        where: { organizationId: this.organizationId },
      }),
      prisma.user.deleteMany({
        where: { organizationId: this.organizationId },
      }),
      prisma.organization.deleteMany({
        where: { id: this.organizationId },
      }),
    ]);
  }

  // Simple prefixing methods for test data
  prefix(name: string) {
    return `${name}_${this.testId}`;
  }

  // Specific prefix methods if you want more semantic names
  getBoardName(name: string) {
    return `${name}_${this.testId}`;
  }

  getNoteName(name: string) {
    return `${name}_${this.testId}`;
  }
}

export const test = base.extend<{
  testContext: TestContext;
  testPrisma: PrismaClient;
  authenticatedPage: Page;
}>({
  testContext: async ({}, use, testInfo) => {
    const context = new TestContext(testInfo.title);

    // Optional: Log for debugging parallel test issues
    if (process.env.DEBUG_TESTS) {
      console.log(`[${new Date().toISOString()}] Starting: ${testInfo.title}`);
      console.log(`  Test ID: ${context.testId}`);
      console.log(`  User ID: ${context.userId}`);
    }

    await context.setup();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(context);
    await context.cleanup();

    if (process.env.DEBUG_TESTS) {
      console.log(`[${new Date().toISOString()}] Finished: ${testInfo.title}`);
    }
  },

  testPrisma: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(getTestPrismaClient());
  },

  authenticatedPage: async ({ page, testContext }, use) => {
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: testContext.sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from "@playwright/test";
