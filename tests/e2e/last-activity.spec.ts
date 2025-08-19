import { test, expect } from "../fixtures/test-helpers";

test("should display last activity on dashboard board cards", async ({
  authenticatedPage,
  testContext,
  testPrisma,
}) => {
  const board = await testPrisma.board.create({
    data: {
      name: testContext.getBoardName("Test Board"),
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
    },
  });

  await authenticatedPage.goto("/dashboard");

  const boardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
  await expect(boardCard).toBeVisible();
  await expect(boardCard.locator("text=/Last activity:/")).toBeVisible();
});

test("should update last activity when note is modified", async ({
  authenticatedPage,
  testContext,
  testPrisma,
}) => {
  const board = await testPrisma.board.create({
    data: {
      name: testContext.getBoardName("Test Board"),
      description: testContext.prefix("A test board"),
      createdBy: testContext.userId,
      organizationId: testContext.organizationId,
    },
  });

  const itemId = testContext.prefix("item-1");
  const originalContent = testContext.prefix("Test item");

  await testPrisma.note.create({
    data: {
      color: "#fef3c7",
      boardId: board.id,
      createdBy: testContext.userId,
      checklistItems: {
        create: [
          {
            id: itemId,
            content: originalContent,
            checked: false,
            order: 0,
          },
        ],
      },
    },
  });

  await authenticatedPage.goto(`/boards/${board.id}`);

  await authenticatedPage.getByText(originalContent).click();
  const editInput = authenticatedPage.getByTestId(itemId).getByRole("textbox");

  const saveResponse = authenticatedPage.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/boards/${board.id}/notes/`) && resp.request().method() === "PUT"
  );

  await editInput.fill(testContext.prefix("Updated item"));
  await authenticatedPage.click("body");
  await saveResponse;

  await authenticatedPage.goto("/dashboard");
  const boardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
  await expect(boardCard.locator("text=/Last activity: now/")).toBeVisible();
});
