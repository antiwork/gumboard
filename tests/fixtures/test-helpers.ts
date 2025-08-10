import { test as base, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

interface TestFixtures {
  prisma: PrismaClient;
}

// Helper types for multi-organization testing
export interface MockOrganization {
  id: string;
  name: string;
  slackWebhookUrl?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockUserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt?: string;
  updatedAt?: string;
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  organizations: MockUserOrganization[];
}

// Helper functions for creating mock data
export function createMockOrganization(overrides: Partial<MockOrganization> = {}): MockOrganization {
  return {
    id: `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Organization',
    slackWebhookUrl: 'https://hooks.slack.com/test-webhook',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockUserOrganization(
  userId: string,
  organizationId: string,
  role: 'ADMIN' | 'MEMBER' = 'MEMBER',
  overrides: Partial<MockUserOrganization> = {}
): MockUserOrganization {
  return {
    id: `user-org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    organizationId,
    role,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
    organizations: [],
    ...overrides,
  };
}

// Helper function to create a user with organization membership
export function createMockUserWithOrganization(
  organization: MockOrganization,
  role: 'ADMIN' | 'MEMBER' = 'MEMBER',
  userOverrides: Partial<MockUser> = {}
): MockUser {
  const user = createMockUser(userOverrides);
  const userOrg = createMockUserOrganization(user.id, organization.id, role);
  user.organizations = [userOrg];
  return user;
}

// Helper function to create multiple organizations for a user
export function createMockUserWithMultipleOrganizations(
  organizations: MockOrganization[],
  roles: ('ADMIN' | 'MEMBER')[] = [],
  userOverrides: Partial<MockUser> = {}
): MockUser {
  const user = createMockUser(userOverrides);
  user.organizations = organizations.map((org, index) => 
    createMockUserOrganization(user.id, org.id, roles[index] || 'MEMBER')
  );
  return user;
}

// Helper function to get current organization from user
export function getCurrentOrganization(user: MockUser, organizationId?: string): MockUserOrganization | null {
  if (organizationId) {
    return user.organizations.find(org => org.organizationId === organizationId) || null;
  }
  return user.organizations[0] || null;
}

// Helper function to check if user is admin of organization
export function isUserAdminOfOrganization(user: MockUser, organizationId: string): boolean {
  const userOrg = user.organizations.find(org => org.organizationId === organizationId);
  return userOrg?.role === 'ADMIN';
}

export const test = base.extend<TestFixtures>({
  prisma: async ({}, use: (r: PrismaClient) => Promise<void>) => {
    const prisma = new PrismaClient();
    await use(prisma);
    await prisma.$disconnect();
  },
});

export { expect };
