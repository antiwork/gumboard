import { test, expect } from "../../fixtures/test-helpers";

test.describe("Board Card", () => {
  test("should exclude archived notes from the board card", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // create a board
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 1"),
        description: testContext.prefix("A test board 1"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // create 2 notes and archive one of them
    await testPrisma.note.createMany({
      data: [
        {
          color: "#fef3c7",
          archivedAt: null,
          createdBy: testContext.userId,
          boardId: board.id,
        },
        {
          color: "#fef3c7",
          archivedAt: new Date().toISOString(),
          createdBy: testContext.userId,
          boardId: board.id,
        },
      ],
    });

    // get the new board
    const boards = await testPrisma.board.findFirst({
      where: {
        id: board.id,
        organizationId: testContext.organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: {
              where: {
                deletedAt: null,
                archivedAt: null,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // assert that the notes count is 1
    expect(boards?._count.notes).toBe(1);

    // go to dashboard
    await authenticatedPage.goto("/dashboard");

    // expect the new board to be visible
    const newBoardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
    await expect(newBoardCard).toBeVisible();

    // go to card header then search for span that contain notes count
    const noteCount = newBoardCard.locator("span");
    await expect(noteCount).toHaveText(/^\d+ note(s)?$/);
  });

  test("should open board settings modal from dashboard three dots menu", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 1"),
        description: testContext.prefix("A test board 1"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`).first();
    await expect(boardCard).toBeVisible();

    await boardCard.hover();

    const threeDots = boardCard.locator('button[aria-label="Board settings"]');
    await expect(threeDots).toBeVisible();
    await threeDots.click();

    await expect(authenticatedPage.locator("text=Board settings")).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=Configure settings for "${board.name}" board.`)
    ).toBeVisible();

    const nameInput = authenticatedPage.locator('input[value="' + board.name + '"]');
    await expect(nameInput).toBeVisible();

    const descriptionInput = authenticatedPage.locator('input[value="' + board.description + '"]');
    await expect(descriptionInput).toBeVisible();

    const slackCheckbox = authenticatedPage.locator("#sendSlackUpdates");
    await expect(slackCheckbox).toBeChecked();
  });

  test("should delete board from dashboard three dots menu", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board to Delete"),
        description: testContext.prefix("A test board to delete"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`).first();
    await expect(boardCard).toBeVisible();

    await boardCard.hover();

    const threeDots = boardCard.locator('button[aria-label="Board settings"]');
    await expect(threeDots).toBeVisible();
    await threeDots.click();

    await expect(authenticatedPage.locator("text=Board settings")).toBeVisible();

    await authenticatedPage.getByRole("button", { name: "Delete Board" }).click();

    await expect(authenticatedPage.getByRole("heading", { name: "Delete Board" })).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=Are you sure you want to delete "${board.name}"?`)
    ).toBeVisible();

    const deleteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}`) &&
        resp.request().method() === "DELETE" &&
        resp.ok()
    );
    await authenticatedPage.getByRole("button", { name: "Delete Board" }).last().click();
    await deleteResponse;

    const deletedBoardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(deletedBoardCard).not.toBeVisible();

    const deletedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(deletedBoard).toBeNull();
  });
});
