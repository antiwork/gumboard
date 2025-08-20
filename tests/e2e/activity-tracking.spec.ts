import { test, expect } from "../fixtures/test-helpers";

test.describe("Activity Tracking", () => {
  test("should display last activity for boards", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Activity Test Board"),
        description: testContext.prefix("Testing activity tracking"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });


    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState("networkidle");

 
    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(boardCard).toBeVisible({ timeout: 10000 });

   
    await expect(boardCard).toContainText("Last active:");


    const lastActiveText = await boardCard.textContent();
    expect(lastActiveText).toContain("Last active:");
    expect(lastActiveText).not.toContain("Last active: ago"); 
  });

  test("should show last activity on dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Simple Activity Test"),
        description: testContext.prefix("Testing basic activity display"),
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
    expect(boardText).not.toContain("Last active: ago");
    expect(boardText).toMatch(/Last active: (Just now|\d+[dhms])/);
  });

  test("should handle boards with no notes", async ({
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
    
    // Should show 0 notes
    await expect(boardCard).toContainText("0 notes");
  });
});
