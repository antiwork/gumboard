import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Name Link Functionality", () => {
  test("should display board names as clickable links in All notes view", async ({ authenticatedPage, testContext, testPrisma }) => {
    const board1 = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 1"),
        description: "First test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const board2 = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 2"),
        description: "Second test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.note.create({
      data: {
        content: testContext.prefix("Note from Board 1"),
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board1.id,
      },
    });

    await testPrisma.note.create({
      data: {
        content: testContext.prefix("Note from Board 2"),
        color: "#dcfce7",
        createdBy: testContext.userId,
        boardId: board2.id,
      },
    });

    await authenticatedPage.goto("/boards/all-notes");

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 1")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 2")}`)
    ).toBeVisible();

    await expect(authenticatedPage.locator(`text=${board1.name}`)).toBeVisible();
    await expect(authenticatedPage.locator(`text=${board2.name}`)).toBeVisible();

    const boardLink1 = authenticatedPage.locator("a", { hasText: board1.name });
    const boardLink2 = authenticatedPage.locator("a", { hasText: board2.name });

    await expect(boardLink1).toBeVisible();
    await expect(boardLink2).toBeVisible();

    await expect(boardLink1).toHaveAttribute("href", `/boards/${board1.id}`);
    await expect(boardLink2).toHaveAttribute("href", `/boards/${board2.id}`);
  });

  test("should navigate to correct board when clicking board name link", async ({ authenticatedPage, testContext, testPrisma }) => {
    const board1 = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 1"),
        description: "First test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const board2 = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 2"),
        description: "Second test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create notes in each board
    await testPrisma.note.create({
      data: {
        content: testContext.prefix("Note from Board 1"),
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board1.id,
      },
    });

    await testPrisma.note.create({
      data: {
        content: testContext.prefix("Note from Board 2"),
        color: "#dcfce7",
        createdBy: testContext.userId,
        boardId: board2.id,
      },
    });

    await authenticatedPage.goto("/boards/all-notes");

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState("networkidle");

    // Wait for both notes to be visible before proceeding
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 1")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 2")}`)
    ).toBeVisible();

    // Test clicking first board link
    const board1Link = authenticatedPage.locator(`a[href="/boards/${board1.id}"]`).first();
    await expect(board1Link).toBeVisible();

    // Click and wait for navigation
    const waitForBoard1 = authenticatedPage.waitForURL(`/boards/${board1.id}`, {
      waitUntil: "domcontentloaded",
    });
    await board1Link.click();
    await waitForBoard1;

    await expect(authenticatedPage).toHaveURL(`/boards/${board1.id}`);

    // Navigate back to all notes
    await authenticatedPage.goto("/boards/all-notes");

    // Wait for page to be fully loaded
    await authenticatedPage.waitForLoadState("networkidle");

    // Wait for both notes to be visible again
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 1")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 2")}`)
    ).toBeVisible();

    // Test clicking second board link
    const board2Link = authenticatedPage.locator(`a[href="/boards/${board2.id}"]`).first();
    await expect(board2Link).toBeVisible();

    // Click and wait for navigation
    const waitForBoard2 = authenticatedPage.waitForURL(`/boards/${board2.id}`, {
      waitUntil: "domcontentloaded",
    });
    await board2Link.click();
    await waitForBoard2;

    await expect(authenticatedPage).toHaveURL(`/boards/${board2.id}`);
  });

  test("should maintain styling for board name links", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 1"),
        description: "First test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create a note in the board
    await testPrisma.note.create({
      data: {
        content: testContext.prefix("Note from Board 1"),
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto("/boards/all-notes");

    // Wait for the note to be visible first
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Note from Board 1")}`)
    ).toBeVisible();

    // Use a more specific selector to target the exact board link
    const boardLink = authenticatedPage.locator(`a[href="/boards/${board.id}"]`);

    await expect(boardLink).toHaveClass(/text-xs/);
    await expect(boardLink).toHaveClass(/text-blue-600/);
    await expect(boardLink).toHaveClass(/font-medium/);
    await expect(boardLink).toHaveClass(/truncate/);

    await expect(boardLink).toHaveClass(/hover:opacity-100/);
    await expect(boardLink).toHaveClass(/transition-opacity/);
  });
});
