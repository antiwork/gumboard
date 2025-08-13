import { test, expect } from '../fixtures/test-helpers';
import { Prisma } from '@prisma/client';

interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

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
      }
    });

    expect(notes).toHaveLength(1);
    const checklistItems = notes[0].checklistItems as unknown as ChecklistItem[];
    expect(checklistItems).toHaveLength(1);
    expect(checklistItems[0].content).toBe(testItemContent);
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
    const checklistItemsData: ChecklistItem[] = [
      {
        id: itemId,
        content: testContext.prefix("Original item"),
        checked: false,
        order: 0,
      }
    ];

    const note = await testPrisma.note.create({
      data: {
        content: "",
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: checklistItemsData as unknown as Prisma.InputJsonValue,
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const originalContent = testContext.prefix("Original item");
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
      where: { id: note.id }
    });

    const checklistItems = updatedNote?.checklistItems as unknown as ChecklistItem[];
    expect(checklistItems[0].content).toBe(editedContent);
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
    const testItemsData: ChecklistItem[] = [
      {
        id: toggleItemId,
        content: testContext.prefix("Test item"),
        checked: false,
        order: 0,
      }
    ];

    const note = await testPrisma.note.create({
      data: {
        content: "",
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: testItemsData as unknown as Prisma.InputJsonValue,
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
      where: { id: note.id }
    });

    const checklistItems = updatedNote?.checklistItems as unknown as ChecklistItem[];
    expect(checklistItems[0].checked).toBe(true);
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
    const deleteItemsData: ChecklistItem[] = [
      {
        id: deleteItemId,
        content: testContext.prefix("Item to delete"),
        checked: false,
        order: 0,
      }
    ];

    const note = await testPrisma.note.create({
      data: {
        content: "",
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: deleteItemsData as unknown as Prisma.InputJsonValue,
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
    await expect(authenticatedPage.getByText(testContext.prefix("Item to delete"))).not.toBeVisible();

    // Verify in database
    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id }
    });

    const checklistItems = updatedNote?.checklistItems as unknown as ChecklistItem[];
    expect(checklistItems).toHaveLength(0);
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
          checklistItems: [
            { id: itemA1Id, content: testContext.prefix("Item A1"), checked: false, order: 0 },
            { id: itemA2Id, content: testContext.prefix("Item A2"), checked: false, order: 1 },
            { id: itemA3Id, content: testContext.prefix("Item A3"), checked: false, order: 2 },
          ]
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
        where: { id: note.id }
      });

      const checklistItems = (updatedNote?.checklistItems as unknown as ChecklistItem[])?.sort((a, b) => a.order - b.order);
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
          checklistItems: [
            { id: note1ItemId, content: testContext.prefix("Note1 Item"), checked: false, order: 0 },
          ]
        }
      });

      const note2 = await testPrisma.note.create({
        data: {
          content: "",
          color: "#fef3c7",
          boardId: board.id,
          createdBy: testContext.userId,
          checklistItems: [
            { id: note2ItemId, content: testContext.prefix("Note2 Item"), checked: false, order: 0 },
          ]
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
        where: { id: note1.id }
      });

      const updatedNote2 = await testPrisma.note.findUnique({
        where: { id: note2.id }
      });

      const checklistItems1 = updatedNote1?.checklistItems as unknown as ChecklistItem[];
      const checklistItems2 = updatedNote2?.checklistItems as unknown as ChecklistItem[];
      
      expect(checklistItems1).toHaveLength(1);
      expect(checklistItems1[0].content).toBe(testContext.prefix("Note1 Item"));
      expect(checklistItems2).toHaveLength(1);
      expect(checklistItems2[0].content).toBe(testContext.prefix("Note2 Item"));
    });
  });
});