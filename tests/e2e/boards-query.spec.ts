import { test, expect } from "../fixtures/test-helpers";

test("should exclude archived notes from boards query", async ({
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

  await testPrisma.note.create({
    data: {
      color: "#fef3c7",
      archivedAt: null,
      createdBy: testContext.userId,
      boardId: board.id,
    },
  });

  await testPrisma.note.create({
    data: {
      color: "#fef3c7",
      archivedAt: new Date(),
      createdBy: testContext.userId,
      boardId: board.id,
    },
  });

  const boardsResponse = authenticatedPage.waitForResponse(
    (resp) => resp.url().includes("/api/boards") && resp.ok()
  );
  await authenticatedPage.goto("/dashboard");
  await boardsResponse;

  const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
  await expect(boardCard).toContainText("1 note");
});
