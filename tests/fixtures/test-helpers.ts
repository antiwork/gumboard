import { test as base, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

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

// Test helper functions
const prisma = new PrismaClient();

export async function createTestUser(email: string) {
  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      emailVerified: new Date(),
    }
  });

  // Create session
  const sessionToken = nanoid();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    }
  });

  return { user, sessionToken };
}

export async function createTestBoard(userId: string, name: string) {
  // First create an organization for the user if they don't have one
  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  let organizationId = user.organizationId;

  // Create organization if user doesn't have one
  if (!organizationId) {
    const organization = await prisma.organization.create({
      data: {
        name: `${user.email || 'Test'} Organization`,
      }
    });

    // Update user with organizationId
    await prisma.user.update({
      where: { id: userId },
      data: { organizationId: organization.id }
    });

    organizationId = organization.id;
  }

  return await prisma.board.create({
    data: {
      name,
      organizationId,
      createdBy: userId,
    }
  });
}
