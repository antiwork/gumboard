import { test, expect } from "../fixtures/test-helpers";

test.describe("Notes Multi-Select", () => {
  test("click, ctrl+click, double-click, click-outside, Delete and Ctrl+Q", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("MultiSelect Board"),
        description: testContext.prefix("Board for multiselect tests"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create three notes
    const n1 = await testPrisma.note.create({
      data: { color: "#fff2a8", boardId: board.id, createdBy: testContext.userId },
    });
    const n2 = await testPrisma.note.create({
      data: { color: "#fff2a8", boardId: board.id, createdBy: testContext.userId },
    });
    const n3 = await testPrisma.note.create({
      data: { color: "#fff2a8", boardId: board.id, createdBy: testContext.userId },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const card = (id: string) =>
      authenticatedPage.locator(`[data-testid="note-card"][data-note-id="${id}"]`).first();

    await expect(card(n1.id)).toBeVisible();
    await expect(card(n2.id)).toBeVisible();
    await expect(card(n3.id)).toBeVisible();

    // Click selects exclusively
    await card(n1.id).click();
    await expect(card(n1.id)).toHaveAttribute("data-selected", "true");

    // Ctrl+click adds another
    await card(n2.id).click({ modifiers: ["Control"] });
    await expect(card(n1.id)).toHaveAttribute("data-selected", "true");
    await expect(card(n2.id)).toHaveAttribute("data-selected", "true");

    // Double click selects exclusively
    await card(n3.id).dblclick();
    await expect(card(n3.id)).toHaveAttribute("data-selected", "true");
    await expect(card(n1.id)).not.toHaveAttribute("data-selected", "true");
    await expect(card(n2.id)).not.toHaveAttribute("data-selected", "true");

    // Ctrl+click add then click outside clears
    await card(n1.id).click({ modifiers: ["Control"] });
    await expect(card(n1.id)).toHaveAttribute("data-selected", "true");
    await authenticatedPage.click("body", { position: { x: 0, y: 0 } });
    await expect(card(n1.id)).not.toHaveAttribute("data-selected", "true");
    await expect(card(n3.id)).not.toHaveAttribute("data-selected", "true");

    // Select two and press Delete to remove them
    await card(n1.id).click();
    await card(n2.id).click({ modifiers: ["Control"] });
    await authenticatedPage.keyboard.press("Delete");

    // Both should be deleted from UI after optimistic update
    await expect(card(n1.id)).toHaveCount(0);
    await expect(card(n2.id)).toHaveCount(0);

    // Create two more notes to test archive shortcut
    const a1 = await testPrisma.note.create({
      data: { color: "#fff2a8", boardId: board.id, createdBy: testContext.userId },
    });
    const a2 = await testPrisma.note.create({
      data: { color: "#fff2a8", boardId: board.id, createdBy: testContext.userId },
    });

    await authenticatedPage.reload();
    await expect(card(a1.id)).toBeVisible();
    await expect(card(a2.id)).toBeVisible();

    await card(a1.id).click();
    await card(a2.id).click({ modifiers: ["Control"] });

    // Ctrl+Q to archive
    await authenticatedPage.keyboard.down("Control");
    await authenticatedPage.keyboard.press("KeyQ");
    await authenticatedPage.keyboard.up("Control");

    // Should disappear optimistically
    await expect(card(a1.id)).toHaveCount(0);
    await expect(card(a2.id)).toHaveCount(0);
  });
});
