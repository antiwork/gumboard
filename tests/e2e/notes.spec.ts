import { test, expect } from "../fixtures/test-helpers";

test.describe("Note Management", () => {
  test("should display empty state when no notes exist", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const noteCount = await testPrisma.note.count({
      where: {
        boardId: board.id,
        archivedAt: null,
      },
    });
    expect(noteCount).toBe(0);

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator("text=No notes yet")).toBeVisible();
    await expect(authenticatedPage.locator('button:has-text("Add Your First Note")')).toBeVisible();
  });

  test("should create a note and add checklist items", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await authenticatedPage.click('button:has-text("Add Your First Note")');
    await createNoteResponse;

    await authenticatedPage.getByRole("button", { name: "Add task" }).first().click();
    const testItemContent = testContext.prefix("Test checklist item");
    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await authenticatedPage.getByPlaceholder("Add new item...").fill(testItemContent);
    await authenticatedPage.getByPlaceholder("Add new item...").press("Enter");
    await addItemResponse;

    await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

    const notes = await testPrisma.note.findMany({
      where: {
        boardId: board.id,
      },
      include: {
        checklistItems: true,
      },
    });

    expect(notes).toHaveLength(1);
    expect(notes[0].checklistItems).toHaveLength(1);
    expect(notes[0].checklistItems[0].content).toBe(testItemContent);
  });

  test("should edit checklist item content", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const itemId = testContext.prefix("item-1");
    const originalContent = testContext.prefix("Original item");

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
              content: testContext.prefix("Test item"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const editedContent = testContext.prefix("Edited item");
    await authenticatedPage.getByText(originalContent).click();
    const editInput = authenticatedPage.getByTestId(itemId).getByRole("textbox");
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue(originalContent);
    const saveEditResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await editInput.fill(editedContent);
    await authenticatedPage.click("body");
    await saveEditResponse;

    await expect(authenticatedPage.getByText(editedContent)).toBeVisible();

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });

    expect(updatedNote).not.toBeNull();
    expect(updatedNote?.checklistItems).toHaveLength(1);
    expect(updatedNote?.checklistItems[0].content).toBe(editedContent);
  });

  test("should always use note.boardId for all API calls", async ({ page }) => {
    let apiCallsMade: { url: string; method: string }[] = [];

    const mockNoteData = {
      id: "note-id",
      content: "",
      color: "#fef3c7",
      archivedAt: null,
      checklistItems: [
        {
          id: "item-1",
          content: "Test item",
          checked: false,
          order: 0,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      boardId: "note-actual-board-id",
      board: {
        id: "note-actual-board-id",
        name: "Note Actual Board",
      },
      user: {
        id: "test-user",
        name: "Test User",
        email: "test@example.com",
      },
    };

    await page.route("**/api/boards/*/notes/*", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      apiCallsMade.push({
        url,
        method,
      });

      if (method === "PUT" || method === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: mockNoteData,
          }),
        });
      }
    });

    await page.route("**/api/boards/all-notes/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [mockNoteData],
          }),
        });
      }
    });

    await page.goto("/boards/all-notes");

      // Check for all the actions for notes & checklistitem

      // Test 1: Toggle checklist item
      const checkbox = page.locator('[data-state="unchecked"]').first();
      await expect(checkbox).toBeVisible();
      await checkbox.click();

      // Test 2: Add a new checklist item
      const addTaskButton = page.locator('button:has-text("Add task")');
      await expect(addTaskButton).toBeVisible();
      await addTaskButton.click();
      const newItemInput = page.locator('textarea[placeholder="Add new item..."]');
      await expect(newItemInput).toBeVisible();
      await newItemInput.fill("New test item");
      await newItemInput.press("Enter");

      // Test 3: Edit checklist item content
      const existingItem = page.locator("text=Test item").first();
      await expect(existingItem).toBeVisible();
      await existingItem.dblclick();
      const editInput = page.locator('textarea').filter({ hasText: "Test item" });
      await editInput.isVisible();
      await editInput.fill("Edited test item");
      await page.getByText("Note Actual Board").click();

      // Test 4: Delete checklist item
      await page.getByRole("button", { name: "Delete item", exact: true }).click();

      expect(apiCallsMade.filter((call) => call.method === "PUT").length).toBe(4);
      expect(apiCallsMade.length).toBe(4);

      apiCallsMade.forEach((call) => {
        expect(call.url).toContain("api/boards/note-actual-board-id/notes/test-note-123");
      });
    });

    test("should autofocus new checklist item input when Add task is clicked", async ({ page }) => {
      await page.goto("/boards/test-board");

      await page.click('button:has-text("Add Your First Note")');
      await page.waitForTimeout(500);

      const initialInput = page.locator("textarea.bg-transparent").first();
      await initialInput.fill("First item");
      await initialInput.press("Enter");
      await page.waitForTimeout(300);

      await page.click('button:has-text("Add task")');

      const newItemInput = page.locator('textarea[placeholder="Add new item..."]');
      await expect(newItemInput).toBeVisible();
      await expect(newItemInput).toBeFocused();

      await newItemInput.blur();
      await page.waitForTimeout(100);

      await page.click('button:has-text("Add task")');
      await expect(newItemInput).toBeFocused();
    });

    test("should create a checklist note and verify database state", async ({ page }) => {
      let noteCreated = false;
      let noteData: any = null;

      await page.route("**/api/boards/test-board/notes", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes: [] }),
          });
        } else if (route.request().method() === "POST") {
          noteCreated = true;
          const postData = await route.request().postDataJSON();
          noteData = postData;

          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              note: {
                id: "new-note-id",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: postData.checklistItems || [
                  {
                    id: `item-${Date.now()}`,
                    content: "",
                    checked: false,
                    order: 0,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                board: {
                  id: "test-board-id",
                  name: "Test Board",
                },
                boardId: "test-board-id",
                user: {
                  id: "test-user",
                  name: "Test User",
                  email: "test@example.com",
                },
              },
            }),
          });
        }
      });

      await page.goto("/boards/test-board");
    });

  test("should edit checklist item content", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const itemId = testContext.prefix("item-1");
    const originalContent = testContext.prefix("Original item");

    const note = await testPrisma.note.create({
      data: {
        content: "",
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: itemId,
              content: originalContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const editedContent = testContext.prefix("Edited item");
    await authenticatedPage.getByText(originalContent).click();
    const editInput = authenticatedPage.getByTestId(itemId).getByRole("textbox");
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue(originalContent);
    const saveEditResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await editInput.fill(editedContent);
    await authenticatedPage.click("body");
    await saveEditResponse;

    await expect(authenticatedPage.getByText(editedContent)).toBeVisible();

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });

    expect(updatedNote).not.toBeNull();
    expect(updatedNote?.checklistItems).toHaveLength(1);
    expect(updatedNote?.checklistItems[0]?.content).toBe(editedContent);
  });

  test("should toggle checklist item completion", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const toggleItemId = testContext.prefix("toggle-item-1");
    const testItemContent = testContext.prefix("Test item");

    const note = await testPrisma.note.create({
      data: {
        content: "",
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: toggleItemId,
              content: testItemContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const checkbox = authenticatedPage.locator('[data-state="unchecked"]').first();
    await expect(checkbox).toBeVisible();
    const toggleResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await checkbox.click();
    await toggleResponse;

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });

    expect(updatedNote).not.toBeNull();
    expect(updatedNote?.checklistItems).toHaveLength(1);
    expect(updatedNote?.checklistItems[0]?.checked).toBe(true);
  });

  test("should delete checklist item", async ({ authenticatedPage, testContext, testPrisma }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const deleteItemId = testContext.prefix("delete-item-1");
    const itemToDeleteContent = testContext.prefix("Item to delete");

    const note = await testPrisma.note.create({
      data: {
        content: "",
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: deleteItemId,
              content: itemToDeleteContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const deleteItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await authenticatedPage.getByRole("button", { name: "Delete item", exact: true }).click();
    await deleteItemResponse;

    await expect(authenticatedPage.getByText(itemToDeleteContent)).not.toBeVisible();

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true,
      },
    });

    expect(updatedNote).not.toBeNull();
    expect(updatedNote?.checklistItems).toHaveLength(0);
  });

  test.describe("Drag and Drop", () => {
    test("should reorder checklist items within a note", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      const itemA1Id = testContext.prefix("item-a1");
      const itemA2Id = testContext.prefix("item-a2");
      const itemA3Id = testContext.prefix("item-a3");

      const note = await testPrisma.note.create({
        data: {
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
          checklistItems: {
            create: [
              { id: itemA1Id, content: testContext.prefix("Item A1"), checked: false, order: 0 },
              { id: itemA2Id, content: testContext.prefix("Item A2"), checked: false, order: 1 },
              { id: itemA3Id, content: testContext.prefix("Item A3"), checked: false, order: 2 },
            ],
          },
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      const sourceElement = authenticatedPage.getByTestId(itemA3Id);
      const targetElement = authenticatedPage.getByTestId(itemA1Id);

      await expect(sourceElement).toBeVisible();
      await expect(targetElement).toBeVisible();

      const targetBox = await targetElement.boundingBox();
      if (!targetBox) throw new Error("Target element not found");

      const reorderResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes/`) &&
          resp.request().method() === "PUT" &&
          resp.ok()
      );
      await sourceElement.hover();
      await authenticatedPage.mouse.down();
      await targetElement.hover();
      await targetElement.hover();
      await authenticatedPage.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 5);
      await authenticatedPage.mouse.up();
      await reorderResponse;

      const updatedNote = await testPrisma.note.findUnique({
        where: { id: note.id },
        include: {
          checklistItems: {
            orderBy: { order: "asc" },
          },
        },
      });

      expect(updatedNote).not.toBeNull();
      const checklistItems = updatedNote?.checklistItems || [];
      expect(checklistItems[0].content).toBe(testContext.prefix("Item A3"));
      expect(checklistItems[1].content).toBe(testContext.prefix("Item A1"));
      expect(checklistItems[2].content).toBe(testContext.prefix("Item A2"));
    });

    test("should not allow drag and drop between different notes", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      const note1ItemId = testContext.prefix("note1-item");
      const note2ItemId = testContext.prefix("note2-item");

      const note1 = await testPrisma.note.create({
        data: {
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
          checklistItems: {
            create: [
              {
                id: note1ItemId,
                content: testContext.prefix("Note1 Item"),
                checked: false,
                order: 0,
              },
            ],
          },
        },
      });

      const note2 = await testPrisma.note.create({
        data: {
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
          checklistItems: {
            create: [
              {
                id: note2ItemId,
                content: testContext.prefix("Note2 Item"),
                checked: false,
                order: 0,
              },
            ],
          },
        },
      });

      const sourceElement = authenticatedPage.getByTestId(note1ItemId);
      const targetElement = authenticatedPage.getByTestId(note2ItemId);

      await expect(sourceElement).toBeVisible();
      await expect(targetElement).toBeVisible();

      const targetBox = await targetElement.boundingBox();
      if (!targetBox) throw new Error("Target element not found");

      await sourceElement.hover();
      await authenticatedPage.mouse.down();
      await targetElement.hover();
      await targetElement.hover();
      await authenticatedPage.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 5);
      await authenticatedPage.mouse.up();

      const updatedNote1 = await testPrisma.note.findUnique({
        where: { id: note1.id },
        include: {
          checklistItems: true,
        },
      });

      const updatedNote2 = await testPrisma.note.findUnique({
        where: { id: note2.id },
        include: {
          checklistItems: true,
        },
      });

      expect(updatedNote1?.checklistItems).toHaveLength(1);
      expect(updatedNote1?.checklistItems[0].content).toBe(testContext.prefix("Note1 Item"));
      expect(updatedNote2?.checklistItems).toHaveLength(1);
      expect(updatedNote2?.checklistItems[0].content).toBe(testContext.prefix("Note2 Item"));
    });

    test("should display empty state when no notes exist", async ({ page }) => {
      await page.goto("/boards/test-board");

      await expect(page.locator("text=No notes yet")).toBeVisible();
      await expect(page.locator('button:has-text("Add Your First Note")')).toBeVisible();
    });

    test("should create a note in the all notes view", async ({ page }) => {
      await page.goto("/boards/all-notes");
      await page.getByRole("button", { name: "Add Note" }).first().click();
      await page.waitForTimeout(500);
      await expect(page.locator(".shadow-md")).toBeVisible();
    });
  });

  test.describe("Delete with Undo (toasts)", () => {
    test("should show Undo toast and restore note without issuing DELETE when undone", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
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
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        },
      });

      let deleteCalled = false;

      await authenticatedPage.route(`**/api/boards/${board.id}/notes/${note.id}`, async (route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
          });
        } else {
          await route.continue();
        }
      });

      await authenticatedPage.goto(`/boards/${board.id}`);
      await authenticatedPage
        .getByRole("button", { name: `Delete Note ${note.id}`, exact: true })
        .click();
      await expect(authenticatedPage.getByText("Note deleted")).toBeVisible();
      await authenticatedPage.getByRole("button", { name: "Undo" }).click();

      await expect(
        authenticatedPage.getByRole("button", { name: `Delete Note ${note.id}`, exact: true })
      ).toBeVisible();

      // Wait a moment to ensure no delete call is made
      await authenticatedPage
        .waitForResponse(
          (resp) =>
            resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
            resp.request().method() === "DELETE",
          { timeout: 500 }
        )
        .catch(() => {
          // Expected to timeout - no delete should happen
        });
      expect(deleteCalled).toBe(false);
    });
  });

  test.describe("Empty Note Prevention", () => {
    test("should not create empty item when pressing Enter at start of item", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      const createNoteResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes`) &&
          resp.request().method() === "POST" &&
          resp.status() === 201
      );
      await authenticatedPage.click('button:has-text("Add Your First Note")');
      await createNoteResponse;

      await authenticatedPage.getByRole("button", { name: "Add task" }).first().click();
      const testItemContent = testContext.prefix("First item content");
      const addItemResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes/`) &&
          resp.request().method() === "PUT" &&
          resp.ok()
      );
      await authenticatedPage.getByPlaceholder("Add new item...").fill(testItemContent);
      await authenticatedPage.getByPlaceholder("Add new item...").press("Enter");
      await addItemResponse;

      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

      await authenticatedPage.getByText(testItemContent).click();

      const itemInput = authenticatedPage.locator(`textarea`).filter({ hasText: testItemContent });
      await expect(itemInput).toBeVisible();

      await itemInput.focus();
      await authenticatedPage.keyboard.press("Home");

      await itemInput.press("Enter");

      // Wait for any potential network activity to complete
      await authenticatedPage.waitForLoadState("networkidle");

      const checklistItems = authenticatedPage.getByRole("checkbox");
      await expect(checklistItems).toHaveCount(1);
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();
    });

    test("should not create empty item when pressing Enter at end of item", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      const createNoteResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes`) &&
          resp.request().method() === "POST" &&
          resp.status() === 201
      );
      await authenticatedPage.click('button:has-text("Add Your First Note")');
      await createNoteResponse;

      await authenticatedPage.getByRole("button", { name: "Add task" }).first().click();
      const testItemContent = testContext.prefix("Last item content");
      const addItemResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes/`) &&
          resp.request().method() === "PUT" &&
          resp.ok()
      );
      await authenticatedPage.getByPlaceholder("Add new item...").fill(testItemContent);
      await authenticatedPage.getByPlaceholder("Add new item...").press("Enter");
      await addItemResponse;

      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

      await authenticatedPage.getByText(testItemContent).click();

      const itemInput = authenticatedPage.locator(`textarea`).filter({ hasText: testItemContent });
      await expect(itemInput).toBeVisible();

      await itemInput.focus();
      await authenticatedPage.keyboard.press("End");

      await itemInput.press("Enter");

      // Wait for any potential network activity to complete
      await authenticatedPage.waitForLoadState("networkidle");

      const checklistItems = authenticatedPage.getByRole("checkbox");
      await expect(checklistItems).toHaveCount(1);
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();
    });
  });
});
