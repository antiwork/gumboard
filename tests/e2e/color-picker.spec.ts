import { test, expect } from "../fixtures/test-helpers";
import { NOTE_COLORS } from "@/lib/constants";

test.describe("Color Picker", () => {
  test("should open color picker and change note color", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Color Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for color picker"),
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

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator('[data-testid="note-card"]')).toBeVisible();

    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await noteCard.hover();

    const colorPickerButton = authenticatedPage.locator('button[aria-label="Change note color"]');
    await expect(colorPickerButton).toBeVisible();

    await colorPickerButton.click();

    const colorPickerContent = authenticatedPage.locator('text="Choose color"');
    await expect(colorPickerContent).toBeVisible();

    for (const color of NOTE_COLORS) {
      const colorButton = authenticatedPage.locator(`button[aria-label="Select color ${color}"]`);
      await expect(colorButton).toBeVisible();
    }

    const newColor = "#dcfce7";
    const greenColorButton = authenticatedPage.locator(
      `button[aria-label="Select color ${newColor}"]`
    );
    await greenColorButton.click();

    await expect(colorPickerContent).not.toBeVisible();

    await expect(noteCard).toHaveCSS("background-color", "rgb(220, 252, 231)");

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
    });

    expect(updatedNote?.color).toBe(newColor);
  });

  test("should show current color as selected in color picker", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Color Selection Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for color selection"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const noteColor = "#dbeafe";
    await testPrisma.note.create({
      data: {
        color: noteColor,
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator('[data-testid="note-card"]')).toBeVisible();

    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await noteCard.hover();

    const colorPickerButton = authenticatedPage.locator('button[aria-label="Change note color"]');
    await colorPickerButton.click();

    const currentColorButton = authenticatedPage.locator(
      `button[aria-label="Select color ${noteColor}"]`
    );
    const currentBorderColor = await currentColorButton.evaluate(
      (el) => getComputedStyle(el).borderColor
    );
    expect(currentBorderColor).not.toBe("rgba(0, 0, 0, 0)");

    const otherColor = NOTE_COLORS.find((color) => color !== noteColor);
    if (otherColor) {
      const otherColorButton = authenticatedPage.locator(
        `button[aria-label="Select color ${otherColor}"]`
      );
      const otherBorderColor = await otherColorButton.evaluate(
        (el) => getComputedStyle(el).borderColor
      );
      expect(otherBorderColor).toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("should handle color picker for multiple notes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Multiple Notes Color Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for multiple notes"),
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

    await authenticatedPage.goto(`/boards/${board.id}`);

    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible();

    await noteCard.hover();

    const colorPicker = noteCard.locator('button[aria-label="Change note color"]');
    await colorPicker.click();

    const newColor = "#f3e8ff";
    const purpleButton = authenticatedPage.locator(`button[aria-label="Select color ${newColor}"]`);
    await purpleButton.click();

    await authenticatedPage.waitForTimeout(500);

    await expect(noteCard).toHaveCSS("background-color", "rgb(243, 232, 255)");

    await authenticatedPage.waitForTimeout(500);

    const updatedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
    });

    expect(updatedNote?.color).toBe(newColor);
  });

  test("should not show color picker for read-only notes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Read Only Color Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for read-only notes"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const otherUserId = `other_${testContext.userId}`;
    await testPrisma.user.create({
      data: {
        id: otherUserId,
        email: `other-${testContext.userEmail}`,
        name: `Other User ${testContext.testId}`,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: otherUserId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(authenticatedPage.locator('[data-testid="note-card"]')).toBeVisible();

    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await noteCard.hover();

    const colorPickerButton = authenticatedPage.locator('button[aria-label="Change note color"]');
    await expect(colorPickerButton).not.toBeVisible();

    await expect(noteCard.locator('button[aria-label="Change note color"]')).toHaveCount(0);
  });
});
