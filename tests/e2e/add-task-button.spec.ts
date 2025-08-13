import { test, expect } from '../fixtures/test-helpers';

interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
  noteId: string;
  createdAt: Date;
  updatedAt: Date;
}

test.describe("Add Task Button", () => {

  test('should display "Add task" button for all notes when user is authorized', async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with real data
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create checklist note with existing task
    await testPrisma.note.create({
      data: {
        content: "",
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
          ]
        },
      }
    });

    // Create regular note
    await testPrisma.note.create({
      data: {
        content: testContext.prefix("Regular note content"),
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board.id,
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)).toBeVisible();

    const addTaskButtons = authenticatedPage.locator('button:has-text("Add task")');
    await expect(addTaskButtons).toHaveCount(2);

    const firstAddTaskButton = addTaskButtons.first();
    await expect(firstAddTaskButton).toBeVisible();

    const plusIcon = firstAddTaskButton.locator("svg");
    await expect(plusIcon).toBeVisible();

    const secondAddTaskButton = addTaskButtons.nth(1);
    await expect(secondAddTaskButton).toBeVisible();
  });

  test('should not display "Add task" button when user is not authorized', async ({ page, testContext, testPrisma }) => {
    // Create a board owned by the authenticated user
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create a note on that board
    await testPrisma.note.create({
      data: {
        content: "",
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
          ]
        },
      }
    });

    // Use unauthenticated page (no cookies/session) to test unauthorized access
    await page.goto(`/boards/${board.id}`);

    // When not authenticated, user should be redirected to login or see different UI
    // The "Add task" button should not be visible for unauthorized users
    const addTaskButton = page.locator('button:has-text("Add task")');
    await expect(addTaskButton).not.toBeVisible();
  });

  test('should create new checklist item when "Add task" button is clicked', async ({ authenticatedPage, testContext, testPrisma }) => {
    // Create a board with real data
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create checklist note with existing task
    const note = await testPrisma.note.create({
      data: {
        content: "",
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
          ]
        },
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)).toBeVisible();

    const addTaskButton = authenticatedPage.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const newItemInput = authenticatedPage.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).toBeVisible();
    await expect(newItemInput).toBeFocused();

    const newTaskContent = testContext.prefix("New task from button");
    await newItemInput.fill(newTaskContent);
    await newItemInput.press("Enter");

    const addItemResponse = authenticatedPage.waitForResponse((resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
      resp.request().method() === 'PUT' &&
      resp.ok()
    );
    await addItemResponse;

    // Verify in database
    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true
      }
    });
    
    expect(updatedNote?.checklistItems).toHaveLength(2);
    expect(updatedNote?.checklistItems.find(item => item.content === newTaskContent)).toBeTruthy();
  });

  test('should keep "Add task" button visible when already adding a checklist item (everpresent)', async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with real data
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create checklist note with existing task
    await testPrisma.note.create({
      data: {
        content: "",
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
          ]
        },
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)).toBeVisible();

    const addTaskButton = authenticatedPage.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const newItemInput = authenticatedPage.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).toBeVisible();
    await expect(addTaskButton).toBeVisible();
  });

  test("should not add checklist item on background click", async ({ authenticatedPage, testContext, testPrisma }) => {
    // Create a board with real data
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create checklist note with existing task
    const note = await testPrisma.note.create({
      data: {
        content: "",
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
          ]
        },
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator(`text=${testContext.prefix("Existing task")}`)).toBeVisible();

    // Store initial checklist items count
    const initialNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true
      }
    });
    const initialCount = initialNote?.checklistItems.length || 0;

    const noteBackground = authenticatedPage
      .locator(`[data-testid="note-${note.id}"]`)
      .or(authenticatedPage.locator(".note-background").first());
    await noteBackground.click({ position: { x: 50, y: 50 } });

    const newItemInput = authenticatedPage.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).not.toBeVisible();
    
    // Verify no new items were added to database
    const finalNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true
      }
    });
    expect(finalNote?.checklistItems.length).toBe(initialCount);
  });
});
