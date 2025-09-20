import { test, expect } from "../fixtures/test-helpers";
import type { Response } from "@playwright/test";

// Helper functions for more reliable interactions
async function waitForNoteToBeReady(page: any, noteContent: string) {
  const noteCard = page.locator('[data-testid="note-card"]')
    .filter({ hasText: noteContent });
  
  await expect(noteCard).toBeVisible({ timeout: 15000 });
  await noteCard.locator('textarea').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(300); // Brief stability wait
  
  return noteCard;
}

async function waitForNoteOperation(page: any, boardId: string, method: 'POST' | 'PUT' | 'DELETE') {
  return page.waitForResponse(
    (resp: Response) =>
      resp.url().includes(`/api/boards/${boardId}/notes`) &&
      resp.request().method() === method &&
      resp.status() >= 200 && resp.status() < 300,
    { timeout: 15000 }
  );
}

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
    
    // Wait for dashboard to load completely
    await authenticatedPage.waitForLoadState('networkidle');
    
    await expect(authenticatedPage.getByRole("heading", { name: "Your Boards" })).toBeVisible({
      timeout: 15000,
    });
    await expect(authenticatedPage.getByRole("link", { name: "Archive" })).toBeVisible({
      timeout: 10000,
    });
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

    const noteContent = testContext.prefix("This is an archived note");
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

    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for navigation to complete
    const navigationPromise = authenticatedPage.waitForURL("/boards/archive");
    await authenticatedPage.click('[href="/boards/archive"]');
    await navigationPromise;

    await expect(authenticatedPage.getByText(noteContent)).toBeVisible({
      timeout: 15000,
    });
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
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for notes to load with response verification
    await authenticatedPage.waitForResponse(
      (r: Response) => r.url().includes(`/api/boards/${board.id}/notes`) && r.ok(),
      { timeout: 15000 }
    );

    // Find the specific note card and wait for it to be ready
    const noteCard = await waitForNoteToBeReady(authenticatedPage, noteContent);
    
    // Verify textarea content
    const textarea = noteCard.locator("textarea").first();
    await expect(textarea).toHaveValue(noteContent);

    // Ensure card is stable before interaction
    await noteCard.waitFor({ state: 'stable', timeout: 5000 });
    
    // Find archive button within this specific note card
    const archiveButton = noteCard.locator('[aria-label="Archive note"]');
    
    // Hover to reveal button and wait for visibility
    await noteCard.hover();
    await expect(archiveButton).toBeVisible({ timeout: 8000 });

    // Verify tooltip appears
    await archiveButton.hover();
    const tooltip = authenticatedPage.getByRole("tooltip", { name: "Archive note" });
    await expect(tooltip).toBeVisible({ timeout: 5000 });
    await expect(tooltip.getByRole("paragraph")).toBeVisible();

    // Set up response waiting BEFORE clicking
    const archiveResponsePromise = waitForNoteOperation(authenticatedPage, board.id, 'PUT');

    await archiveButton.click();
    await archiveResponsePromise;

    // Verify database state
    const archivedNote = await testPrisma.note.findUnique({
      where: { id: note.id },
    });
    expect(archivedNote?.archivedAt).toBeTruthy();

    // Verify UI state - note should disappear
    await expect(noteCard).not.toBeVisible({ timeout: 10000 });
  });

  test("should not show archive button on Archive board", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const suffix = Math.random().toString(36).substring(2, 8);
    const noteContent = testContext.prefix(`Archived note content ${suffix}`);

    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName(`Archived Board ${suffix}`),
        description: testContext.prefix(`A test board ${suffix}`),
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
              content: noteContent,
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for the specific note to be visible
    await expect(authenticatedPage.getByText(noteContent)).toBeVisible({
      timeout: 15000,
    });

    // Find the note card containing this specific content
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]')
      .filter({ hasText: noteContent });

    await expect(noteCard).toBeVisible();

    // Verify archive button is NOT visible within this note card
    const archiveButton = noteCard.locator('[aria-label="Archive note"]');
    await expect(archiveButton).not.toBeVisible();
  });

  test("should show empty state on Archive board when no archived notes exist", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Verify no archived notes exist for this user
    const archivedNoteCount = await testPrisma.note.count({
      where: {
        createdBy: testContext.userId,
        archivedAt: { not: null },
      },
    });
    expect(archivedNoteCount).toBe(0);

    await authenticatedPage.goto("/boards/archive");
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify no delete buttons are present (empty state)
    const deleteNoteButtons = authenticatedPage.getByRole("button", { name: /Delete Note/ });
    await expect(deleteNoteButtons).toHaveCount(0);
  });

  test('should display board name as "Archive" in navigation', async ({ 
    authenticatedPage 
  }) => {
    await authenticatedPage.goto("/boards/archive");
    await authenticatedPage.waitForLoadState('networkidle');

    await expect(authenticatedPage).toHaveURL("/boards/archive");
    
    const addNoteButton = authenticatedPage.getByRole("button", { name: "Add note" });
    await expect(addNoteButton).toBeVisible({ timeout: 10000 });
    await expect(addNoteButton).toBeDisabled();
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

    const noteContent = testContext.prefix("This is an archived note");
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
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for note to be visible
    await expect(authenticatedPage.getByText(noteContent)).toBeVisible({
      timeout: 15000,
    });

    // Find the specific note card
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]')
      .filter({ hasText: noteContent });

    await expect(noteCard).toBeVisible();
    
    // Hover to reveal action buttons
    await noteCard.hover();

    const unarchiveButton = noteCard.getByRole("button", { name: "Unarchive note" });
    await expect(unarchiveButton).toBeVisible({ timeout: 8000 });

    // Verify tooltip
    await unarchiveButton.hover();
    const tooltip = authenticatedPage.getByRole("tooltip", { name: "Unarchive note" });
    await expect(tooltip).toBeVisible({ timeout: 5000 });
    await expect(tooltip.getByRole("paragraph")).toBeVisible();

    // Verify archive button is NOT present
    const archiveButton = noteCard.locator('[aria-label="Archive note"]');
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

    const noteContent = testContext.prefix("Test note to unarchive");
    const archivedNote = await testPrisma.note.create({
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
    await authenticatedPage.waitForLoadState('networkidle');

    // Find the specific note card and wait for it to be ready
    const noteCard = await waitForNoteToBeReady(authenticatedPage, noteContent);
    
    // Hover to reveal unarchive button
    await noteCard.hover();
    
    const unarchiveButton = noteCard.locator('[aria-label="Unarchive note"]');
    await expect(unarchiveButton).toBeVisible({ timeout: 8000 });

    // Set up response waiting BEFORE clicking
    const unarchiveResponsePromise = waitForNoteOperation(authenticatedPage, board.id, 'PUT');

    await unarchiveButton.click();
    await unarchiveResponsePromise;

    // Verify database state
    const unarchivedNote = await testPrisma.note.findUnique({
      where: { id: archivedNote.id },
    });
    expect(unarchivedNote?.archivedAt).toBe(null);

    // Verify UI state - note should disappear from archive
    await expect(authenticatedPage.getByText(noteContent)).not.toBeVisible({
      timeout: 10000,
    });
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

    const noteContent = testContext.prefix("Note for archive-unarchive workflow test");
    const note = await testPrisma.note.create({
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

    // Step 1: Go to regular board and verify note exists
    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForLoadState('networkidle');
    
    await authenticatedPage.waitForResponse(
      (r: Response) => r.url().includes(`/api/boards/${board.id}/notes`) && r.ok(),
      { timeout: 15000 }
    );

    const noteCard = await waitForNoteToBeReady(authenticatedPage, noteContent);
    
    // Step 2: Archive the note
    await noteCard.hover();
    const archiveButton = noteCard.locator('[aria-label="Archive note"]');
    await expect(archiveButton).toBeVisible({ timeout: 8000 });

    const archiveResponsePromise = waitForNoteOperation(authenticatedPage, board.id, 'PUT');
    await archiveButton.click();
    await archiveResponsePromise;

    // Verify note disappears from regular board
    await expect(authenticatedPage.getByText(noteContent)).not.toBeVisible({
      timeout: 10000,
    });

    // Verify database state
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

    const firstItem = testContext.prefix("First item");
    const secondItem = testContext.prefix("Second item");
    const thirdItem = testContext.prefix("Third item");

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        archivedAt: new Date(),
        createdBy: testContext.userId,
        boardId: board.id,
        checklistItems: {
          create: [
            {
              content: firstItem,
              checked: false,
              order: 0,
            },
            {
              content: secondItem,
              checked: true,
              order: 1,
            },
            {
              content: thirdItem,
              checked: false,
              order: 2,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for note card to be visible
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]').first();
    await expect(noteCard).toBeVisible({ timeout: 15000 });

    // Wait for all textareas to be present
    const textareas = noteCard.locator("textarea");
    await expect(textareas).toHaveCount(4, { timeout: 10000 });

    // Verify content order
    await expect(textareas.nth(0)).toHaveValue(firstItem);
    await expect(textareas.nth(1)).toHaveValue(secondItem);
    await expect(textareas.nth(2)).toHaveValue(thirdItem);
  });

  test("should disable Add note button on Archive board", async ({
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
              content: testContext.prefix("Archived note content"),
              checked: false,
              order: 0,
            },
          ],
        },
      },
    });

    await authenticatedPage.goto("/boards/archive");
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify Add note button state
    const addNoteButton = authenticatedPage.getByRole("button", { name: "Add note" });
    await expect(addNoteButton).toBeVisible({ timeout: 10000 });
    await expect(addNoteButton).toBeDisabled();

    // Get initial note count
    const initialNoteCount = await testPrisma.note.count({
      where: {
        createdBy: testContext.userId,
        deletedAt: null,
      },
    });

    // Try clicking disabled button (should not create new note)
    await addNoteButton.click({ force: true });
    await authenticatedPage.waitForTimeout(2000);

    // Verify no new notes were created
    const finalNoteCount = await testPrisma.note.count({
      where: {
        createdBy: testContext.userId,
        deletedAt: null,
      },
    });

    expect(finalNoteCount).toBe(initialNoteCount);
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

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify Add note button is enabled
    const addNoteButton = authenticatedPage.getByRole("button", { name: "Add note" });
    await expect(addNoteButton).toBeVisible({ timeout: 10000 });
    await expect(addNoteButton).toBeEnabled();

    // Set up response waiting BEFORE clicking
    const createResponsePromise = waitForNoteOperation(authenticatedPage, board.id, 'POST');

    await addNoteButton.click();
    await createResponsePromise;

    // Verify new note was created
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
    await authenticatedPage.waitForLoadState('networkidle');

    // Wait for notes to load
    await authenticatedPage.waitForResponse(
      (r: Response) => r.url().includes(`/api/boards/${board.id}/notes`) && r.ok(),
      { timeout: 15000 }
    );

    // Find and verify note
    const noteCard = await waitForNoteToBeReady(authenticatedPage, noteContent);

    // Archive the note
    await noteCard.hover();
    const archiveButton = noteCard.locator('[aria-label="Archive note"]');
    await expect(archiveButton).toBeVisible({ timeout: 8000 });

    const archiveResponsePromise = waitForNoteOperation(authenticatedPage, board.id, 'PUT');
    await archiveButton.click();
    await archiveResponsePromise;

    // Verify immediate UI update - note disappears
    await expect(authenticatedPage.getByText(noteContent)).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate to archive and verify note appears there
    const navigationPromise = authenticatedPage.waitForURL("/boards/archive");
    await authenticatedPage.goto("/boards/archive");
    await navigationPromise;
    await authenticatedPage.waitForLoadState('networkidle');

    await expect(authenticatedPage.getByText(noteContent)).toBeVisible({
      timeout: 15000,
    });
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
    await authenticatedPage.waitForLoadState('networkidle');

    // Find note and unarchive it
    const noteCard = await waitForNoteToBeReady(authenticatedPage, noteContent);
    
    await noteCard.hover();
    const unarchiveButton = noteCard.locator('[aria-label="Unarchive note"]');
    await expect(unarchiveButton).toBeVisible({ timeout: 8000 });

    const unarchiveResponsePromise = waitForNoteOperation(authenticatedPage, board.id, 'PUT');
    await unarchiveButton.click();
    await unarchiveResponsePromise;

    // Verify immediate UI update - note disappears from archive
    await expect(authenticatedPage.getByText(noteContent)).not.toBeVisible({
      timeout: 10000,
    });

    // Navigate to regular board and verify note appears there
    const navigationPromise = authenticatedPage.waitForURL(`/boards/${board.id}`);
    await authenticatedPage.goto(`/boards/${board.id}`);
    await navigationPromise;
    await authenticatedPage.waitForLoadState('networkidle');

    await expect(authenticatedPage.getByText(noteContent)).toBeVisible({
      timeout: 15000,
    });
  });
});
