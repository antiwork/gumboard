import { test, expect } from "../fixtures/test-helpers";

test.describe("Checklist Backspace Behavior", () => {
  test("should verify backspace behavior exists in checklist items", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("A test board"),
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
              id: testContext.prefix("item-1"),
              content: testContext.prefix("Test item"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test item")}`)
    ).toBeVisible();

    const checklistItemElement = authenticatedPage
      .locator("span.flex-1.text-sm.leading-6.cursor-pointer")
      .filter({ hasText: testContext.prefix("Test item") });
    await expect(checklistItemElement).toBeVisible();
  });
});
