import { test, expect } from "../fixtures/test-helpers";

test.describe("Search Functionality", () => {
  test("should maintain visual stability when clearing search", async ({
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

    const getNotesPositions = async () => {
      const positions: { text: string; x: number; y: number }[] = [];
      for (let i = 1; i <= 3; i++) {
        const element = authenticatedPage.locator(`text=${testContext.prefix(`Test item ${i}`)}`);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            positions.push({
              text: testContext.prefix(`Test item ${i}`),
              x: box.x,
              y: box.y,
            });
          }
        }
      }
      return positions;
    };

    const initialPositions = await getNotesPositions();

    const searchInput = authenticatedPage.locator('input[placeholder="Search notes..."]');
    await searchInput.fill("Test item 5");

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 5")}`)
    ).toBeVisible();

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 1")}`)
    ).not.toBeVisible();

    await searchInput.clear();

    await expect(searchInput).toHaveValue("");

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 1")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item 5")}`)
    ).toBeVisible();

    const finalPositions = await getNotesPositions();

    expect(finalPositions.length).toBe(initialPositions.length);

    for (let i = 0; i < finalPositions.length; i++) {
      const initial = initialPositions[i];
      const final = finalPositions[i];

      expect(final.text).toBe(initial.text);
      expect(Math.abs(final.x - initial.x)).toBeLessThan(100);
      expect(Math.abs(final.y - initial.y)).toBeLessThan(200);
    }
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
  });

  test("should only search checklist content, not author names", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Search Content Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for content search"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create a note with content that matches the author name
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

    // Create another note with different content
    const note2 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Meeting with ansh"),
        checked: false,
        order: 0,
        noteId: note2.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Both notes should be visible initially
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Buy groceries")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Meeting with ansh")}`)
    ).toBeVisible();

    // Search for "ansh" - should only show note with "Meeting with ansh"
    const searchInput = authenticatedPage.locator('input[placeholder="Search notes..."]');
    await searchInput.fill("ansh");
    await searchInput.press("Enter");

    // Wait for search to complete
    await authenticatedPage.waitForTimeout(1000);

    // Note with "Buy groceries" should NOT be visible (no "ansh" in content)
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Buy groceries")}`)
    ).not.toBeVisible();

    // Note with "Meeting with ansh" should be visible (contains "ansh")
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Meeting with ansh")}`)
    ).toBeVisible();

    // Clear search
    await searchInput.clear();
    await searchInput.press("Enter");
    await authenticatedPage.waitForTimeout(1000);

    // Both notes should be visible again
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Buy groceries")}`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Meeting with ansh")}`)
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
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("User task")}`)
    ).toBeVisible();
  });
});
