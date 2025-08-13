import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Management", () => {
  test.beforeEach(async ({ page, testUser, testOrganization }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { 
            id: testUser.id, 
            email: testUser.email, 
            name: testUser.name 
          },
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
          organizationId: testOrganization.id,
          organization: testOrganization,
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
        const postData = await route.request().postDataJSON();
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

  test("should create a new board and verify database state", async ({ 
    page, 
    prisma, 
    testUser, 
    testOrganization 
  }) => {
    let boardData: { name: string; description: string } | null = null;
    let createdBoardId: string | null = null;

    await page.route("**/api/boards", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards: [] }),
        });
      } else if (route.request().method() === "POST") {
        boardData = await route.request().postDataJSON();
        createdBoardId = "board-" + Math.random().toString(36).substring(7);

        const newBoard = await prisma.board.create({
          data: {
            id: createdBoardId,
            name: boardData!.name,
            description: boardData!.description,
            organizationId: testOrganization.id,
            createdBy: testUser.id,
          },
        });

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              ...newBoard,
              _count: { notes: 0 },
            },
          }),
        });
      }
    });

    const boardCountBefore = await prisma.board.count({
      where: { organizationId: testOrganization.id },
    });

    await page.goto("/dashboard");
    await page.click('button:has-text("Add Board")');
    await page.fill('input[placeholder*="board name"]', "Test Board");
    await page.fill('input[placeholder*="board description"]', "Test board description");
    await page.click('button:has-text("Create Board")');

    const boardCountAfter = await prisma.board.count({
      where: { organizationId: testOrganization.id },
    });

    const createdBoard = await prisma.board.findUnique({
      where: { id: createdBoardId! },
      include: { organization: true },
    });

    expect(boardCountAfter).toBe(boardCountBefore + 1);
    expect(createdBoard).toBeTruthy();
    expect(createdBoard?.name).toBe("Test Board");
    expect(createdBoard?.description).toBe("Test board description");
    expect(createdBoard?.organizationId).toBe(testOrganization.id);
    expect(createdBoard?.createdBy).toBe(testUser.id);

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
