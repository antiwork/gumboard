import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Layout", () => {
  test("displays notes in responsive columns on desktop", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board for layout test"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const notes = [];
    for (let i = 0; i < 6; i++) {
      const note = await testPrisma.note.create({
        data: {
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        },
      });

      await testPrisma.checklistItem.create({
        data: {
          id: testContext.prefix(`item-${i}`),
          content: testContext.prefix(`Note ${i + 1} content`),
          checked: false,
          order: 0,
          noteId: note.id,
        },
      });
      notes.push(note);
    }

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    const noteCards = authenticatedPage.locator('[data-testid="note-card"]');
    await expect(noteCards).toHaveCount(6);

    const layoutContainer = authenticatedPage.locator(".p-3.md\\:p-5");
    await expect(layoutContainer).toBeVisible();

    const columns = authenticatedPage.locator(".flex-1.flex.flex-col.gap-4");
    await expect(columns).toHaveCount(3);
  });

  test("displays notes in single column on mobile", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board for layout test"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    for (let i = 0; i < 3; i++) {
      const note = await testPrisma.note.create({
        data: {
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        },
      });

      await testPrisma.checklistItem.create({
        data: {
          id: testContext.prefix(`item-${i}`),
          content: testContext.prefix(`Note ${i + 1} content`),
          checked: false,
          order: 0,
          noteId: note.id,
        },
      });
    }

    await authenticatedPage.setViewportSize({ width: 375, height: 667 });
    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    const noteCards = authenticatedPage.locator('[data-testid="note-card"]');
    await expect(noteCards).toHaveCount(3);

    const columns = authenticatedPage.locator(".flex-1.flex.flex-col.gap-4");
    await expect(columns).toHaveCount(1);
  });

  test("maintains layout when filtering notes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board for layout test"),
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
        id: testContext.prefix("item-1"),
        content: testContext.prefix("Important task"),
        checked: false,
        order: 0,
        noteId: note1.id,
      },
    });

    const note2 = await testPrisma.note.create({
      data: {
        color: "#fbbf24",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        id: testContext.prefix("item-2"),
        content: testContext.prefix("Regular task"),
        checked: false,
        order: 0,
        noteId: note2.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForLoadState("networkidle");

    const noteCards = authenticatedPage.locator('[data-testid="note-card"]');
    await expect(noteCards).toHaveCount(2);

    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill("Important");
    await searchInput.press("Enter");

    await expect(noteCards).toHaveCount(1);
    await expect(authenticatedPage.getByText("Important task")).toBeVisible();

    const layoutContainer = authenticatedPage.locator(".p-3.md\\:p-5");
    await expect(layoutContainer).toBeVisible();
  });
});
