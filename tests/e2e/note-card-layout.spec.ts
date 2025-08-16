import { test, expect } from "../fixtures/test-helpers";

// Test to ensure checklist item editing doesn't overflow note card
// verifying fix from "enhance boards note card layout flow" feature.

test.describe("Note card layout", () => {
  test("keeps checklist items within card when editing", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create board and note
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Board for layout test"),
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

    const itemId = testContext.prefix("item-1");
    const originalContent = testContext.prefix("Original item");

    await testPrisma.checklistItem.create({
      data: {
        id: itemId,
        content: originalContent,
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Edit item with long content that would overflow if card height fixed
    const longContent = testContext.prefix("Long content ".repeat(20));
    await authenticatedPage.getByText(originalContent).click();
    const editInput = authenticatedPage.getByTestId(itemId).getByRole("textbox");
    await expect(editInput).toBeVisible();
    const saveEditResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await editInput.fill(longContent);
    await authenticatedPage.click("body");
    await saveEditResponse;

    // Ensure edited content is visible
    await expect(authenticatedPage.getByText(longContent)).toBeVisible();

    // Verify note card height expands to fit content (no overflow)
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    const hasOverflow = await noteCard.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(hasOverflow).toBe(false);
  });
});
