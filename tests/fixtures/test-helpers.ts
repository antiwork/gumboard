import { test as base, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

interface TestFixtures {
  prisma: PrismaClient;
}

export const test = base.extend<TestFixtures>({
  prisma: async ({}, use: (r: PrismaClient) => Promise<void>) => {
    const prisma = new PrismaClient();

    await use(prisma);

    await prisma.$disconnect();
  },
});

// Generate unique test IDs to avoid conflicts
export const generateTestIds = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    testOrgId: `test-org-${timestamp}-${random}`,
    testUserId: `test-user-${timestamp}-${random}`,
    testBoardId: `test-board-${timestamp}-${random}`,
    testNoteId: `test-note-${timestamp}-${random}`,
    testEmail: `test-${timestamp}-${random}@example.com`,
  };
};

export { expect };

// Database state verification helpers
export const dbHelpers = {
  async verifyUserExists(prisma: PrismaClient, email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user;
  },

  async verifyBoardExists(prisma: PrismaClient, boardId: string) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { _count: { select: { notes: true } } },
    });
    return board;
  },

  async verifyNoteExists(prisma: PrismaClient, noteId: string) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { user: true, board: true },
    });
    return note;
  },

  async verifyNoteArchived(prisma: PrismaClient, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    return note && note.archivedAt !== null;
  },

  async verifyNoteUnarchived(prisma: PrismaClient, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    return note && note.archivedAt === null;
  },

  async verifyBoardSettings(
    prisma: PrismaClient,
    boardId: string,
    expectedSettings: { sendSlackUpdates?: boolean }
  ) {
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return false;

    if (expectedSettings.sendSlackUpdates !== undefined) {
      return board.sendSlackUpdates === expectedSettings.sendSlackUpdates;
    }
    return true;
  },

  async verifyAccountLinked(prisma: PrismaClient, userId: string, provider: string) {
    const account = await prisma.account.findFirst({
      where: { userId, provider },
    });
    return account !== null;
  },

  async getNoteCount(prisma: PrismaClient, boardId: string, archived: boolean = false) {
    return await prisma.note.count({
      where: {
        boardId,
        archivedAt: archived ? { not: null } : null,
        deletedAt: null,
      },
    });
  },

  async getArchivedNotes(prisma: PrismaClient) {
    return await prisma.note.findMany({
      where: {
        archivedAt: { not: null },
        deletedAt: null,
      },
      include: { user: true, board: true },
    });
  },

  async cleanupTestData(prisma: PrismaClient, testPrefix: string = "test-") {
    // Clean up test data in reverse dependency order with error handling
    try {
      // Delete verification tokens
      await prisma.verificationToken.deleteMany({
        where: { identifier: { contains: testPrefix } },
      });

      // Delete notes (depends on boards and users)
      await prisma.note.deleteMany({
        where: {
          OR: [
            { id: { startsWith: testPrefix } },
            { board: { id: { startsWith: testPrefix } } },
            { user: { id: { startsWith: testPrefix } } },
          ],
        },
      });

      // Delete boards (depends on users and organizations)
      await prisma.board.deleteMany({
        where: {
          OR: [
            { id: { startsWith: testPrefix } },
            { createdBy: { startsWith: testPrefix } },
            { organizationId: { startsWith: testPrefix } },
          ],
        },
      });

      // Delete accounts and sessions (depends on users)
      await prisma.account.deleteMany({
        where: { userId: { startsWith: testPrefix } },
      });
      await prisma.session.deleteMany({
        where: { userId: { startsWith: testPrefix } },
      });

      // Delete users (depends on organizations)
      await prisma.user.deleteMany({
        where: {
          OR: [{ id: { startsWith: testPrefix } }, { email: { contains: testPrefix } }],
        },
      });

      // Delete organizations (no dependencies)
      await prisma.organization.deleteMany({
        where: { id: { startsWith: testPrefix } },
      });
    } catch (error) {
      console.warn("Cleanup error (non-critical):", error);
    }
  },
};
