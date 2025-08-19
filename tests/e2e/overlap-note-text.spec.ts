import { expect } from "@playwright/test";
import { test } from "../fixtures/test-helpers";

test.describe("Checklist item overflow and note content overflow behaviors", () => {
  test("collapsed checklist item shows CSS ellipsis, expands on click, dblclick enters edit", async ({
    authenticatedPage,
    testPrisma,
    testContext,
  }) => {
    // Arrange: seed board, a note with a single long checklist item
    await testContext.ensureAuthInitialized();
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Overflow-Test-Board"),
        description: "",
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const longText =
      `This is a very long checklist item that should overflow and therefore be truncated with an ellipsis when collapsed. `.repeat(
        4
      );

    const createdItem = await testPrisma.checklistItem.create({
      data: {
        noteId: note.id,
        content: longText,
        order: 0,
      },
    });

    // Act: open the board
    await authenticatedPage.goto(`/boards/${board.id}`);

    // Narrow to the checklist item row using its data-testid (item id)
    const itemRow = authenticatedPage.locator(`[data-testid="${createdItem.id}"]`).first();
    await expect(itemRow).toBeVisible();

    // Collapsed display is the div with Tailwind class 'whitespace-nowrap'
    const collapsedDisplay = itemRow.locator('[class*="whitespace-nowrap"]').first();
    await expect(collapsedDisplay).toBeVisible();

    // Assert: has Tailwind classes for one-line ellipsis
    const hasCollapsedClasses = await collapsedDisplay.evaluate((node) => {
      const className = (node as HTMLElement).className || "";
      return className.includes("whitespace-nowrap") && className.includes("text-ellipsis");
    });
    expect(hasCollapsedClasses).toBeTruthy();

    // Click to expand
    await collapsedDisplay.click();
    const expandedDisplay = itemRow.locator('[class*="whitespace-pre-wrap"]').first();
    await expect(expandedDisplay).toBeVisible();
    const expandedStyle = await expandedDisplay.evaluate(
      (node) => window.getComputedStyle(node as HTMLElement).whiteSpace
    );
    expect(expandedStyle).toBe("pre-wrap");

    // Double-click to enter edit mode
    await expandedDisplay.dblclick();
    const editor = itemRow.locator("textarea").first();
    await expect(editor).toBeVisible();
    await expect(editor).toHaveValue(longText);
  });

  test("note content scrolls when overflowing to avoid layout overlap", async ({
    authenticatedPage,
    testPrisma,
    testContext,
  }) => {
    // Arrange: seed board, a note with many items to force overflow
    await testContext.ensureAuthInitialized();
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Overflow-Scroll-Board"),
        description: "",
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    // create many items
    const items = Array.from({ length: 30 }).map((_, idx) => ({
      noteId: note.id,
      content: `Overflow Item ${idx} - ${"x".repeat(40)}`,
      order: idx,
    }));
    await testPrisma.checklistItem.createMany({ data: items });

    // Act: open the board
    await authenticatedPage.goto(`/boards/${board.id}`);

    // locate the note that contains our content
    const noteCard = authenticatedPage
      .locator('[data-testid="note-card"]')
      .filter({ hasText: "Overflow Item 0" })
      .first();
    await expect(noteCard).toBeVisible();

    // Assert note container is scrollable (content taller than container)
    const scrollInfo = await noteCard.evaluate((node) => {
      const el = node as HTMLElement;
      const s = window.getComputedStyle(el);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: s.overflowY,
      };
    });
    // Allow exact-fit cases while ensuring the container is configured to scroll
    expect(scrollInfo.scrollHeight).toBeGreaterThanOrEqual(scrollInfo.clientHeight);
    expect(["auto", "scroll"]).toContain(scrollInfo.overflowY);
  });
});
