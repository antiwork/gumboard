import { test, expect } from "../fixtures/test-helpers";

test.describe("Note Management", () => {
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
    await authenticatedPage.click('button:has-text("Add Note")');
    await createNoteResponse;

    // Since the note is empty, it should show the new-item input automatically
    const testItemContent = testContext.prefix("Test checklist item");

    // Look for any textarea in the note (the initial empty item input)
    const initialTextarea = authenticatedPage.locator("textarea").first();
    await expect(initialTextarea).toBeVisible({ timeout: 10000 });

    await initialTextarea.fill(testItemContent);

    // Use Tab key to move focus away and trigger blur
    await initialTextarea.press("Tab");

    // Wait for the content to appear in the UI (this means at least one submission worked)
    await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

    // Add a small delay to ensure all async operations complete
    await authenticatedPage.waitForTimeout(1000);

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
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        id: testContext.prefix("item-1"),
        content: originalContent,
        checked: false,
        order: 0,
        noteId: note.id,
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

  test("should use correct boardId for all API calls", async ({
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

    const testItemContent = testContext.prefix("Test item");
    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: testItemContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Test 1: Toggle checklist item
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

    // Verify toggle in database
    const toggledItem = await testPrisma.checklistItem.findFirst({
      where: { id: testContext.prefix("item-1") },
    });
    expect(toggledItem?.checked).toBe(true);

    // Test 2: Add a new checklist item using always-available input
    const newItemInput = authenticatedPage.getByTestId("new-item").locator("textarea");
    await expect(newItemInput).toBeVisible();
    const newItemContent = testContext.prefix("New test item");
    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok(),
      { timeout: 15000 }
    );
    await newItemInput.fill(newItemContent);
    await newItemInput.blur();
    await addItemResponse;

    // Verify new item in database
    const newItem = await testPrisma.checklistItem.findFirst({
      where: { content: newItemContent },
    });
    expect(newItem).toBeTruthy();

    // Test 3: Edit checklist item content
    const existingItem = authenticatedPage.locator(`text=${testItemContent}`).first();
    await expect(existingItem).toBeVisible();
    await existingItem.dblclick();
    const editInput = authenticatedPage
      .getByTestId(testContext.prefix("item-1"))
      .locator("textarea");
    await expect(editInput).toBeVisible();
    const editedContent = testContext.prefix("Edited test item");
    const editResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await editInput.fill(editedContent);
    await authenticatedPage.locator("body").click();
    await editResponse;

    // Verify edit in database
    const editedItem = await testPrisma.checklistItem.findFirst({
      where: { content: editedContent },
    });
    expect(editedItem).toBeTruthy();

    // Test 4: Delete checklist item
    const deleteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await authenticatedPage
      .getByTestId(testContext.prefix("item-1"))
      .getByRole("button", { name: "Delete item" })
      .click();
    await deleteResponse;

    // Verify deletion in database
    const deletedItem = await testPrisma.checklistItem.findFirst({
      where: { id: testContext.prefix("item-1") },
    });
    expect(deletedItem).toBeNull();
  });

  test("should autofocus new checklist item input when Add task is clicked", async ({
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
    await authenticatedPage.click('button:has-text("Add Note")');
    await createNoteResponse;

    const initialInput = authenticatedPage.locator("textarea.bg-transparent").first();
    const firstItemContent = testContext.prefix("First item");
    const addFirstItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await initialInput.fill(firstItemContent);
    await initialInput.blur();
    await addFirstItemResponse;

    const newItemInput = authenticatedPage.getByTestId("new-item").locator("textarea");
    await expect(newItemInput).toBeVisible();

    await newItemInput.click();
    await expect(newItemInput).toBeFocused();

    await newItemInput.blur();

    await newItemInput.click();
    await expect(newItemInput).toBeFocused();
  });

  test("should create a checklist note and verify database state", async ({
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
    await authenticatedPage.click('button:has-text("Add Note")');
    await createNoteResponse;

    // Verify note was created in database
    const createdNote = await testPrisma.note.findFirst({
      where: {
        boardId: board.id,
        createdBy: testContext.userId,
      },
      include: {
        checklistItems: true,
      },
    });

    expect(createdNote).toBeTruthy();
    expect(createdNote?.boardId).toBe(board.id);
    expect(createdNote?.color).toMatch(/^#[0-9a-f]{6}$/i); // Valid hex color
    expect(createdNote?.checklistItems).toHaveLength(0); // Notes start empty
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
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        id: toggleItemId,
        content: testItemContent,
        checked: false,
        order: 0,
        noteId: note.id,
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
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        id: deleteItemId,
        content: itemToDeleteContent,
        checked: false,
        order: 0,
        noteId: note.id,
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
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        },
      });

      await testPrisma.checklistItem.createMany({
        data: [
          {
            id: itemA1Id,
            content: testContext.prefix("Item A1"),
            checked: false,
            order: 0,
            noteId: note.id,
          },
          {
            id: itemA2Id,
            content: testContext.prefix("Item A2"),
            checked: false,
            order: 1,
            noteId: note.id,
          },
          {
            id: itemA3Id,
            content: testContext.prefix("Item A3"),
            checked: false,
            order: 2,
            noteId: note.id,
          },
        ],
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
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        },
      });

      await testPrisma.checklistItem.create({
        data: {
          id: note1ItemId,
          content: testContext.prefix("Note1 Item"),
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
          id: note2ItemId,
          content: testContext.prefix("Note2 Item"),
          checked: false,
          order: 0,
          noteId: note2.id,
        },
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

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

    test("should display empty state when no notes exist", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      const boardName = testContext.getBoardName("Empty Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Empty test board"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Ensure no notes exist
      const noteCount = await testPrisma.note.count({
        where: {
          boardId: board.id,
          archivedAt: null,
        },
      });
      expect(noteCount).toBe(0);

      await authenticatedPage.goto(`/boards/${board.id}`);

      await expect(authenticatedPage.locator('button:has-text("Add Note")')).toBeVisible();
    });

    test("should create a note in the all notes view", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Create a board for testing all notes view
      const boardName = testContext.getBoardName("All Notes Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("All notes test board"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      await authenticatedPage.goto("/boards/all-notes");

      const createNoteResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/`) &&
          resp.url().includes(`/notes`) &&
          resp.request().method() === "POST" &&
          resp.status() === 201
      );
      await authenticatedPage.getByRole("button", { name: "Add Note" }).first().click();
      await createNoteResponse;

      await expect(authenticatedPage.locator(".shadow-md")).toBeVisible();

      // Verify note was created in database (could be on any board)
      const createdNote = await testPrisma.note.findFirst({
        where: {
          createdBy: testContext.userId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      expect(createdNote).toBeTruthy();
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
    test("should create empty item when pressing Enter at start of item", async ({
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
      await authenticatedPage.click('button:has-text("Add Note")');
      await createNoteResponse;

      // When a note is created empty, it automatically shows the new item input
      const testItemContent = testContext.prefix("First item content");

      // Look for any textarea in the newly created note
      const newItemInput = authenticatedPage.locator("textarea").first();
      await expect(newItemInput).toBeVisible({ timeout: 10000 });

      const addItemResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes/`) &&
          resp.request().method() === "PUT" &&
          resp.ok(),
        { timeout: 15000 }
      );
      await newItemInput.fill(testItemContent);
      await newItemInput.blur();
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

      const checklistItems = authenticatedPage
        .getByRole("checkbox")
        .filter({ hasNot: authenticatedPage.getByTestId("new-item") });
      await expect(checklistItems).toHaveCount(2);
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();
    });

    test("should create empty item when pressing Enter at end of item", async ({
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
      await authenticatedPage.click('button:has-text("Add Note")');
      await createNoteResponse;

      // When a note is created empty, it automatically shows the new item input
      const testItemContent = testContext.prefix("Last item content");

      // Look for any textarea in the newly created note
      const newItemInput = authenticatedPage.locator("textarea").first();
      await expect(newItemInput).toBeVisible({ timeout: 10000 });

      const addItemResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes/`) &&
          resp.request().method() === "PUT" &&
          resp.ok(),
        { timeout: 15000 }
      );
      await newItemInput.fill(testItemContent);
      await newItemInput.blur();
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

      const checklistItems = authenticatedPage
        .getByRole("checkbox")
        .filter({ hasNot: authenticatedPage.getByTestId("new-item") });
      await expect(checklistItems).toHaveCount(2);
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();
    });
  });
});
