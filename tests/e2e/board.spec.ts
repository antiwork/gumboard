import { test, dbUtils, expect } from "../fixtures/test-helpers";
import { TestUser, TestOrganization } from "../fixtures/database-api";

test.describe("Board Management", () => {
  let testUser: TestUser;
  let testOrg: TestOrganization;

  test.beforeEach(async ({ page, dbApi }) => {
    // Create test data
    testUser = await dbApi.createTestUser();
    testOrg = await dbApi.createTestOrganization();
    await dbApi.connectUserToOrganization(testUser.id, testOrg.id);

    // Setup all mocks
    await dbApi.setupAllMocks(page, testUser, testOrg);
  });

  test.afterEach(async ({ dbApi }) => {
    await dbApi.cleanupBoardsForOrganization(testOrg.id);
  });

  test("should verify database state when board is created", async ({ page, prisma, dbApi }) => {
    // Arrange: Get initial state
    const initialBoardCount = await dbUtils.getBoardCount(prisma);

    // Act: Create board using DatabaseAPI
    await dbApi.createBoard({
      name: "Test Board",
      description: "Test board description",
      createdBy: testUser.id,
      organizationId: testOrg.id,
    });

    // Assert: Verify database state changed
    const finalBoardCount = await dbUtils.getBoardCount(prisma);
    expect(finalBoardCount).toBe(initialBoardCount + 1);

    const boardInDb = await dbUtils.verifyBoardExists(prisma, "Test Board");
    expect(boardInDb?.name).toBe("Test Board");
    expect(boardInDb?.description).toBe("Test board description");
    expect(boardInDb?.createdBy).toBe(testUser.id);
    expect(boardInDb?.organizationId).toBe(testOrg.id);

    // Verify UI shows the board
    await page.goto("/dashboard");
    await page.reload();
    
    await expect(page.locator('[data-slot="card-title"]:has-text("Test Board")')).toBeVisible();
  });

  test("should display empty state when no boards exist", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("text=No boards yet")).toBeVisible();
    await expect(page.locator('button:has-text("Create your first board")')).toBeVisible();
  });

  test("should validate board creation form", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Add Board" }).click();
    const nameInput = page.locator('input[placeholder*="board name"]');
    const createButton = page.getByRole("button", { name: "Create board" });
    await createButton.click();
    await expect(nameInput).toBeFocused();
    await page.fill('input[placeholder*="board name"]', "Test Board");
    await expect(createButton).toBeEnabled();
  });
});
