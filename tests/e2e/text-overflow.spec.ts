import { test, expect } from "../fixtures/test-helpers";

test.describe("Text Overflow and Card Expansion", () => {
  test("should handle long text without overflow and expand card height", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Text Overflow Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for text overflow"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create a note with long text content
    const longText = testContext.prefix(
      "This is a very long text that should display properly without causing horizontal overflow. " +
        "It contains multiple sentences to test the text display behavior. " +
        "The card should expand vertically to accommodate all this content without showing any scrollbars. " +
        "We want to ensure that users can read all the text comfortably without having to scroll within the card."
    );

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("item-1"),
              content: longText,
              checked: false,
              order: 0,
            },
            {
              id: testContext.prefix("item-2"),
              content: testContext.prefix("Short item"),
              checked: false,
              order: 1,
            },
            {
              id: testContext.prefix("item-3"),
              content: testContext.prefix(
                "Another long item to ensure the card expands properly with multiple long items"
              ),
              checked: false,
              order: 2,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Wait for the note card to be visible
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible();

    // Check that the long text is visible
    await expect(authenticatedPage.getByText(longText)).toBeVisible();

    // Get the note card's computed styles
    const noteCardBox = await noteCard.boundingBox();
    expect(noteCardBox).toBeTruthy();

    // Verify that the card has expanded to fit content (should be taller than a minimal height)
    expect(noteCardBox!.height).toBeGreaterThan(200);

    // Check that there's no overflow on the card
    const overflow = await noteCard.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        overflowY: styles.overflowY,
        overflowX: styles.overflowX,
      };
    });

    // The card should not have scroll overflow
    expect(overflow.overflowY).not.toBe("scroll");
    expect(overflow.overflowY).not.toBe("auto");
    expect(overflow.overflowX).not.toBe("scroll");
    expect(overflow.overflowX).not.toBe("auto");

    // Verify all items are visible without scrolling
    await expect(authenticatedPage.getByText(testContext.prefix("Short item"))).toBeVisible();
    await expect(
      authenticatedPage.getByText(
        testContext.prefix(
          "Another long item to ensure the card expands properly with multiple long items"
        )
      )
    ).toBeVisible();
  });

  test("should expand card height when typing long text", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Dynamic Expansion Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for dynamic card expansion"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Create a new note
    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await authenticatedPage.click('button:has-text("Add note")');
    await createNoteResponse;

    // Get the note card
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible();

    // Get initial height
    const initialBox = await noteCard.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialHeight = initialBox!.height;

    // Type long text into the new item input
    const newItemInput = authenticatedPage.locator("textarea").first();
    await expect(newItemInput).toBeVisible();

    const longText = testContext.prefix(
      "This is a very long text that I'm typing to test dynamic expansion. " +
        "As I type more and more text, the card should grow taller. " +
        "The height should adjust automatically without any scrollbars appearing. " +
        "This ensures a smooth user experience when entering long checklist items."
    );

    // Type the long text
    await newItemInput.fill(longText);

    // Wait a moment for the card to adjust
    await authenticatedPage.waitForTimeout(500);

    // Get the new height
    const expandedBox = await noteCard.boundingBox();
    expect(expandedBox).toBeTruthy();
    const expandedHeight = expandedBox!.height;

    // Verify the card has expanded
    expect(expandedHeight).toBeGreaterThan(initialHeight);

    // Save the item
    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await newItemInput.blur();
    await addItemResponse;

    // Verify the text is still visible after saving
    await expect(authenticatedPage.getByText(longText)).toBeVisible();

    // Verify the card still has no overflow
    const overflow = await noteCard.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        overflowY: styles.overflowY,
        overflowX: styles.overflowX,
      };
    });

    expect(overflow.overflowY).not.toBe("scroll");
    expect(overflow.overflowY).not.toBe("auto");
    expect(overflow.overflowX).not.toBe("scroll");
    expect(overflow.overflowX).not.toBe("auto");
  });
});
