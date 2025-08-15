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


  test.describe("Note Filters", () => {
    test("it should filter notes between a given date", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
  
      // Create 5 notes with a creation date in July 2025
      for (let index = 0; index < 3; index++) {
        await testPrisma.note.create({
          data: {
            color: "#fef3c7",
            boardId: board.id,
            createdBy: testContext.userId,
            createdAt: new Date("2025-07-05"),
          },
        });
      }
  
      // Create 5 notes with a creation date in June 2025
      for (let index = 0; index < 2; index++) {
        await testPrisma.note.create({
          data: {
            color: "#fef3c7",
            boardId: board.id,
            createdBy: testContext.userId,
            createdAt: new Date("2025-06-05"),
          },
        });
      }
  
      await authenticatedPage.goto(`/boards/${board.id}`);
  
      // Initially, all 10 notes should be visible
      // await expect(authenticatedPage.locator('[data-testid="note-card"]')).toHaveCount(10);
  
      // Open the filter popover
      await authenticatedPage.getByTestId("filter-popover").click();
  
      // Select the start date
      await authenticatedPage
        .getByRole("button", { name: "Pick a start date" })
        .click();
      await authenticatedPage.getByRole("button", { name: "5", exact: true }).click();
      await expect(authenticatedPage.getByRole("button", { name: "Jul 05, 2025" })).toBeVisible();
  
      // Select the end date
      await authenticatedPage.getByRole("button", { name: "Pick an end date" }).click();
      await authenticatedPage.getByRole("button", { name: "5", exact: true }).click();
      await expect(authenticatedPage.getByRole("button", { name: "Jul 05, 2025" })).toBeVisible();
  
      // Apply the filter
      await authenticatedPage.getByRole("button", { name: "Apply" }).click();
  
      // After filtering for July, only 5 notes should be visible
      await expect(authenticatedPage.locator('[data-testid="note-card"]')).toHaveCount(5);
  
      // Verify the filter tag is visible with the correct count
      await expect(authenticatedPage.getByText("1", { exact: true })).toBeVisible();
    });
  
    test("it should filter notes by author", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create a second author
      const otherUserId = `usr_other_${testContext.testId}`;
      await testPrisma.user.create({
        data: {
          id: otherUserId,
          email: `other-${testContext.testId}@example.com`,
          name: "Other User",
          organizationId: testContext.organizationId,
        },
      });
  
      const boardName = testContext.getBoardName("Test Board Author");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
  
      // Create 3 notes by the current user
      for (let index = 0; index < 3; index++) {
        await testPrisma.note.create({
          data: {
            color: "#fef3c7",
            boardId: board.id,
            createdBy: testContext.userId,
          },
        });
      }
  
      // Create 2 notes by the other user
      for (let index = 0; index < 2; index++) {
        await testPrisma.note.create({
          data: {
            color: "#fef3c7",
            boardId: board.id,
            createdBy: otherUserId,
          },
        });
      }
  
      await authenticatedPage.goto(`/boards/${board.id}`);
  
      // Initially, all 5 notes should be visible
      await expect(authenticatedPage.locator('[data-testid="note-card"]')).toHaveCount(5);
  
      // Open the filter popover
      await authenticatedPage.getByTestId("filter-popover").click();
  
      // Select the current user as the author
      await authenticatedPage.getByRole("button", { name: "Test User" }).click();
  
      // The popover should close automatically after selection
      await expect(authenticatedPage.getByRole("button", { name: "Test User" })).not.toBeVisible();
  
      // Now, only 3 notes by the current user should be visible
      await expect(authenticatedPage.locator('[data-testid="note-card"]')).toHaveCount(3);
      await expect(authenticatedPage.getByText("1", { exact: true })).toBeVisible();
  
      // Clear the filter
      await authenticatedPage.getByTestId("filter-popover").click();
      await authenticatedPage.getByRole("button", { name: "All authors" }).click();
  
      // The popover should close automatically
      await expect(authenticatedPage.getByRole("button", { name: "All authors" })).not.toBeVisible();
  
      // All 5 notes should be visible again
      await expect(authenticatedPage.locator('[data-testid="note-card"]')).toHaveCount(5);
      await expect(authenticatedPage.getByText("1", { exact: true })).not.toBeVisible();
    });
  });
});
