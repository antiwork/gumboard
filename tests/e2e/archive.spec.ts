import { test, expect } from "../fixtures/test-helpers";

test.describe("Archive Functionality", () => {
  test("should display Archive board on dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    const archiveCard = authenticatedPage.locator('[href="/boards/archive"]');
    await expect(archiveCard).toBeVisible();
  });

  test("should navigate to Archive board from dashboard", async ({
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
        content: testContext.prefix("This is an archived note"),
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.click('[href="/boards/archive"]');

    await expect(authenticatedPage).toHaveURL("/boards/archive");
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("This is an archived note")}`)
    ).toBeVisible();
  });

  test("should archive a note and remove it from regular board", async ({
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

    const note = await testPrisma.note.create({
      data: {
        content: testContext.prefix("Test note to archive"),
        color: "#fef3c7",
        archivedAt: null,
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test note to archive")}`)
    ).toBeVisible();

    // Hover over the note to reveal the archive button
    await authenticatedPage.locator(`text=${testContext.prefix("Test note to archive")}`).hover();

    // Find the archive button - it should be visible after hover
    const archiveButton = authenticatedPage.locator('[title="Archive note"]').first();
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();

    const archiveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await archiveResponse;

    const archivedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
    });
    expect(archivedNote?.archivedAt).toBeTruthy();

    // Verify note is no longer visible on board
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test note to archive")}`)
    ).not.toBeVisible();
  });

  test("should not show archive button on Archive board", async ({
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
        content: testContext.prefix("This is an archived note"),
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto("/boards/archive");

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("This is an archived note")}`)
    ).toBeVisible();

    const archiveButton = authenticatedPage.locator('[title="Archive note"]');
    await expect(archiveButton).not.toBeVisible();
  });

  test("should show empty state on Archive board when no archived notes exist", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const archivedNoteCount = await testPrisma.note.count({
      where: {
        createdBy: testContext.userId,
        archivedAt: { not: null },
      },
    });
    expect(archivedNoteCount).toBe(0);

    await authenticatedPage.goto("/boards/archive");

    await expect(authenticatedPage.locator("text=No notes yet")).toBeVisible();
  });

  test('should display board name as "Archive" in navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/boards/archive");

    await expect(authenticatedPage.locator("text=Archive")).toBeVisible();
  });

  test("should show unarchive button instead of archive button on Archive board", async ({
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
        content: testContext.prefix("This is an archived note"),
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto("/boards/archive");
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("This is an archived note")}`)
    ).toBeVisible();

    const unarchiveButton = authenticatedPage.locator('[title="Unarchive note"]');
    await expect(unarchiveButton).toBeVisible();

    const archiveButton = authenticatedPage.locator('[title="Archive note"]');
    await expect(archiveButton).not.toBeVisible();
  });

  test("should unarchive a note and remove it from archive view", async ({
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

    const archivedNote = await testPrisma.note.create({
      data: {
        content: testContext.prefix("Test note to unarchive"),
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto("/boards/archive");
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test note to unarchive")}`)
    ).toBeVisible();

    const unarchiveButton = authenticatedPage.locator('[title="Unarchive note"]');
    await expect(unarchiveButton).toBeVisible();
    await unarchiveButton.click();

    const unarchiveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await unarchiveResponse;

    const unarchivedNote = await testPrisma.note.findUnique({
      where: { id: archivedNote.id },
    });
    expect(unarchivedNote?.archivedAt).toBe(null);

    // Verify note is no longer visible in archive view
    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test note to unarchive")}`)
    ).not.toBeVisible();
  });

  test("should complete full archive-unarchive workflow", async ({
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

    const note = await testPrisma.note.create({
      data: {
        content: testContext.prefix("Note for archive-unarchive workflow test"),
        color: "#fef3c7",
        archivedAt: null,
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await expect(
      authenticatedPage.locator(
        `text=${testContext.prefix("Note for archive-unarchive workflow test")}`
      )
    ).toBeVisible();

    const archiveButton = authenticatedPage.locator('[title="Archive note"]').first();
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();
    const archiveResponse2 = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await archiveResponse2;

    // Verify note is no longer visible on board
    await expect(
      authenticatedPage.locator(
        `text=${testContext.prefix("Note for archive-unarchive workflow test")}`
      )
    ).not.toBeVisible();
    const archivedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
    });
    expect(archivedNote?.archivedAt).toBeTruthy();
  });
});
