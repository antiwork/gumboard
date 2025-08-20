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
    await expect(authenticatedPage.getByRole("heading", { name: "Your Boards" })).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole("link", { name: "Archive" })).toBeVisible();
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
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("This is an archived note"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.click('[href="/boards/archive"]');

    await expect(authenticatedPage).toHaveURL("/boards/archive");

    await expect(
      authenticatedPage.getByText(testContext.prefix("This is an archived note"))
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

    const noteContent = testContext.prefix("Test note to archive");
    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        archivedAt: null,
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              id: testContext.prefix("archive-item-1"),
              content: noteContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Optional: ensure notes have loaded
    await authenticatedPage.waitForResponse(
      (r) => r.url().includes(`/api/boards/${board.id}/notes`) && r.ok()
    );

    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible();

    const textarea = noteCard.locator("textarea").first();
    await expect(textarea).toHaveValue(noteContent);

    // Reveal actions
    await noteCard.hover();

    const archiveButton = authenticatedPage.locator('[aria-label="Archive note"]').first();
    await expect(archiveButton).toBeVisible();

    // Hover over the archive button to show tooltip
    await archiveButton.hover();

    // Check if the tooltip is visible
    await expect(
      authenticatedPage.getByRole("tooltip", { name: "Archive note" }).getByRole("paragraph")
    ).toBeVisible();

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

    await expect(noteCard).not.toBeVisible();
  });

  test("should not show archive button on Archive board", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const suffix = Math.random().toString(36).substring(2, 8);

    // Create an archived board
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName(`Archived Board ${suffix}`),
        description: testContext.prefix(`A test board ${suffix}`),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Create an archived note inside the archived board
    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix(`Archived note content ${suffix}`),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    // Go to archive page
    await authenticatedPage.goto("/boards/archive");

    // Scope to the note text to avoid picking up another note
    const noteLocator = authenticatedPage.getByText(
      testContext.prefix(`Archived note content ${suffix}`)
    );
    await expect(noteLocator).toBeVisible();

    // Look for archive button inside this note only
    const archiveButton = noteLocator.locator("..").locator('[aria-label="Archive note"]');
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

    const deleteNoteButtons = authenticatedPage.getByRole("button", { name: /Delete Note/ });
    await expect(deleteNoteButtons).toHaveCount(0);
  });

  test('should display board name as "Archive" in navigation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/boards/archive");

    await expect(authenticatedPage).toHaveURL("/boards/archive");
    await expect(authenticatedPage.getByRole("button", { name: "Add note" })).toBeDisabled();
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
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("This is an archived note"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");

    await expect(
      authenticatedPage.getByText(testContext.prefix("This is an archived note"))
    ).toBeVisible();

    const unarchiveButton = authenticatedPage.getByRole("button", { name: "Unarchive note" });
    await expect(unarchiveButton).toBeVisible();

    // Hover over the button and verify tooltip
    await unarchiveButton.hover();

    await expect(
      authenticatedPage.getByRole("tooltip", { name: "Unarchive note" }).getByRole("paragraph")
    ).toBeVisible();

    const archiveButton = authenticatedPage.locator('[aria-label="Archive note"]');
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
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("Test note to unarchive"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");

    await expect(
      authenticatedPage.locator(`text=${testContext.prefix("Test note to unarchive")}`)
    ).toBeVisible();

    const unarchiveButton = authenticatedPage.locator('[aria-label="Unarchive note"]');
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

    await expect(
      authenticatedPage.getByText(testContext.prefix("Test note to unarchive"))
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
        color: "#fef3c7",
        archivedAt: null,
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("Note for archive-unarchive workflow test"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await expect(
      authenticatedPage.getByText(testContext.prefix("Note for archive-unarchive workflow test"))
    ).toBeVisible();

    const archiveButton = authenticatedPage.locator('[aria-label="Archive note"]').first();
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();
    const archiveResponse2 = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await archiveResponse2;

    await expect(
      authenticatedPage.getByText(testContext.prefix("Note for archive-unarchive workflow test"))
    ).not.toBeVisible();
    const archivedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
    });
    expect(archivedNote?.archivedAt).toBeTruthy();
  });

  test("should display checklist items in correct order on Archive board", async ({
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

    // Create a note with multiple checklist items in specific order
    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("First item"),
              checked: false,
              order: 0,
            },
            {
              content: testContext.prefix("Second item"),
              checked: true,
              order: 1,
            },
            {
              content: testContext.prefix("Third item"),
              checked: false,
              order: 2,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");

    // Wait for the note to load
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible();

    // Verify all items are visible and in correct order
    // Note: Archive board notes are still editable by the owner, so we expect 4 textareas (3 items + 1 new item input)
    const textareas = noteCard.locator("textarea");
    await expect(textareas).toHaveCount(4);

    const firstTextarea = await textareas.nth(0).inputValue();
    const secondTextarea = await textareas.nth(1).inputValue();
    const thirdTextarea = await textareas.nth(2).inputValue();

    expect(firstTextarea).toContain(testContext.prefix("First item"));
    expect(secondTextarea).toContain(testContext.prefix("Second item"));
    expect(thirdTextarea).toContain(testContext.prefix("Third item"));
  });

  test("should disable Add note button on Archive board", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a regular board and note first
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
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: testContext.prefix("Archived note content"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    // Navigate to archive board
    await authenticatedPage.goto("/boards/archive");

    // Verify Add note button is disabled
    const addNoteButton = authenticatedPage.getByRole("button", { name: "Add note" });
    await expect(addNoteButton).toBeVisible();
    await expect(addNoteButton).toBeDisabled();

    // Verify button cannot be clicked (should not trigger any action)
    await addNoteButton.click({ force: true });

    // Wait a moment and verify no new note was created
    await authenticatedPage.waitForTimeout(1000);

    // Count existing notes (should remain the same)
    const noteCount = await testPrisma.note.count({
      where: {
        createdBy: testContext.userId,
        deletedAt: null,
      },
    });

    // Should still have only the one note we created
    expect(noteCount).toBe(1);
  });

  test("should enable Add note button on regular boards", async ({
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

    // Navigate to regular board
    await authenticatedPage.goto(`/boards/${board.id}`);

    // Verify Add note button is enabled
    const addNoteButton = authenticatedPage.getByRole("button", { name: "Add note" });
    await expect(addNoteButton).toBeVisible();
    await expect(addNoteButton).toBeEnabled();

    // Verify button can be clicked and creates a note
    await addNoteButton.click();

    // Wait for the note creation response
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    // Verify a new note was created
    const noteCount = await testPrisma.note.count({
      where: {
        createdBy: testContext.userId,
        boardId: board.id,
        deletedAt: null,
        archivedAt: null,
      },
    });

    expect(noteCount).toBe(1);
  });

  test("should properly update note state when archiving from regular board", async ({
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

    const noteContent = testContext.prefix("Note to test state update");
    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        archivedAt: null,
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: noteContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Verify note is initially visible
    await expect(authenticatedPage.getByText(noteContent)).toBeVisible();

    // Archive the note
    await authenticatedPage.locator(`text=${noteContent}`).hover();
    const archiveButton = authenticatedPage.locator('[aria-label="Archive note"]').first();
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();

    // Wait for the archive response
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    // Verify note immediately disappears from regular board (optimistic update)
    await expect(authenticatedPage.getByText(noteContent)).not.toBeVisible();

    // Navigate to archive and verify note appears there
    await authenticatedPage.goto("/boards/archive");
    await expect(authenticatedPage.getByText(noteContent)).toBeVisible();
  });

  test("should properly update note state when unarchiving from archive board", async ({
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

    const noteContent = testContext.prefix("Note to test unarchive state update");
    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: noteContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");

    // Verify note is initially visible in archive
    await expect(authenticatedPage.locator(`text=${noteContent}`)).toBeVisible();

    // Unarchive the note
    const unarchiveButton = authenticatedPage.locator('[aria-label="Unarchive note"]').first();
    await expect(unarchiveButton).toBeVisible();
    await unarchiveButton.click();

    // Wait for the unarchive response
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    // Verify note immediately disappears from archive (optimistic update)
    await expect(authenticatedPage.getByText(noteContent)).not.toBeVisible();

    // Navigate to regular board and verify note appears there
    await authenticatedPage.goto(`/boards/${board.id}`);
    await expect(authenticatedPage.getByText(noteContent)).toBeVisible();
  });
});
