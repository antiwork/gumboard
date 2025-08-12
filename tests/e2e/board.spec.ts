import { test, expect, dbHelpers, generateTestIds } from "../fixtures/test-helpers";

test.describe("Board Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "test-user", email: "test@example.com", name: "Test User" },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user",
          email: "test@example.com",
          name: "Test User",
          isAdmin: true,
          organization: {
            id: "test-org",
            name: "Test Organization",
            members: [],
          },
        }),
      });
    });

    await page.route("**/api/boards", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards: [] }),
        });
      } else if (route.request().method() === "POST") {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "new-board-id",
              name: postData.name,
              description: postData.description,
              createdBy: "test-user",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              _count: {
                notes: 0,
              },
            },
          }),
        });
      }
    });
  });

  test("should create a new board and verify database state", async ({ page, prisma }) => {
    let boardCreated = false;
    let boardData: { name: string; description: string } | null = null;
    const { testBoardId, testUserId, testOrgId, testEmail } = generateTestIds();

    // Setup test data
    await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: {
        id: testOrgId,
        name: "Test Organization",
      },
    });

    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: testEmail,
        name: "Test User",
        organizationId: testOrgId,
        isAdmin: true,
      },
    });

    await page.route("**/api/boards", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards: [] }),
        });
      } else if (route.request().method() === "POST") {
        boardCreated = true;
        boardData = await route.request().postDataJSON();

        // Create actual board in database
        await prisma.board.create({
          data: {
            id: testBoardId,
            name: boardData!.name,
            description: boardData!.description,
            createdBy: testUserId,
            organizationId: testOrgId,
          },
        });

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: testBoardId,
              name: boardData!.name,
              description: boardData!.description,
              createdBy: testUserId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              _count: {
                notes: 0,
              },
            },
          }),
        });
      }
    });

    await page.goto("/dashboard");

    await page.click('button:has-text("Add Board")');

    await page.fill('input[placeholder*="board name"]', "Test Board");
    await page.fill('input[placeholder*="board description"]', "Test board description");

    await page.click('button:has-text("Create Board")');

    expect(boardCreated).toBe(true);
    expect(boardData).not.toBeNull();
    expect(boardData!.name).toBe("Test Board");
    expect(boardData!.description).toBe("Test board description");

    await expect(page.locator('[data-slot="card-title"]:has-text("Test Board")')).toBeVisible();

    // Verify database state
    const createdBoard = await dbHelpers.verifyBoardExists(prisma, testBoardId);
    expect(createdBoard).toBeTruthy();
    expect(createdBoard?.name).toBe("Test Board");
    expect(createdBoard?.description).toBe("Test board description");
    expect(createdBoard?.createdBy).toBe(testUserId);
    expect(createdBoard?.organizationId).toBe(testOrgId);
    expect(createdBoard?._count?.notes).toBe(0);

    // Cleanup specific test data
    await prisma.board.deleteMany({ where: { id: testBoardId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
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
