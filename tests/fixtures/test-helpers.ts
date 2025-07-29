import { test as base, expect, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

// Extend basic test by providing a "prisma" fixture
export const test = base.extend<{ prisma: PrismaClient }>({
  prisma: async ({ }, use: (r: PrismaClient) => Promise<void>) => {
    const prisma = new PrismaClient();
    await use(prisma);
    await prisma.$disconnect();
  },
});

export { expect };

// Helper to clean up test data
export async function cleanupTestData(prisma: PrismaClient, userEmail: string) {
  try {
    // Delete user and all related data (cascading)
    await prisma.user.deleteMany({
      where: { email: userEmail }
    });
  } catch (error) {
    console.log('Cleanup error (expected):', error);
  }
}

// Helper to create test user with organization
export async function createTestUser(prisma: PrismaClient, email: string, name: string) {
  try {
    // First clean up any existing user
    await cleanupTestData(prisma, email);

    // Create organization first
    const org = await prisma.organization.create({
      data: {
        name: `Test Org for ${name}`,
      }
    });

    return await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: new Date(),
        organizationId: org.id,
        isAdmin: true,
      }
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  }
}

// Helper to check if page requires authentication
export async function isAuthenticationRequired(page: Page): Promise<boolean> {
  return page.url().includes('/auth/signin') || page.url().includes('/login');
}