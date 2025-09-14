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
});

test.describe("Board Card context menu", () => {
  test("should open context menu on right click", async ({
    authenticatedPage,
    testPrisma,
    testContext,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board 1"),
        description: testContext.prefix("A test board 1"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/dashboard`);
    const boardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
    console.log(boardCard);

    await boardCard.click({ button: "right" });
    await expect(authenticatedPage.getByTestId("board-card-context-menu")).toBeVisible();
  });

  test("should toggle slack updates status on click", async ({
    authenticatedPage,
    testPrisma,
    testContext,
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

    await authenticatedPage.goto(`/dashboard`);
    const boardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
    await boardCard.click({ button: "right" });
    await authenticatedPage
      .getByTestId("board-card-context-menu")
      .getByText("Slack Updates")
      .click();
    await expect(authenticatedPage.getByTestId("board-card-context-menu")).not.toBeVisible();

    const updatedBoard = await testPrisma.board.findFirst({
      where: {
        id: board.id,
        organizationId: testContext.organizationId,
      },
      select: {
        sendSlackUpdates: true,
      },
      orderBy: { createdAt: "desc" },
    });

    expect(updatedBoard?.sendSlackUpdates).toBe(false);
  });

  test("should delete board on click of delete button", async ({
    authenticatedPage,
    testPrisma,
    testContext,
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

    await authenticatedPage.goto(`/dashboard`);
    const boardCard = authenticatedPage.locator(`[href="/boards/${board.id}"]`);
    await boardCard.click({ button: "right" });
    await authenticatedPage
      .getByTestId("board-card-context-menu")
      .getByText("Delete Board")
      .click();

    await expect(authenticatedPage.getByTestId("board-card-context-menu")).not.toBeVisible();
    await expect(authenticatedPage.locator(`[href="/boards/${board.id}"]`)).not.toBeVisible();

    const updatedBoard = await testPrisma.board.findFirst({
      where: {
        id: board.id,
        organizationId: testContext.organizationId,
      },
    });

    expect(updatedBoard).toBeNull();
  });
});
