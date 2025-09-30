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
    await authenticatedPage.fill('textarea[placeholder*="board description"]', boardDescription);
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

  test("should prevent creating boards with whitespace-only names", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.getByRole("button", { name: "Add Board" }).click();

    const nameInput = authenticatedPage.locator('input[placeholder*="board name"]');
    const createButton = authenticatedPage.getByRole("button", { name: "Create board" });

    await nameInput.fill("   ");
    await createButton.click();

    await expect(authenticatedPage.locator("text=Board name cannot be empty")).toBeVisible();

    await nameInput.fill("\t  \t ");
    await createButton.click();

    await expect(authenticatedPage.locator("text=Board name cannot be empty")).toBeVisible();

    await expect(authenticatedPage.locator('text="Create New Board"')).toBeVisible();
  });

  test("should trim whitespace from board names", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/dashboard");

    const boardName = testContext.getBoardName("Test Board");
    const nameWithWhitespace = `  ${boardName}  `;

    await authenticatedPage.getByRole("button", { name: "Add Board" }).click();

    const nameInput = authenticatedPage.locator('input[placeholder*="board name"]');
    await nameInput.fill(nameWithWhitespace);

    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes("/api/boards") && resp.status() === 201
    );

    await authenticatedPage.getByRole("button", { name: "Create board" }).click();
    await responsePromise;

    const board = await testPrisma.board.findFirst({
      where: {
        name: boardName,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    expect(board).toBeTruthy();
    expect(board?.name).toBe(boardName);
    expect(board?.name).not.toBe(nameWithWhitespace);
  });

  test.describe("Board Not Found", () => {
    test("should display not found page for invalid board ID", async ({ authenticatedPage }) => {
      const invalidBoardId = "invalid-board-id";

      await authenticatedPage.goto(`/boards/${invalidBoardId}`);

      // Should show the not found message
      await expect(authenticatedPage.locator("text=Board not found")).toBeVisible();

      // Should show the "Go to Gumboard" button
      const homeButton = authenticatedPage.getByRole("link", { name: "Go to Gumboard" });
      await expect(homeButton).toBeVisible();

      // Verify the button links to home page
      await expect(homeButton).toHaveAttribute("href", "/");
    });

    test("should not show not found for special board IDs", async ({ authenticatedPage }) => {
      // Test that special board IDs like "all-notes" and "archive" don't show not found
      await authenticatedPage.goto("/boards/all-notes");

      // Should not show the not found message
      await expect(authenticatedPage.locator("text=Board not found")).not.toBeVisible();

      // Navigate to archive
      await authenticatedPage.goto("/boards/archive");

      // Should not show the not found message
      await expect(authenticatedPage.locator("text=Board not found")).not.toBeVisible();
    });

    test("should show not found page for invalid public board", async ({ page }) => {
      await page.goto(`/public/boards/non-existent-board`);

      // Verify we're on the not found page
      await expect(page.locator("text=Board not found")).toBeVisible();
      // Should show the descriptive message for inaccessible boards
      await expect(
        page.locator("text=This board doesn't exist or is not publicly accessible.")
      ).toBeVisible();

      // Click the "Go to Gumboard" button
      const homeButton = page.getByRole("link", { name: "Go to Gumboard" });
      await homeButton.click();

      // Wait for navigation to complete
      await page.waitForURL("/");

      // Should navigate to the home page
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("Board Selector Dropdown", () => {
    test("should display all created boards and navigate to the clicked board", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("A test board"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      const boardName2 = testContext.getBoardName("Test Board 2");
      await testPrisma.board.create({
        data: {
          name: boardName2,
          description: testContext.prefix("A test board"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
      await authenticatedPage.goto("/boards/all-notes");

      await authenticatedPage.locator("[data-testid='board-dropdown-trigger']").click();

      await expect(authenticatedPage.locator(`[data-board-name="${boardName}"]`)).toBeVisible();
      await expect(authenticatedPage.locator(`[data-board-name="${boardName2}"]`)).toBeVisible();

      await authenticatedPage.locator(`[data-board-id="${board.id}"]`).click();
      await expect(authenticatedPage).toHaveURL(`/boards/${board.id}`);
    });

    test("should go to all notes page on clicking All notes button", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("A test board"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
      authenticatedPage.goto(`/boards/${board.id}`);

      await authenticatedPage.locator("[data-testid='board-dropdown-trigger']").click();

      await authenticatedPage.getByText("All notes").click();
      await expect(authenticatedPage).toHaveURL("/boards/all-notes");
    });

    test("should go to archive page on clicking Archive button", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("A test board"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
      authenticatedPage.goto(`/boards/${board.id}`);

      await authenticatedPage.locator("[data-testid='board-dropdown-trigger']").click();

      await authenticatedPage.getByText("All archived").click();
      await expect(authenticatedPage).toHaveURL("/boards/archive");
    });
  });
});
