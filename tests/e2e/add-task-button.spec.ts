import { test, expect } from "../fixtures/test-helpers";

test.describe("Add Task Button", () => {
  test("should display new item input for all notes when user is authorized", async ({
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

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: testContext.prefix("Existing task"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    const regularNote = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Regular note content"),
        checked: false,
        order: 0,
        noteId: regularNote.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)
    ).toBeVisible();

    const newItemInputs = authenticatedPage.getByTestId("new-item");
    await expect(newItemInputs).toHaveCount(2);

    const firstNewItemInput = newItemInputs.first();
    await expect(firstNewItemInput).toBeVisible();

    const secondNewItemInput = newItemInputs.nth(1);
    await expect(secondNewItemInput).toBeVisible();
  });

  test("should not display new item input when user is not authorized", async ({
    page,
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

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: testContext.prefix("Existing task"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await page.goto(`/boards/${board.id}`);
    const newItemInput = page.getByTestId("new-item");
    await expect(newItemInput).not.toBeVisible();
  });

  test("should create new checklist item when new item input is used", async ({
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

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: testContext.prefix("Existing task"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)
    ).toBeVisible();

    const newItemInput = authenticatedPage.getByTestId("new-item").locator("textarea");
    await expect(newItemInput).toBeVisible();

    const newTaskContent = testContext.prefix("New task from input");

    await newItemInput.fill(newTaskContent);

    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await newItemInput.blur();
    await addItemResponse;

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });

    expect(updatedNote).not.toBeNull();
    expect(updatedNote?.checklistItems).toHaveLength(2);
    expect(
      updatedNote?.checklistItems.find((item) => item.content === newTaskContent)
    ).toBeTruthy();
  });

  test("should keep new item input always visible (everpresent)", async ({
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

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: testContext.prefix("Existing task"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)
    ).toBeVisible();

    const newItemInput = authenticatedPage.getByTestId("new-item");
    await expect(newItemInput).toBeVisible();

    const textarea = newItemInput.locator("textarea");
    await textarea.fill("Test content");
    await expect(newItemInput).toBeVisible();

    await textarea.blur();
    await expect(newItemInput).toBeVisible();
  });

  test("should not add checklist item on background click", async ({
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

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: testContext.prefix("Existing task"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)
    ).toBeVisible();

    const initialNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });
    const initialCount = initialNote?.checklistItems.length || 0;

    const noteBackground = authenticatedPage
      .locator(`[data-testid="note-${note.id}"]`)
      .or(authenticatedPage.locator(".shadow-md").first());
    await noteBackground.click({ position: { x: 50, y: 50 } });

    const newItemInput = authenticatedPage.getByTestId("new-item");
    await expect(newItemInput).toBeVisible();

    const finalNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });
    expect(finalNote?.checklistItems.length).toBe(initialCount);
  });
});
