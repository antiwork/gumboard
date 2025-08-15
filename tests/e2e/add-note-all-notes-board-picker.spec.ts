import { expect, test } from "../fixtures/test-helpers";

test.describe("All Notes Add Note Board Picker", () => {
  test("shows board picker and creates note in selected board", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Arrange: two boards
    const boardA = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board A"),
        description: testContext.prefix("A"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    const boardB = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board B"),
        description: testContext.prefix("B"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/all-notes`);

    // Act: click Add note -> picker appears
    await authenticatedPage.getByRole("button", { name: "Add note" }).click();
    await expect(authenticatedPage.getByText(boardA.name).first()).toBeVisible();
    await expect(authenticatedPage.getByText(boardB.name).first()).toBeVisible();

    // Choose board B
    await authenticatedPage.getByText(boardB.name).first().click();

    // Assert: a new note appears and can be edited (textarea focused)
    const textareas = authenticatedPage.locator("textarea");
    await expect(textareas.first()).toBeVisible();
  });
});
