import { test, expect } from "../fixtures/test-helpers";

test.describe("Home Page", () => {
  test("sticky notes demo - should handle all UI interactions correctly", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create demo board and notes with real data for the home page
    const demoBoard = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Demo Board"),
        description: testContext.prefix("Demo board for testing"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create some demo notes with checklist items
    const note1 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: demoBoard.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("101"),
              content: testContext.prefix("Finance update by Friday"),
              checked: false,
              order: 0,
            },
            {
              id: testContext.prefix("102"),
              content: testContext.prefix("Helper Tix (Mon-Fri)"),
              checked: false,
              order: 1,
            },
          ],
        },
      },
    });

    const note2 = await testPrisma.note.create({
      data: {
        color: "#ddd6fe",
        boardId: demoBoard.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("301"),
              content: testContext.prefix("Metabase queries"),
              checked: false,
              order: 0,
            },
            {
              id: testContext.prefix("302"),
              content: testContext.prefix("Review support huddle"),
              checked: false,
              order: 1,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${demoBoard.id}`);
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Finance update by Friday")}`)
    ).toBeVisible();
    let initialNotes = await authenticatedPage.getByTestId("new-item").count();

    // Test 1: Add a new note
    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await authenticatedPage.getByRole("button", { name: "Add Note" }).click();
    await createNoteResponse;
    // New notes are created empty, verify we have one more new item input
    await expect(authenticatedPage.getByTestId("new-item")).toHaveCount(initialNotes + 1);
    initialNotes += 1;

    // Verify new note was created in database
    const notesAfterAdd = await testPrisma.note.count({
      where: { boardId: demoBoard.id, deletedAt: null },
    });
    expect(notesAfterAdd).toBe(3); // 2 original + 1 new

    // Test 2: Toggle checklist item (check/uncheck)
    const initialCheckedCount = await authenticatedPage
      .getByRole("checkbox", { checked: true })
      .count();
    const uncheckedCheckbox = authenticatedPage
      .getByTestId(testContext.prefix("102"))
      .getByRole("checkbox");

    const toggleResponse1 = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await uncheckedCheckbox.click();
    await toggleResponse1;

    await expect(authenticatedPage.getByRole("checkbox", { checked: true })).toHaveCount(
      initialCheckedCount + 1
    );

    // Verify checkbox state in database
    const toggledItem = await testPrisma.checklistItem.findFirst({
      where: { id: testContext.prefix("102") },
    });
    expect(toggledItem?.checked).toBe(true);

    const toggleResponse2 = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await uncheckedCheckbox.click();
    await toggleResponse2;

    await expect(authenticatedPage.getByRole("checkbox", { checked: true })).toHaveCount(
      initialCheckedCount
    );

    // Verify checkbox state in database
    const untoggledItem = await testPrisma.checklistItem.findFirst({
      where: { id: testContext.prefix("102") },
    });
    expect(untoggledItem?.checked).toBe(false);

    // Test 3: Add a new checklist item using always-available input
    const newItemInput = authenticatedPage.getByTestId("new-item").first().locator("textarea");
    const newItemContent = testContext.prefix("Brand new task item");
    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await expect(newItemInput).toBeVisible();
    await newItemInput.fill(newItemContent);
    await newItemInput.blur();
    await addItemResponse;
    await expect(authenticatedPage.getByText(newItemContent)).toBeVisible();

    // Verify new item was added to database
    const newItem = await testPrisma.checklistItem.findFirst({
      where: { content: newItemContent },
    });
    expect(newItem).toBeTruthy();
    expect(newItem?.content).toBe(newItemContent);

    // Test 4: Edit existing checklist item content
    const originalFinanceText = testContext.prefix("Finance update by Friday");
    const updatedFinanceText = testContext.prefix("Updated Finance deadline");
    await authenticatedPage.getByText(originalFinanceText).click();
    const editInput = authenticatedPage.locator("textarea").first();
    await expect(editInput).toBeVisible();
    const editResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await editInput.fill(updatedFinanceText);
    await editInput.blur(); // Use blur instead of Enter to save the edit
    await editResponse;
    await expect(authenticatedPage.getByText(updatedFinanceText)).toBeVisible();

    // Verify edit was saved to database
    const editedItem = await testPrisma.checklistItem.findFirst({
      where: { content: updatedFinanceText },
    });
    expect(editedItem).toBeTruthy();
    expect(editedItem?.content).toBe(updatedFinanceText);

    // Test 5: Delete a checklist item
    const deleteItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await authenticatedPage
      .getByTestId(testContext.prefix("101"))
      .getByRole("button", { name: "Delete item", exact: true })
      .click();
    await deleteItemResponse;
    await expect(authenticatedPage.getByTestId(testContext.prefix("101"))).not.toBeAttached();

    // Verify item was deleted from database
    const deletedItem = await testPrisma.checklistItem.findFirst({
      where: { id: testContext.prefix("101") },
    });
    expect(deletedItem).toBeNull();

    // Test 6: Delete entire note
    const deleteNoteButton = authenticatedPage.getByRole("button", {
      name: `Delete Note ${note1.id}`,
      exact: true,
    });

    // Wait for the DELETE request to be made
    const deleteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/${note1.id}`) &&
        resp.request().method() === "DELETE" &&
        resp.ok()
    );

    // Click delete button (triggers optimistic UI update with undo feature)
    await deleteNoteButton.click();

    // Verify UI updates immediately (optimistic update)
    await expect(deleteNoteButton).not.toBeAttached();
    await expect(authenticatedPage.getByTestId("new-item")).toHaveCount(initialNotes - 1);
    initialNotes -= 1;

    // Wait for the actual DELETE request to complete
    await deleteResponse;

    // Now verify note was actually deleted from database
    const notesAfterDelete = await testPrisma.note.count({
      where: { boardId: demoBoard.id, archivedAt: null, deletedAt: null },
    });
    expect(notesAfterDelete).toBe(2); // 3 - 1 deleted

    // Test 7: Split checklist item (Enter in middle of text) - use the third note we created
    const splitNewItemInput = authenticatedPage.getByTestId("new-item").first().locator("textarea");
    const splitTestContent = testContext.prefix("Split this item here");
    const addSplitItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await expect(splitNewItemInput).toBeVisible();
    await splitNewItemInput.fill(splitTestContent);
    await splitNewItemInput.blur();
    await addSplitItemResponse;
    await expect(authenticatedPage.getByText(splitTestContent)).toBeVisible();

    // Now split the item
    await authenticatedPage.getByText(splitTestContent).click();
    const splitInput = authenticatedPage.locator("textarea").filter({ hasText: splitTestContent });
    await expect(splitInput).toBeVisible();

    const splitResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    // Move cursor to split after "Split this" (10 characters from start)
    await splitInput.press("Home");
    for (let i = 0; i < 10; i++) {
      await splitInput.press("ArrowRight");
    }
    await splitInput.press("Enter");
    await splitResponse;

    // Verify the split created two items
    await expect(authenticatedPage.getByText("Split this")).toBeVisible();
    await expect(authenticatedPage.getByText("item here")).toBeVisible();

    // Test 8: Should re-order items
    const sourceElementText = testContext.prefix("Metabase queries");
    const targetElementText = testContext.prefix("Review support huddle");
    const sourceElement = authenticatedPage.locator(`text=${sourceElementText}`);
    const targetElement = authenticatedPage.locator(`text=${targetElementText}`);

    const sourceTestId = testContext.prefix("301");
    const targetTestId = testContext.prefix("302");

    await expect(authenticatedPage.getByTestId(sourceTestId)).toHaveAttribute(
      "data-testorder",
      "0"
    );
    await expect(authenticatedPage.getByTestId(targetTestId)).toHaveAttribute(
      "data-testorder",
      "1"
    );

    await expect(sourceElement).toBeVisible();

    const targetBox = await targetElement.boundingBox();
    if (!targetBox) throw Error("Target element not found");

    const reorderResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${demoBoard.id}/notes/`) &&
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

    await expect(authenticatedPage.getByTestId(targetTestId)).toHaveAttribute(
      "data-testorder",
      "0"
    );
    await expect(authenticatedPage.getByTestId(sourceTestId)).toHaveAttribute(
      "data-testorder",
      "1"
    );

    // Verify reorder was saved to database
    const reorderedItems = await testPrisma.checklistItem.findMany({
      where: { noteId: note2.id },
      orderBy: { order: "asc" },
    });
    expect(reorderedItems[0].content).toBe(targetElementText);
    expect(reorderedItems[1].content).toBe(sourceElementText);
  });
});
