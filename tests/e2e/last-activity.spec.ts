import { test, expect } from "../fixtures/test-helpers";

test.describe("Last Activity Time", () => {
  test("should display last activity time on dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const boardName = testContext.getBoardName("Activity Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: "Test board for activity tracking",
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(),
      },
    });

    await authenticatedPage.goto("/dashboard");
    await authenticatedPage.waitForResponse((r) => r.url().includes("/api/boards") && r.status() === 200);
    const boardCard = authenticatedPage.locator(`[data-board-id="${board.id}"]`);
    await expect(boardCard).toBeVisible();
    
    await expect(boardCard.locator("text=Last active:")).toBeVisible();
  });

  test("should update last activity when creating a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const boardName = testContext.getBoardName("Note Activity Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    });

    const initialBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    const initialActivityTime = initialBoard?.lastActivityAt;

    await authenticatedPage.goto(`/boards/${board.id}`);
    
    await authenticatedPage.waitForSelector('[data-testid="note-card"]', { state: 'detached' }).catch(() => {});

    await authenticatedPage.click('button:has-text("Add note")');
    
    await authenticatedPage.waitForResponse(
      (resp) => resp.url().includes(`/api/boards/${board.id}/notes`) && resp.request().method() === 'POST' && resp.status() === 201
    );

    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    
    expect(updatedBoard?.lastActivityAt).toBeTruthy();
    expect(updatedBoard?.lastActivityAt!.getTime()).toBeGreaterThan(initialActivityTime!.getTime());
  });

  test("should update last activity when updating a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const boardName = testContext.getBoardName("Update Activity Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    });

    const note = await testPrisma.note.create({
      data: {
        boardId: board.id,
        createdBy: testContext.userId,
        color: "#fef3c7",
        checklistItems: {
          create: {
            content: "Test item",
            checked: false,
            order: 0,
          },
        },
      },
    });

    const initialBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    const initialActivityTime = initialBoard?.lastActivityAt;

    await authenticatedPage.goto(`/boards/${board.id}`);
    
 
    const noteCard = authenticatedPage.locator('[data-testid="note-card"]');
    await expect(noteCard.first()).toBeVisible();

    await authenticatedPage.getByRole('checkbox').first().click();
    
    await authenticatedPage.waitForResponse(
      (resp) => resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) && resp.request().method() === 'PUT' && resp.status() === 200
    );

    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    
    expect(updatedBoard?.lastActivityAt).toBeTruthy();
    expect(updatedBoard?.lastActivityAt!.getTime()).toBeGreaterThan(initialActivityTime!.getTime());
  });

  test("should update last activity when deleting a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const boardName = testContext.getBoardName("Delete Activity Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    });

    const note = await testPrisma.note.create({
      data: {
        boardId: board.id,
        createdBy: testContext.userId,
        color: "#fef3c7",
      },
    });

    const initialBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    const initialActivityTime = initialBoard?.lastActivityAt;

    await authenticatedPage.goto(`/boards/${board.id}`);
    
    await expect(authenticatedPage.locator('[data-testid="note-card"]').first()).toBeVisible();
    
    await authenticatedPage.click('[data-testid="note-card"] button[aria-label^="Delete Note"]');
    
    await authenticatedPage.click('button:has-text("Delete")');
    
    await authenticatedPage.waitForResponse(
      (resp) => resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) && resp.request().method() === 'DELETE' && resp.status() === 200
    );

    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    
    expect(updatedBoard?.lastActivityAt).toBeTruthy();
    expect(updatedBoard?.lastActivityAt!.getTime()).toBeGreaterThan(initialActivityTime!.getTime());
  });

  test("should sort boards by last activity time", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const oldBoardName = testContext.getBoardName("Old Activity Board");
    const newBoardName = testContext.getBoardName("New Activity Board");
    
    await testPrisma.board.create({
      data: {
        name: oldBoardName,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    });

    await testPrisma.board.create({
      data: {
        name: newBoardName,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 30),
      },
    });

    await authenticatedPage.goto("/dashboard");

    await authenticatedPage.waitForResponse((r) => r.url().includes("/api/boards") && r.status() === 200);

    await expect(authenticatedPage.locator(`text="${newBoardName}"`)).toBeVisible();
    await expect(authenticatedPage.locator(`text="${oldBoardName}"`)).toBeVisible();

    const firstBoardCard = authenticatedPage.locator('[data-board-id]').first();
    await expect(firstBoardCard.locator(`text="${newBoardName}"`)).toBeVisible();
  });

  test("should update last activity when changing board settings", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {

    const boardName = testContext.getBoardName("Settings Activity Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        lastActivityAt: new Date(Date.now() - 1000 * 60 * 60),
      },
    });

    const initialBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    const initialActivityTime = initialBoard?.lastActivityAt;

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.click('button[aria-label*="settings"]');
    
    await authenticatedPage.fill('input[placeholder*="description"]', "Updated description");
    await authenticatedPage.click('button:has-text("Save")');
    
    await authenticatedPage.waitForResponse(
      (resp) => resp.url().includes(`/api/boards/${board.id}`) && resp.request().method() === 'PUT' && resp.status() === 200
    );

    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
      select: { lastActivityAt: true },
    });
    
    expect(updatedBoard?.lastActivityAt).toBeTruthy();
    expect(updatedBoard?.lastActivityAt!.getTime()).toBeGreaterThan(initialActivityTime!.getTime());
  });
});
