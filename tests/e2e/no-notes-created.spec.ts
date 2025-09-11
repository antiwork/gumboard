import { test, expect } from "../fixtures/test-helpers";

test.describe("NoNotesCreated Empty State", () => {
  test("should display empty state and create note when button is clicked", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Empty Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: "A test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Wait for notes API call
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) && resp.request().method() === "GET"
    );

    // Verify empty state elements
    await expect(authenticatedPage.locator("text=No notes yet")).toBeVisible();
    await expect(
      authenticatedPage.locator(
        `text=Start organizing your ideas by creating your first note in ${boardName}.`
      )
    ).toBeVisible();

    const createButton = authenticatedPage.getByRole("button", { name: "Create your first note" });
    await expect(createButton).toBeVisible();

    // Click create button and wait for API response
    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    await createButton.click();
    await createNoteResponse;

    // Verify empty state is gone and note was created
    await expect(authenticatedPage.locator("text=No notes yet")).not.toBeVisible();

    const createdNotes = await testPrisma.note.findMany({
      where: { boardId: board.id, createdBy: testContext.userId },
    });
    expect(createdNotes).toHaveLength(1);
  });

  test("should show archive empty state without create button", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/boards/archive");

    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/boards/archive/notes") && resp.request().method() === "GET"
    );

    // Verify archive-specific empty state
    await expect(authenticatedPage.locator("text=No archived notes")).toBeVisible();
    await expect(
      authenticatedPage.locator("text=Notes that you archive will appear here")
    ).toBeVisible();

    // Verify no create button in archive
    await expect(
      authenticatedPage.getByRole("button", { name: "Create your first note" })
    ).not.toBeVisible();
  });

  test("should create note in first board from all-notes view", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: "A test board",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/boards/all-notes");

    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/boards/all-notes/notes") && resp.request().method() === "GET"
    );

    // Verify empty state and click create button
    await expect(authenticatedPage.locator("text=No notes yet")).toBeVisible();

    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/boards/all-notes/notes") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    await authenticatedPage.getByRole("button", { name: "Create your first note" }).click();
    await createNoteResponse;

    // Verify note was created in the board
    const createdNotes = await testPrisma.note.findMany({
      where: { boardId: board.id, createdBy: testContext.userId },
    });
    expect(createdNotes).toHaveLength(1);
  });
});
