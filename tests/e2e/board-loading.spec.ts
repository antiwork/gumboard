import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Page Loading", () => {
  test("should fetch board data on initial load", async ({
    authenticatedPage,
    testPrisma,
    testContext,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("Board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("First item"),
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    const boardResponse = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes(`/api/boards/${board.id}`) && resp.ok()
    );
    const notesResponse = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes(`/api/boards/${board.id}/notes`) && resp.ok()
    );

    await authenticatedPage.goto(`/boards/${board.id}`);

    await Promise.all([boardResponse, notesResponse]);

    await expect(authenticatedPage.locator(`text=${board.name}`)).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("First item")}`)
    ).toBeVisible();
  });
});

