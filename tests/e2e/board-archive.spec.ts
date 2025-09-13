import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Archive Functionality", () => {
  test("should display Archived boards link on dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");
    await expect(authenticatedPage.getByRole("heading", { name: "Your Boards" })).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole("link", { name: "Archived boards" })).toBeVisible();
  });

  test("should navigate to Archived boards from dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
        archivedAt: new Date(),
      },
    });

    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.click('[href="/boards/archived-boards"]');

    await expect(authenticatedPage).toHaveURL("/boards/archived-boards");

    await expect(authenticatedPage.getByText(testContext.getBoardName("Test Board"))).toBeVisible();
  });

  test("should archive a board and remove it from dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board to Archive"),
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click('button[aria-haspopup="dialog"]');

    await authenticatedPage.click('button:has-text("Archive board")');

    await expect(authenticatedPage).toHaveURL("/dashboard");

    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Test Board to Archive"))
    ).not.toBeVisible();

    const archivedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(archivedBoard?.archivedAt).toBeTruthy();
  });

  test("should show archived boards in archived boards view", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Archived Board"),
        description: testContext.prefix("An archived board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
        archivedAt: new Date(),
      },
    });

    await authenticatedPage.goto("/boards/archived-boards");

    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Archived Board"))
    ).toBeVisible();

    await expect(authenticatedPage.getByRole("button", { name: "Unarchive" })).toBeVisible();
  });

  test("should unarchive a board and restore it to dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Board to Unarchive"),
        description: testContext.prefix("A board to unarchive"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
        archivedAt: new Date(),
      },
    });

    await authenticatedPage.goto("/boards/archived-boards");

    await authenticatedPage.click('button:has-text("Unarchive")');

    await expect(authenticatedPage).toHaveURL("/dashboard");

    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Board to Unarchive"))
    ).toBeVisible();

    const unarchivedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(unarchivedBoard?.archivedAt).toBe(null);
  });

  test("should show empty state when no archived boards exist", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const archivedBoardCount = await testPrisma.board.count({
      where: {
        organizationId: testContext.organizationId,
        archivedAt: { not: null },
      },
    });
    expect(archivedBoardCount).toBe(0);

    await authenticatedPage.goto("/boards/archived-boards");

    await expect(authenticatedPage.getByText("No archived boards")).toBeVisible();
    await expect(authenticatedPage.getByText("Archived boards will appear here")).toBeVisible();
  });

  test("should not show archive button for special boards", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/boards/archive");
    await expect(authenticatedPage.locator('button:has-text("Archive board")')).not.toBeVisible();

    await authenticatedPage.goto("/boards/all-notes");
    await expect(authenticatedPage.locator('button:has-text("Archive board")')).not.toBeVisible();

    await authenticatedPage.goto("/boards/archived-boards");
    await expect(authenticatedPage.locator('button:has-text("Archive board")')).not.toBeVisible();
  });

  test("should complete full archive-unarchive workflow", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Workflow Test Board"),
        description: testContext.prefix("A board for workflow testing"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");
    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Workflow Test Board"))
    ).toBeVisible();

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.click('button[aria-haspopup="dialog"]');
    await authenticatedPage.click('button:has-text("Archive board")');

    await expect(authenticatedPage).toHaveURL("/dashboard");
    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Workflow Test Board"))
    ).not.toBeVisible();

    await authenticatedPage.goto("/boards/archived-boards");
    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Workflow Test Board"))
    ).toBeVisible();

    await authenticatedPage.click('button:has-text("Unarchive")');

    await expect(authenticatedPage).toHaveURL("/dashboard");
    await expect(
      authenticatedPage.getByText(testContext.getBoardName("Workflow Test Board"))
    ).toBeVisible();

    const finalBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(finalBoard?.archivedAt).toBe(null);
  });
});
