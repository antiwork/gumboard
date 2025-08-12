import { Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export interface TestUser {
  id: string;
  email: string;
  name: string | null;
}

export interface TestOrganization {
  id: string;
  name: string;
}

export class DatabaseAPI {
  constructor(private prisma: PrismaClient) {}

  async createTestUser(email: string = "test@example.com"): Promise<TestUser> {
    return await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: "Test User",
        isAdmin: true,
      },
    });
  }

  async createTestOrganization(id: string = "test-org-id"): Promise<TestOrganization> {
    return await this.prisma.organization.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: "Test Organization",
      },
    });
  }

  async connectUserToOrganization(userId: string, organizationId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { organizationId },
    });
  }

  async createBoard(data: {
    name: string;
    description: string;
    createdBy: string;
    organizationId: string;
  }) {
    return await this.prisma.board.create({
      data: {
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        organizationId: data.organizationId,
      },
    });
  }

  async getBoardsForOrganization(organizationId: string) {
    return await this.prisma.board.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async cleanupBoardsForOrganization(organizationId: string): Promise<void> {
    await this.prisma.board.deleteMany({
      where: { organizationId },
    });
  }

  // Mock Setup Functions
  async setupAuthMocks(page: Page, testUser: TestUser, testOrg: TestOrganization): Promise<void> {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: testUser.id, email: testUser.email, name: testUser.name },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          isAdmin: true,
          organization: {
            id: testOrg.id,
            name: testOrg.name,
            members: [],
          },
        }),
      });
    });
  }

  async setupBoardsMock(page: Page, testOrg: TestOrganization): Promise<void> {
    await page.route("**/api/boards", async (route) => {
      
      if (route.request().method() === "GET") {
        const boards = await this.getBoardsForOrganization(testOrg.id);
        
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards }),
        });
      } else if (route.request().method() === "POST") {
        const response = await route.fetch();
        const responseText = await response.text();
        
        await route.fulfill({
          status: response.status(),
          body: responseText,
          headers: response.headers(),
        });
      }
    });
  }

  async setupAllMocks(page: Page, testUser: TestUser, testOrg: TestOrganization): Promise<void> {
    await this.setupAuthMocks(page, testUser, testOrg);
    await this.setupBoardsMock(page, testOrg);
  }
}
