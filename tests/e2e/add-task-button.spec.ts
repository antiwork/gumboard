import { test, expect } from "../fixtures/test-helpers";

test.describe("Add Task Button", () => {
  test('should display "Add task" button for all notes when user is authorized', async ({
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

    const addTaskButtons = authenticatedPage.locator('button:has-text("Add task")');
    await expect(addTaskButtons).toHaveCount(2);

    const firstAddTaskButton = addTaskButtons.first();
    await expect(firstAddTaskButton).toBeVisible();

    const plusIcon = firstAddTaskButton.locator("svg");
    await expect(plusIcon).toBeVisible();

    const secondAddTaskButton = addTaskButtons.nth(1);
    await expect(secondAddTaskButton).toBeVisible();
  });

  test('should not display "Add task" button when user is not authorized', async ({
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
    const addTaskButton = page.locator('button:has-text("Add task")');
    await expect(addTaskButton).not.toBeVisible();
  });

  test('should create new checklist item when "Add task" button is clicked', async ({
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

    const addTaskButton = authenticatedPage.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const newItemInput = authenticatedPage.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).toBeVisible();
    await expect(newItemInput).toBeFocused();

    const newTaskContent = testContext.prefix("New task from button");
    await newItemInput.fill(newTaskContent);
    await newItemInput.press("Enter");

    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
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

  test('should keep "Add task" button visible when already adding a checklist item (everpresent)', async ({
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

    const addTaskButton = authenticatedPage.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const newItemInput = authenticatedPage.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).toBeVisible();
    await expect(addTaskButton).toBeVisible();
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
      .or(authenticatedPage.locator(".note-background").first());
    await noteBackground.click({ position: { x: 50, y: 50 } });

    const newItemInput = authenticatedPage.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).not.toBeVisible();

    const finalNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });
    expect(finalNote?.checklistItems.length).toBe(initialCount);
  });
});
