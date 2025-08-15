import { test, expect } from "../fixtures/test-helpers";

test.describe("Search Functionality", () => {
  test("should maintain scroll position at top when clearing search", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Search Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const notes = [];
    for (let i = 1; i <= 10; i++) {
      const note = await testPrisma.note.create({
        data: {
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        },
      });

      await testPrisma.checklistItem.create({
        data: {
          content: testContext.prefix(`Test item ${i}`),
          checked: false,
          order: 0,
          noteId: note.id,
        },
      });

      notes.push(note);
    }

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 1")}`)
    ).toBeVisible();

    const searchInput = authenticatedPage.locator('input[placeholder="Search notes..."]');
    await searchInput.fill("Test item 5");

    await authenticatedPage.waitForTimeout(500);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 5")}`)
    ).toBeVisible();

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 1")}`)
    ).not.toBeVisible();

    await searchInput.clear();

    await authenticatedPage.waitForTimeout(2000);
    await expect(searchInput).toHaveValue("");

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 1")}`)
    ).toBeVisible({ timeout: 10000 });
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 5")}`)
    ).toBeVisible({ timeout: 10000 });

    const finalScrollY = await authenticatedPage.evaluate(() => window.scrollY);

    expect(finalScrollY).toBeLessThanOrEqual(100);
  });

  test("should filter notes correctly by search term", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Filter Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note1 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Buy groceries"),
        checked: false,
        order: 0,
        noteId: note1.id,
      },
    });

    const note2 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Meeting notes"),
        checked: false,
        order: 0,
        noteId: note2.id,
      },
    });

    const note3 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Project planning"),
        checked: false,
        order: 0,
        noteId: note3.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Buy groceries")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Meeting notes")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Project planning")}`)
    ).toBeVisible();
    const searchInput = authenticatedPage.locator('input[placeholder="Search notes..."]');
    await searchInput.fill("meeting");

    await authenticatedPage.waitForTimeout(500);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Meeting notes")}`)
    ).toBeVisible();

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Buy groceries")}`)
    ).not.toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Project planning")}`)
    ).not.toBeVisible();

    await searchInput.fill("");
    await authenticatedPage.waitForTimeout(500);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Buy groceries")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Meeting notes")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Project planning")}`)
    ).toBeVisible();
  });

  test("should search by author name", async ({ authenticatedPage, testContext, testPrisma }) => {
    const boardName = testContext.getBoardName("Author Search Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("User task"),
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("User task")}`)
    ).toBeVisible();

    const searchInput = authenticatedPage.locator('input[placeholder="Search notes..."]');

    await searchInput.fill("test");
    await authenticatedPage.waitForTimeout(500);
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("User task")}`)
    ).toBeVisible();
  });
});
