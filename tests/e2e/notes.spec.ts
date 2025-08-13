import { test, expect } from '../fixtures/test-helpers';

test.describe("Note Management", () => {
  test("should display empty state when no notes exist", async ({ 
    authenticatedPage, 
    testContext, 
    testPrisma 
  }) => {
    // Create a board for this test
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Verify no notes exist for this board
    const noteCount = await testPrisma.note.count({
      where: { 
        boardId: board.id,
        archivedAt: null
      }
    });
    expect(noteCount).toBe(0);

    await authenticatedPage.goto(`/boards/${board.id}`);
    
    await expect(authenticatedPage.locator("text=No notes yet")).toBeVisible();
    await expect(authenticatedPage.locator('button:has-text("Add Your First Note")')).toBeVisible();
  });

  test("should create a note and add checklist items", async ({ 
    authenticatedPage, 
    testContext, 
    testPrisma 
  }) => {
    // Create a board for this test
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Click "Add Your First Note"
    const createNoteResponse = authenticatedPage.waitForResponse((resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes`) &&
      resp.request().method() === 'POST' &&
      resp.status() === 201
    );
    await authenticatedPage.click('button:has-text("Add Your First Note")');
    await createNoteResponse;

    // Add a checklist item
    await authenticatedPage.getByRole("button", { name: "Add task" }).first().click();
    const testItemContent = testContext.prefix("Test checklist item");
    const addItemResponse = authenticatedPage.waitForResponse((resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes/`) &&
      resp.request().method() === 'PUT' &&
      resp.ok()
    );
    await authenticatedPage.getByPlaceholder("Add new item...").fill(testItemContent);
    await authenticatedPage.getByPlaceholder("Add new item...").press("Enter");
    await addItemResponse;

    // Verify the item appears
    await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

    // Verify in database
    const notes = await testPrisma.note.findMany({
      where: { 
        boardId: board.id 
      },
      include: {
        checklistItems: true
      }
    });

    expect(notes).toHaveLength(1);
    expect(notes[0].checklistItems).toHaveLength(1);
    expect(notes[0].checklistItems[0].content).toBe(testItemContent);
  });

  test("should edit checklist item content", async ({ 
    authenticatedPage, 
    testContext, 
    testPrisma 
  }) => {
    // Create a board for this test
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create a note with a checklist item
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
            }
          ]
        }
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const editedContent = testContext.prefix("Edited item");
    
    // Edit the checklist item
    await authenticatedPage.getByText(originalContent).click();
    // Wait for edit mode to activate and locate the checklist input using test id
    const editInput = authenticatedPage.getByTestId(itemId).getByRole('textbox');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue(originalContent);
    const saveEditResponse = authenticatedPage.waitForResponse((resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes/`) &&
      resp.request().method() === 'PUT' &&
      resp.ok()
    );
    await editInput.fill(editedContent);
    // Click outside to trigger blur and save the edit
    await authenticatedPage.click('body');
    await saveEditResponse;

    // Verify the change appears in UI
    await expect(authenticatedPage.getByText(editedContent)).toBeVisible();

    // Verify in database
    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true
      }
    });

    expect(updatedNote?.checklistItems[0].content).toBe(editedContent);
  });

  test("should toggle checklist item completion", async ({ 
    authenticatedPage, 
    testContext, 
    testPrisma 
  }) => {
    // Create a board for this test
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create a note with a checklist item
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
            }
          ]
        }
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Toggle the checkbox
    const checkbox = authenticatedPage.locator('[data-state="unchecked"]').first();
    await expect(checkbox).toBeVisible();
    const toggleResponse = authenticatedPage.waitForResponse((resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes/`) &&
      resp.request().method() === 'PUT' &&
      resp.ok()
    );
    await checkbox.click();
    await toggleResponse;

    // Verify in database
    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true
      }
    });

    expect(updatedNote?.checklistItems[0].checked).toBe(true);
  });

  test("should delete checklist item", async ({ 
    authenticatedPage, 
    testContext, 
    testPrisma 
  }) => {
    // Create a board for this test
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      }
    });

    // Create a note with a checklist item
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
            }
          ]
        }
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Delete the checklist item
    const deleteItemResponse = authenticatedPage.waitForResponse((resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes/`) &&
      resp.request().method() === 'PUT' &&
      resp.ok()
    );
    await authenticatedPage.getByRole("button", { name: "Delete item", exact: true }).click();
    await deleteItemResponse;

    // Verify item is gone from UI
    await expect(authenticatedPage.getByText(itemToDeleteContent)).not.toBeVisible();

    // Verify in database
    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: {
        checklistItems: true
      }
    });

    expect(updatedNote?.checklistItems).toHaveLength(0);
  });

  test.describe("Drag and Drop", () => {
    test("should reorder checklist items within a note", async ({ 
      authenticatedPage, 
      testContext, 
      testPrisma 
    }) => {
      // Create a board for this test
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        }
      });

      // Create a note with multiple checklist items
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
            ]
          }
        }
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      // Perform drag and drop - move Item A3 to first position
      const sourceElement = authenticatedPage.getByTestId(itemA3Id);
      const targetElement = authenticatedPage.getByTestId(itemA1Id);

      await expect(sourceElement).toBeVisible();
      await expect(targetElement).toBeVisible();

      const targetBox = await targetElement.boundingBox();
      if (!targetBox) throw new Error("Target element not found");

      const reorderResponse = authenticatedPage.waitForResponse((resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === 'PUT' &&
        resp.ok()
      );
      await sourceElement.hover();
      await authenticatedPage.mouse.down();
      await targetElement.hover();
      await targetElement.hover();
      await authenticatedPage.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 5);
      await authenticatedPage.mouse.up();
      await reorderResponse;

      // Verify in database that order changed
      const updatedNote = await testPrisma.note.findUnique({
        where: { id: note.id },
        include: {
          checklistItems: {
            orderBy: { order: 'asc' }
          }
        }
      });

      const checklistItems = updatedNote?.checklistItems || [];
      expect(checklistItems[0].content).toBe(testContext.prefix("Item A3"));
      expect(checklistItems[1].content).toBe(testContext.prefix("Item A1"));
      expect(checklistItems[2].content).toBe(testContext.prefix("Item A2"));
    });

    test("should not allow drag and drop between different notes", async ({ 
      authenticatedPage, 
      testContext, 
      testPrisma 
    }) => {
      // Create a board for this test
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        }
      });

      // Create two notes with checklist items
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
              { id: note1ItemId, content: testContext.prefix("Note1 Item"), checked: false, order: 0 },
            ]
          }
        }
      });

      const note2 = await testPrisma.note.create({
        data: {
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
          checklistItems: {
            create: [
              { id: note2ItemId, content: testContext.prefix("Note2 Item"), checked: false, order: 0 },
            ]
          }
        }
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      // Try to drag from note1 to note2
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

      // Verify items stayed in their original notes
      const updatedNote1 = await testPrisma.note.findUnique({
        where: { id: note1.id },
        include: {
          checklistItems: true
        }
      });

      const updatedNote2 = await testPrisma.note.findUnique({
        where: { id: note2.id },
        include: {
          checklistItems: true
        }
      });
      
      expect(updatedNote1?.checklistItems).toHaveLength(1);
      expect(updatedNote1?.checklistItems[0].content).toBe(testContext.prefix("Note1 Item"));
      expect(updatedNote2?.checklistItems).toHaveLength(1);
      expect(updatedNote2?.checklistItems[0].content).toBe(testContext.prefix("Note2 Item"));
    });
  });

  test.describe("Delete with Undo (toasts)", () => {
    test("should show Undo toast and restore note without issuing DELETE when undone", async ({
      authenticatedPage,
      testContext,
      testPrisma
    }) => {
      // Create a board for this test
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        }
      });

      // Create a note to be deleted
      const note = await testPrisma.note.create({
        data: {
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
        }
      });

      let deleteCalled = false;

      // Intercept DELETE request to track if it's called
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
      await authenticatedPage.getByRole("button", { name: `Delete Note ${note.id}`, exact: true }).click();
      await expect(authenticatedPage.getByText("Note deleted")).toBeVisible();
      await authenticatedPage.getByRole("button", { name: "Undo" }).click();

      await expect(
        authenticatedPage.getByRole("button", { name: `Delete Note ${note.id}`, exact: true })
      ).toBeVisible();

      await authenticatedPage.waitForTimeout(300);
      expect(deleteCalled).toBe(false);
    });
  });

  test.describe("Empty Note Prevention", () => {
    test("should not create empty item when pressing Enter at start of item", async ({ 
      authenticatedPage,
      testContext,
      testPrisma
    }) => {
      // Create a board for this test
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        }
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      // Create a new note with initial checklist item
      const createNoteResponse = authenticatedPage.waitForResponse((resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === 'POST' &&
        resp.status() === 201
      );
      await authenticatedPage.click('button:has-text("Add Your First Note")');
      await createNoteResponse;

      // Add first item with content
      await authenticatedPage.getByRole("button", { name: "Add task" }).first().click();
      const testItemContent = testContext.prefix("First item content");
      const addItemResponse = authenticatedPage.waitForResponse((resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === 'PUT' &&
        resp.ok()
      );
      await authenticatedPage.getByPlaceholder("Add new item...").fill(testItemContent);
      await authenticatedPage.getByPlaceholder("Add new item...").press("Enter");
      await addItemResponse;

      // Wait for the item to be visible
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

      // Click at the beginning of the existing item
      await authenticatedPage.getByText(testItemContent).click();

      // Get the input field for the existing item
      const itemInput = authenticatedPage.locator(`input[value="${testItemContent}"]`);
      await expect(itemInput).toBeVisible();

      // Position cursor at the start (position 0)
      await itemInput.focus();
      await authenticatedPage.keyboard.press("Home"); // Move cursor to start

      // Press Enter - should NOT create a new empty item
      await itemInput.press("Enter");
      await authenticatedPage.waitForTimeout(500);

      // Verify only one item exists and it still has the original content
      const checklistItems = authenticatedPage.getByRole("checkbox");
      await expect(checklistItems).toHaveCount(1);
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();
    });

    test("should not create empty item when pressing Enter at end of item", async ({ 
      authenticatedPage,
      testContext,
      testPrisma
    }) => {
      // Create a board for this test
      const boardName = testContext.getBoardName("Test Board");
      const board = await testPrisma.board.create({
        data: {
          name: boardName,
          description: testContext.prefix("Test board description"),
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        }
      });

      await authenticatedPage.goto(`/boards/${board.id}`);

      // Create a new note with initial checklist item
      const createNoteResponse = authenticatedPage.waitForResponse((resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === 'POST' &&
        resp.status() === 201
      );
      await authenticatedPage.click('button:has-text("Add Your First Note")');
      await createNoteResponse;

      // Add first item with content
      await authenticatedPage.getByRole("button", { name: "Add task" }).first().click();
      const testItemContent = testContext.prefix("Last item content");
      const addItemResponse = authenticatedPage.waitForResponse((resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === 'PUT' &&
        resp.ok()
      );
      await authenticatedPage.getByPlaceholder("Add new item...").fill(testItemContent);
      await authenticatedPage.getByPlaceholder("Add new item...").press("Enter");
      await addItemResponse;

      // Wait for the item to be visible
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();

      // Click on the existing item to edit it
      await authenticatedPage.getByText(testItemContent).click();

      // Get the input field for the existing item
      const itemInput = authenticatedPage.locator(`input[value="${testItemContent}"]`);
      await expect(itemInput).toBeVisible();

      // Position cursor at the end
      await itemInput.focus();
      await authenticatedPage.keyboard.press("End"); // Move cursor to end

      // Press Enter - should NOT create a new empty item when cursor is at end
      await itemInput.press("Enter");
      await authenticatedPage.waitForTimeout(500);

      // Verify only one item exists and it still has the original content
      const checklistItems = authenticatedPage.getByRole("checkbox");
      await expect(checklistItems).toHaveCount(1);
      await expect(authenticatedPage.getByText(testItemContent)).toBeVisible();
    });
  });
});
