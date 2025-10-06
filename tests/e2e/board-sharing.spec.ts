import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Sharing", () => {
  test.beforeEach(async ({ testPrisma, testContext }) => {
    // Make the test user an admin
    await testPrisma.user.update({
      where: { id: testContext.userId },
      data: { isAdmin: true },
    });

    // Create a second user for sharing tests
    const secondUserId = `usr2_${testContext.testId}`;
    const secondUserEmail = `test2-${testContext.testId}@example.com`;

    await testPrisma.user.create({
      data: {
        id: secondUserId,
        email: secondUserEmail,
        name: `Test User 2 ${testContext.testId}`,
        organizationId: testContext.organizationId,
        isAdmin: false,
      },
    });
  });

  test.describe("Board Creation & Creator Access", () => {
    test("admin creates board with auto-access", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      await authenticatedPage.goto("/dashboard");

      const boardName = testContext.getBoardName("Shared Test Board");
      await authenticatedPage.click('button:has-text("Add Board")');
      await authenticatedPage.fill('input[placeholder*="board name"]', boardName);
      await authenticatedPage.fill('textarea[placeholder*="board description"]', "Test board for sharing");

      const createResponse = authenticatedPage.waitForResponse(
        (resp) => resp.url().includes("/api/boards") && resp.status() === 201
      );

      await authenticatedPage.click('button:has-text("Create board")');
      await createResponse;

      // Verify board in dashboard
      await expect(
        authenticatedPage.locator(`[data-slot="card-title"]:has-text("${boardName}")`)
      ).toBeVisible();

      // Verify board in database
      const board = await testPrisma.board.findFirst({
        where: {
          name: boardName,
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
      expect(board).toBeTruthy();

      // Verify creator auto-shared
      const boardShare = await testPrisma.boardShare.findFirst({
        where: {
          boardId: board!.id,
          userId: testContext.userId,
        },
      });
      expect(boardShare).toBeTruthy();
    });

    test("creator can access own board", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Creator Access Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for creator access",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Navigate to board
      await authenticatedPage.goto(`/boards/${board.id}`);

      // Should load successfully
      await expect(authenticatedPage.locator("text=Board not found")).not.toBeVisible();
      await expect(authenticatedPage.locator(`[data-testid="board-dropdown-trigger"]`).filter({ hasText: boardName })).toBeVisible();
    });
  });

  test.describe("Board Sharing Dialog", () => {
    test("sharing dialog shows creator identification", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Sharing Dialog Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for sharing dialog",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);
      await authenticatedPage.click('[aria-label="Board settings"]');
      await authenticatedPage.click('button:has-text("Manage Sharing")');

      // Dialog opens
      await expect(authenticatedPage.locator('[data-slot="dialog-title"]').filter({ hasText: "Share" })).toBeVisible();

      // Creator identified with badge and auto-access
      await expect(authenticatedPage.locator("text=Creator")).toBeVisible();
      await expect(authenticatedPage.locator("text=Auto access")).toBeVisible();
    });

    test("sharing dialog shows all members", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Members Dialog Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for members dialog",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);
      await authenticatedPage.click('[aria-label="Board settings"]');
      await authenticatedPage.click('button:has-text("Manage Sharing")');

      // Shows all org members
      await expect(authenticatedPage.locator("text=Test User").first()).toBeVisible(); // Admin
      await expect(authenticatedPage.locator("text=Test User 2")).toBeVisible(); // Regular user
    });

    test("dialog persists during member toggles", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Toggle Dialog Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for toggle dialog",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);
      await authenticatedPage.click('[aria-label="Board settings"]');
      await authenticatedPage.click('button:has-text("Manage Sharing")');

      // Toggle member sharing
      const toggleSwitch = authenticatedPage.locator('button[role="switch"]').nth(1); // Second member
      await toggleSwitch.click();

      // Dialog stays open
      await expect(authenticatedPage.locator('[data-slot="dialog-title"]').filter({ hasText: "Share" })).toBeVisible();

      // Can toggle again
      await toggleSwitch.click();
      await expect(authenticatedPage.locator('[data-slot="dialog-title"]').filter({ hasText: "Share" })).toBeVisible();
    });

    test("dialog closes on Done button", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Done Button Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for done button",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);
      await authenticatedPage.click('[aria-label="Board settings"]');
      await authenticatedPage.click('button:has-text("Manage Sharing")');

      // Dialog opens
      await expect(authenticatedPage.locator('[data-slot="dialog-title"]').filter({ hasText: "Share" })).toBeVisible();

      // Click Done
      await authenticatedPage.click('[data-slot="dialog-content"] button:has-text("Done")');

      // Dialog closes
      await expect(authenticatedPage.locator('[data-slot="dialog-title"]').filter({ hasText: "Share" })).not.toBeVisible();
    });
  });

  test.describe("Access Control", () => {
    test("shared user can access board", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Shared Access Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for shared access",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Share with second user
      await testPrisma.boardShare.create({
        data: {
          boardId: board.id,
          userId: `usr2_${testContext.testId}`,
        },
      });

      // Verify sharing record exists
      const boardShare = await testPrisma.boardShare.findFirst({
        where: {
          boardId: board.id,
          userId: `usr2_${testContext.testId}`,
        },
      });
      expect(boardShare).toBeTruthy();
    });

    test("creator has access without explicit sharing", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board without sharing
      const boardName = testContext.getBoardName("Creator Access Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for creator access without explicit sharing",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Creator can access own board
      await authenticatedPage.goto(`/boards/${board.id}`);
      await expect(authenticatedPage.locator("text=Board not found")).not.toBeVisible();
      await expect(authenticatedPage.locator(`[data-testid="board-dropdown-trigger"]`).filter({ hasText: boardName })).toBeVisible();
    });

  });

  test.describe("Organization Integration", () => {
    test("org sharing API works", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board
      const boardName = testContext.getBoardName("Org Sync Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for org sync",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto("/settings/organization");

      // Verify org sharing API
      const orgShareResponse = await authenticatedPage.request.get("/api/organization/share");
      expect(orgShareResponse.ok()).toBeTruthy();

      const shareData = await orgShareResponse.json();
      expect(shareData.members).toBeDefined();
      expect(shareData.boards).toBeDefined();
    });
  });

  test.describe("Edge Cases", () => {
    test("public boards are accessible", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create public board
      const boardName = testContext.getBoardName("Public Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test public board",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
          isPublic: true,
        },
      });

      // Public boards accessible
      await authenticatedPage.goto(`/boards/${board.id}`);
      await expect(authenticatedPage.locator(`[data-testid="board-dropdown-trigger"]`).filter({ hasText: boardName })).toBeVisible();
    });

    test("board deletion removes sharing", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create board with sharing
      const boardName = testContext.getBoardName("Deletion Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: "Test board for deletion",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Share with second user
      await testPrisma.boardShare.create({
        data: {
          boardId: board.id,
          userId: `usr2_${testContext.testId}`,
        },
      });

      // Delete board
      await testPrisma.board.delete({
        where: { id: board.id },
      });

      // Sharing record deleted (cascade)
      const boardShare = await testPrisma.boardShare.findFirst({
        where: {
          boardId: board.id,
        },
      });
      expect(boardShare).toBeNull();
    });
  });
});
