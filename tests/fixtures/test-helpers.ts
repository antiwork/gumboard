import { test as base, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { DatabaseAPI } from "./database-api";

interface TestFixtures {
  prisma: PrismaClient;
  dbApi: DatabaseAPI;
}

export const test = base.extend<TestFixtures>({
  prisma: async ({}, use: (r: PrismaClient) => Promise<void>) => {
    const prisma = new PrismaClient();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(prisma);
    await prisma.$disconnect();
  },
  dbApi: async ({ prisma }, use) => {
    const dbApi = new DatabaseAPI(prisma);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(dbApi);
  },
});

export { expect };

// Database state verification utilities
export const dbUtils = {
  // Check if a board exists in the database by name
  async verifyBoardExists(prisma: PrismaClient, boardName: string) {
    const board = await prisma.board.findFirst({
      where: { name: boardName },
    });
    console.log("board expect", board);
    expect(board).not.toBeNull();
    return board;
  },

  // Get count of boards in database
  async getBoardCount(prisma: PrismaClient) {
    const count = await prisma.board.count();
    return count;
  },
};
