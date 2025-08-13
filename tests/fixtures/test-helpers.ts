import { test as base, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

interface TestFixtures {
  prisma: PrismaClient;
  testUser: {
    id: string;
    email: string;
    name: string | null;
    organizationId: string | null;
  };
  testOrganization: {
    id: string;
    name: string;
  };
}

export const test = base.extend<TestFixtures>({
  prisma: async ({}, use) => {
    const testDatabaseUrl =
      process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/gumboard_test";
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });
    await prisma.$connect();
    await use(prisma);
    await prisma.$disconnect();
  },

  testOrganization: async ({ prisma }, use) => {
    const organization = await prisma.organization.create({
      data: {
        id: "test-org-" + Math.random().toString(36).substring(7),
        name: "Test Organization",
      },
    });
    await use(organization);
    await prisma.organization.delete({ where: { id: organization.id } }).catch(() => {});
  },

  testUser: async ({ prisma, testOrganization }, use) => {
    const user = await prisma.user.create({
      data: {
        id: "test-user-" + Math.random().toString(36).substring(7),
        email: "test@example.com",
        name: "Test User",
        organizationId: testOrganization.id,
        isAdmin: true,
      },
    });
    await use(user);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  },
});

export { expect };
