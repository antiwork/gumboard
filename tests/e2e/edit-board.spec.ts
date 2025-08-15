import { test, expect } from "../fixtures/test-helpers";

test.describe("Edit Board", () => {
  test("should edit board title and description from dashboard", async ({ authenticatedPage, testContext, testPrisma }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Original Board"),
        description: testContext.prefix("Original description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.click(
      `[data-board-id="${board.id}"] [aria-label="Edit board"]`
    );

    const newName = testContext.getBoardName("Updated Board");
    const newDescription = testContext.prefix("Updated description");

    await authenticatedPage.fill('input[placeholder*="board name"]', newName);
    await authenticatedPage.fill(
      'input[placeholder*="board description"]',
      newDescription
    );

    const updateResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await authenticatedPage.click('button:has-text("Save changes")');
    await updateResponse;

    await expect(
      authenticatedPage.locator(
        `[data-board-id="${board.id}"] [data-slot="card-title"]:has-text("${newName}")`
      )
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(
        `[data-board-id="${board.id}"] :text("${newDescription}")`
      )
    ).toBeVisible();

    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(updatedBoard?.name).toBe(newName);
    expect(updatedBoard?.description).toBe(newDescription);
  });
});