import { test, expect } from "../../fixtures/test-helpers";

test.describe("Activity Tracking", () => {
  test("should display last activity on dashboard boards", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Activity Test"),
        description: testContext.prefix("Testing activity display"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await expect(boardCard).toContainText("Last active:");

    const boardText = await boardCard.textContent();
    expect(boardText).toMatch(/Last active: (Just now|\d+[dhms]( \d+[dhms])? ago|\d+\/\d+\/\d+)/);
    expect(boardText).not.toContain("Last active: ago");
  });

  test("should show enhanced time formatting with hours and minutes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Time Format Test"),
        description: testContext.prefix("Testing enhanced time formatting"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const pastTime = new Date(Date.now() - 1.5 * 60 * 60 * 1000);
    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        updatedAt: pastTime,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("Old task"),
              checked: false,
              order: 0,
              updatedAt: pastTime,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await expect(boardCard).toContainText("Last active:");

    const boardText = await boardCard.textContent();
    expect(boardText).toMatch(/Last active: (\d+h( \d+m)? ago|Just now)/);
  });

  test("should handle empty boards correctly", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Empty Board"),
        description: testContext.prefix("Board with no notes"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await expect(boardCard).toContainText("Last active:");
    await expect(boardCard).toContainText("0 notes");

    const boardText = await boardCard.textContent();
    expect(boardText).toMatch(/Last active: (Just now|\d+[dhms])/);
    expect(boardText).not.toContain("Last active: ago");
  });

  test("should update activity when note is created via API", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("API Activity Test"),
        description: testContext.prefix("Testing API activity updates"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("Recent task"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(boardCard).toBeVisible({ timeout: 10000 });
    await expect(boardCard).toContainText("Last active:");
    await expect(boardCard).toContainText("1 note");

    const boardText = await boardCard.textContent();
    expect(boardText).toMatch(/Last active: (Just now|\d+m ago)/);
  });
});
