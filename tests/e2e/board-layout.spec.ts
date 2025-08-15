import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Layout", () => {
  test("should create notes and verify they are displayed", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Layout Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for layout"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const noteContent = testContext.prefix("Test note content");

    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    await authenticatedPage.click('button:has-text("Add Note")');
    await createNoteResponse;

    const newItemInput = authenticatedPage.locator("textarea").last();
    await expect(newItemInput).toBeVisible();
    await newItemInput.fill(noteContent);
    await newItemInput.blur();
    await authenticatedPage.waitForTimeout(500);

    await expect(authenticatedPage.getByText(noteContent)).toBeVisible();

    const viewports = [
      { width: 375, height: 667, name: "mobile" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 1024, height: 768, name: "desktop" },
    ];

    for (const viewport of viewports) {
      await authenticatedPage.setViewportSize({ width: viewport.width, height: viewport.height });
      await authenticatedPage.waitForTimeout(500);
      await expect(authenticatedPage.getByText(noteContent)).toBeVisible();
    }
  });

  test("should create multiple notes without overlap", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Multi-Note Layout Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for multi-note layout"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const noteContents = [
      testContext.prefix("First note"),
      testContext.prefix("Second note with longer content"),
      testContext.prefix("Third note"),
      testContext.prefix("Fourth note with some additional text"),
    ];

    for (const content of noteContents) {
      const createNoteResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes`) &&
          resp.request().method() === "POST" &&
          resp.status() === 201
      );

      await authenticatedPage.click('button:has-text("Add Note")');
      await createNoteResponse;

      const newItemInput = authenticatedPage.locator("textarea").last();
      await expect(newItemInput).toBeVisible();
      await newItemInput.fill(content);
      await newItemInput.blur();
      await authenticatedPage.waitForTimeout(500);
    }

    for (const content of noteContents) {
      await expect(authenticatedPage.getByText(content)).toBeVisible();
    }

    await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
    await authenticatedPage.waitForTimeout(1000);

    const notes = [];
    for (const content of noteContents) {
      const note = authenticatedPage.getByText(content);
      await expect(note).toBeVisible();
      notes.push(note);
    }

    for (let i = 0; i < notes.length; i++) {
      for (let j = i + 1; j < notes.length; j++) {
        const box1 = await notes[i].boundingBox();
        const box2 = await notes[j].boundingBox();

        expect(box1).toBeTruthy();
        expect(box2).toBeTruthy();

        const noOverlap =
          box1!.x + box1!.width <= box2!.x ||
          box2!.x + box2!.width <= box1!.x ||
          box1!.y + box1!.height <= box2!.y ||
          box2!.y + box2!.height <= box1!.y;

        expect(noOverlap).toBe(true);
      }
    }
  });

  test("should handle note content expansion", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Content Expansion Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for content expansion"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const shortContent = testContext.prefix("Short content");

    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    await authenticatedPage.click('button:has-text("Add Note")');
    await createNoteResponse;

    const newItemInput = authenticatedPage.locator("textarea").last();
    await expect(newItemInput).toBeVisible();
    await newItemInput.fill(shortContent);
    await newItemInput.blur();
    await authenticatedPage.waitForTimeout(500);

    await expect(authenticatedPage.getByText(shortContent)).toBeVisible();

    const longContent = testContext.prefix(
      "This is a very long piece of content that should cause the note to be much taller than the first note. It contains multiple sentences and should wrap to multiple lines, creating a significant height difference for testing the layout system."
    );

    const createSecondNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    await authenticatedPage.click('button:has-text("Add Note")');
    await createSecondNoteResponse;

    const secondItemInput = authenticatedPage.locator("textarea").last();
    await expect(secondItemInput).toBeVisible();
    await secondItemInput.fill(longContent);
    await secondItemInput.blur();
    await authenticatedPage.waitForTimeout(500);

    await expect(authenticatedPage.getByText(shortContent)).toBeVisible();
    await expect(authenticatedPage.getByText(longContent)).toBeVisible();

    await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
    await authenticatedPage.waitForTimeout(1000);

    await expect(authenticatedPage.getByText(shortContent)).toBeVisible();
    await expect(authenticatedPage.getByText(longContent)).toBeVisible();
  });

  test("should maintain proper spacing between notes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Spacing Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for note spacing"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const noteContents = [testContext.prefix("Left note"), testContext.prefix("Right note")];

    for (const content of noteContents) {
      const createNoteResponse = authenticatedPage.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/boards/${board.id}/notes`) &&
          resp.request().method() === "POST" &&
          resp.status() === 201
      );

      await authenticatedPage.click('button:has-text("Add Note")');
      await createNoteResponse;

      const newItemInput = authenticatedPage.locator("textarea").last();
      await expect(newItemInput).toBeVisible();
      await newItemInput.fill(content);
      await newItemInput.blur();
      await authenticatedPage.waitForTimeout(500);
    }

    await authenticatedPage.setViewportSize({ width: 1024, height: 768 });
    await authenticatedPage.waitForTimeout(1000);

    for (const content of noteContents) {
      await expect(authenticatedPage.getByText(content)).toBeVisible();
    }

    const leftNote = authenticatedPage.getByText(noteContents[0]);
    const rightNote = authenticatedPage.getByText(noteContents[1]);

    const leftBox = await leftNote.boundingBox();
    const rightBox = await rightNote.boundingBox();

    expect(leftBox).toBeTruthy();
    expect(rightBox).toBeTruthy();

    if (rightBox!.x > leftBox!.x) {
      const spacing = rightBox!.x - (leftBox!.x + leftBox!.width);
      expect(spacing).toBeGreaterThan(10);
    } else {
      expect(rightBox!.y).toBeGreaterThan(leftBox!.y);
      const verticalSpacing = rightBox!.y - (leftBox!.y + rightBox!.height);
      expect(verticalSpacing).toBeGreaterThan(0);
    }
  });
});
