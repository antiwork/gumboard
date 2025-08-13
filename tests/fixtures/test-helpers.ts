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
  private _isAuthInitialized: boolean = false;
  private prisma: PrismaClient;

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
    this.prisma = getTestPrismaClient();
  }

  async setup() {
    // Minimal setup - auth will be initialized lazily when needed
  }

  async ensureAuthInitialized() {
    if (this._isAuthInitialized) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organization.create({
        data: {
          id: this.organizationId,
          name: `Test Org ${this.testId}`,
        },
      });

      await tx.user.create({
        data: {
          id: this.userId,
          email: this.userEmail,
          name: `Test User ${this.testId}`,
          organizationId: this.organizationId,
        },
      });

      await tx.session.create({
        data: {
          sessionToken: this.sessionToken,
          userId: this.userId,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });

    this._isAuthInitialized = true;
  }

  async cleanup() {
    // Use transaction for atomic cleanup
    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Delete in dependency order to avoid foreign key violations
          await tx.checklistItem.deleteMany({
            where: {
              note: {
                board: {
                  organizationId: this.organizationId,
                },
              },
            },
          });

          await tx.note.deleteMany({
            where: {
              board: {
                organizationId: this.organizationId,
              },
            },
          });

          await tx.board.deleteMany({
            where: {
              organizationId: this.organizationId,
            },
          });

          await tx.session.deleteMany({
            where: {
              userId: this.userId,
            },
          });

          await tx.user.deleteMany({
            where: {
              organizationId: this.organizationId,
            },
          });

          await tx.organization.deleteMany({
            where: {
              id: this.organizationId,
            },
          });
        },
        {
          timeout: 10000, // 10 second timeout for cleanup
        }
      );
    } catch (error) {
      // Log cleanup errors but don't throw - we want to continue test execution
      if (process.env.DEBUG_TESTS) {
        console.error(`Cleanup failed for test ${this.testId}:`, error);
      }

      // Try individual cleanup as fallback
      const fallbackCleanup = [
        () =>
          this.prisma.checklistItem.deleteMany({
            where: {
              note: {
                board: {
                  organizationId: this.organizationId,
                },
              },
            },
          }),
        () =>
          this.prisma.note.deleteMany({
            where: { board: { organizationId: this.organizationId } },
          }),
        () =>
          this.prisma.board.deleteMany({
            where: { organizationId: this.organizationId },
          }),
        () =>
          this.prisma.session.deleteMany({
            where: { userId: this.userId },
          }),
        () =>
          this.prisma.user.deleteMany({
            where: { organizationId: this.organizationId },
          }),
        () =>
          this.prisma.organization.deleteMany({
            where: { id: this.organizationId },
          }),
      ];

      for (const cleanupFn of fallbackCleanup) {
        try {
          await cleanupFn();
        } catch (fallbackError) {
          // Log but continue with other cleanup operations
          if (process.env.DEBUG_TESTS) {
            console.error(`Fallback cleanup step failed:`, fallbackError);
          }
        }
      }
    }
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

  testPrisma: async ({ testContext }, use) => {
    // Ensure auth is initialized if test is using testPrisma
    // This ensures user/org exist for foreign key constraints
    await testContext.ensureAuthInitialized();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(getTestPrismaClient());
  },

  authenticatedPage: async ({ page, testContext }, use) => {
    // Ensure auth is initialized before setting cookies
    await testContext.ensureAuthInitialized();

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
