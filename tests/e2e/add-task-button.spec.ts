import { test, expect } from "../fixtures/test-helpers";

// Utility to generate unique suffix per test run
const uniqueId = () => Math.random().toString(36).substring(2, 8);

test.describe("Add Task Button", () => {
  test("should display new item input for all notes when user is authorized", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const suffix = uniqueId();
    const boardName = testContext.getBoardName(`Test Board ${suffix}`);
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix(`A test board ${suffix}`),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note1 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix(`item-1-${suffix}`),
              content: testContext.prefix(`Existing task ${suffix}`),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    const note2 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix(`Regular note content ${suffix}`),
        checked: false,
        order: 0,
        noteId: note2.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Wait until the notes API returns
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) && resp.request().method() === "GET"
    );

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix(`Existing task ${suffix}`)}`)
    ).toBeVisible({ timeout: 10000 });

    const newItemInputs = authenticatedPage.getByTestId("new-item");
    await expect(newItemInputs).toHaveCount(2);

    await expect(newItemInputs.first()).toBeVisible();
    await expect(newItemInputs.nth(1)).toBeVisible();
  });

  test("should not display new item input when user is not authorized", async ({
    page,
    testContext,
    testPrisma,
  }) => {
    const suffix = uniqueId();
    const boardName = testContext.getBoardName(`Test Board ${suffix}`);
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix(`A test board ${suffix}`),
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
              id: testContext.prefix(`item-1-${suffix}`),
              content: testContext.prefix(`Existing task ${suffix}`),
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
    const suffix = uniqueId();
    const boardName = testContext.getBoardName(`Test Board ${suffix}`);
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix(`A test board ${suffix}`),
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
              id: testContext.prefix(`item-1-${suffix}`),
              content: testContext.prefix(`Existing task ${suffix}`),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const newItemInput = authenticatedPage.getByTestId("new-item").locator("textarea");
    const newTaskContent = testContext.prefix(`New task ${suffix}`);

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
      include: { checklistItems: true },
    });

    expect(updatedNote).not.toBeNull();
    expect(updatedNote?.checklistItems).toHaveLength(2);
    expect(updatedNote?.checklistItems.find((i) => i.content === newTaskContent)).toBeTruthy();
  });

  test("should keep new item input always visible (everpresent)", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const suffix = uniqueId();
    const boardName = testContext.getBoardName(`Test Board ${suffix}`);
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix(`A test board ${suffix}`),
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
              id: testContext.prefix(`item-1-${suffix}`),
              content: testContext.prefix(`Existing task ${suffix}`),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const newItemInput = authenticatedPage.getByTestId("new-item");
    await expect(newItemInput).toBeVisible();

    const textarea = newItemInput.locator("textarea");
    await textarea.fill(`Test content ${suffix}`);
    await expect(newItemInput).toBeVisible();

    await textarea.blur();
    await expect(newItemInput).toBeVisible();
  });

  test("should not add checklist item on background click", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const suffix = uniqueId();
    const boardName = testContext.getBoardName(`Test Board ${suffix}`);
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix(`A test board ${suffix}`),
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
              id: testContext.prefix(`item-1-${suffix}`),
              content: testContext.prefix(`Existing task ${suffix}`),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const initialNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: { checklistItems: true },
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
      include: { checklistItems: true },
    });
    expect(finalNote?.checklistItems.length).toBe(initialCount);
  });
});
