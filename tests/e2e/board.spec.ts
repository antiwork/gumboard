import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Management", () => {
  test("should create a new board and verify database state", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/dashboard");
    const boardName = testContext.getBoardName("Test Board");
    const boardDescription = "Test board description";

    await authenticatedPage.click('button:has-text("Add Board")');
    await authenticatedPage.fill('input[placeholder*="board name"]', boardName);
    await authenticatedPage.fill('input[placeholder*="board description"]', boardDescription);
    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes("/api/boards") && resp.status() === 201
    );

    await authenticatedPage.click('button:has-text("Create Board")');
    await responsePromise;

    await expect(
      authenticatedPage.locator(`[data-slot="card-title"]:has-text("${boardName}")`)
    ).toBeVisible();
    const board = await testPrisma.board.findFirst({
      where: {
        name: boardName,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    expect(board).toBeTruthy();
    expect(board?.name).toBe(boardName);
    expect(board?.description).toBe(boardDescription);
    expect(board?.createdBy).toBe(testContext.userId);
  });

  test("should display empty state when no boards exist", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
    await expect(
      authenticatedPage.locator('button:has-text("Create your first board")')
    ).toBeVisible();
  });

  test("should validate board creation form", async ({ authenticatedPage, testContext }) => {
    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.getByRole("button", { name: "Add Board" }).click();

    const nameInput = authenticatedPage.locator('input[placeholder*="board name"]');
    const createButton = authenticatedPage.getByRole("button", { name: "Create board" });
    await createButton.click();
    await expect(nameInput).toBeFocused();
    const boardName = testContext.getBoardName("Test Board");
    await authenticatedPage.fill('input[placeholder*="board name"]', boardName);
    await expect(createButton).toBeEnabled();
  });
});
