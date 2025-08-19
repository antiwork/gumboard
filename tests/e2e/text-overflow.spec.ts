import { test, expect } from "../fixtures/test-helpers";

test.describe("Text Overflow and Card Expansion", () => {
  test("should handle long text without overflow and expand card height", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board for text overflow"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create a note with a very long checklist item
    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const longTextWithoutSpaces = "sihshshsihishsihishsihishsihishsihishsihwosjowsjwsojwojowjsojowsjowsjowsjowjsojowsjoxjsoxjsoxjosxjosxjosxjosxjosjosxjosxjosxjosjosoxjosojsowjsowjsowjsjowsjowjsjwsojw";
    
    await testPrisma.checklistItem.create({
      data: {
        id: testContext.prefix("item-1"),
        content: longTextWithoutSpaces,
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForSelector('[data-testid="note-card"]');

    // Get the note card element
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible();

    // Check that the note card is using grid layout (parent container)
    const boardArea = authenticatedPage.locator('.grid').filter({
      has: authenticatedPage.locator('[data-testid="note-card"]')
    }).first();
    await expect(boardArea).toBeVisible();

    // Verify the note has h-fit class for dynamic height
    await expect(noteCard).toHaveClass(/h-fit/);

    // Get the textarea with long text
    const textarea = noteCard.locator('textarea').filter({ hasText: longTextWithoutSpaces });
    await expect(textarea).toBeVisible();

    // Verify text wrapping classes are applied
    await expect(textarea).toHaveClass(/break-all/);
    await expect(textarea).toHaveClass(/whitespace-pre-wrap/);
    await expect(textarea).toHaveClass(/min-w-0/);

    // Verify no overflow on the textarea
    const textareaBox = await textarea.boundingBox();
    const noteCardBox = await noteCard.boundingBox();
    
    // The textarea should be within the note card bounds
    expect(textareaBox).toBeTruthy();
    expect(noteCardBox).toBeTruthy();
    if (textareaBox && noteCardBox) {
      expect(textareaBox.width).toBeLessThanOrEqual(noteCardBox.width);
    }
  });

  test("should expand card height when typing long text", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Dynamic Height Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test dynamic height expansion"),
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

    await testPrisma.checklistItem.create({
      data: {
        id: testContext.prefix("item-2"),
        content: "Initial text",
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForSelector('[data-testid="note-card"]');

    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    
    // Get initial height
    const initialBox = await noteCard.boundingBox();
    expect(initialBox).toBeTruthy();
    const initialHeight = initialBox?.height || 0;

    // Find and interact with the textarea
    const textarea = noteCard.locator('textarea').first();
    await expect(textarea).toBeVisible();
    
    // Click to edit and add long text
    await textarea.click();
    await textarea.selectText();
    
    // Type very long text that should cause expansion
    const veryLongText = "This is a very long text that will cause the card to expand. ".repeat(20);
    await textarea.type(veryLongText);

    // Wait for the height adjustment
    await authenticatedPage.waitForTimeout(500);

    // Get new height after typing
    const expandedBox = await noteCard.boundingBox();
    expect(expandedBox).toBeTruthy();
    const expandedHeight = expandedBox?.height || 0;

    // Verify that the card has expanded
    expect(expandedHeight).toBeGreaterThan(initialHeight);
  });

});
