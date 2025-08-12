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

export { expect };
