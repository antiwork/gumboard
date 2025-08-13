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

  test("should edit an existing board", async ({ authenticatedPage, testContext, testPrisma }) => {
    const boardName = testContext.getBoardName("Original Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: "Original description",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await boardCard.getByRole("button", { name: "Edit" }).click();

    const newName = testContext.getBoardName("Updated Board");
    await authenticatedPage.fill('input[name="name"]', newName);
    await authenticatedPage.fill('input[name="description"]', "Updated description");

    await authenticatedPage.click('button:has-text("Update board")');

    await expect(
      authenticatedPage.locator(`[data-slot="card-title"]:has-text("${newName}")`)
    ).toBeVisible();

    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });

    expect(updatedBoard?.name).toBe(newName);
    expect(updatedBoard?.description).toBe("Updated description");
  });

  test("should delete a board", async ({ authenticatedPage, testContext, testPrisma }) => {
    const boardName = testContext.getBoardName("Board to Delete");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: "Will be deleted",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await boardCard.getByRole("button", { name: "Delete" }).click();

    await authenticatedPage.getByRole("button", { name: "Delete board" }).click();

    await expect(boardCard).not.toBeVisible();

    const deletedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });

    expect(deletedBoard).toBeNull();
  });
});
