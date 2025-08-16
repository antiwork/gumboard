import { test, expect } from "../fixtures/test-helpers";
import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import type { TestContext } from "../fixtures/test-helpers";

test.describe("Real-time Synchronization (DB-backed)", () => {
  async function createSecondUserSession(testPrisma: PrismaClient, testContext: TestContext) {
    const secondUserId = `usr2_${testContext.testId}`;
    const secondSessionToken = `sess_${testContext.testId}_${randomBytes(16).toString("hex")}`;

    await testPrisma.user.create({
      data: {
        id: secondUserId,
        email: `user2-${testContext.testId}@example.com`,
        name: `User Two ${testContext.testId}`,
        organizationId: testContext.organizationId,
        isAdmin: true,
      },
    });

    await testPrisma.session.create({
      data: {
        sessionToken: secondSessionToken,
        userId: secondUserId,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return { secondUserId, secondSessionToken } as const;
  }

  test("should sync checklist item changes between two users and persist in DB", async ({
    authenticatedPage,
    testContext,
    testPrisma,
    browser,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Realtime Board"),
        description: testContext.prefix("A test board for realtime"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: { color: "#fef3c7", boardId: board.id, createdBy: testContext.userId },
    });

    const { secondSessionToken } = await createSecondUserSession(testPrisma, testContext);
    const context2 = await browser.newContext();
    await context2.addCookies([
      {
        name: "authjs.session-token",
        value: secondSessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    const page2 = await context2.newPage();

    await authenticatedPage.goto(`/boards/${board.id}`);
    await page2.goto(`/boards/${board.id}`);

    // Note already exists, interact with its textarea directly
    const itemContent = testContext.prefix("First item");
    const addItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    const newItemInput = authenticatedPage.getByTestId("new-item").locator("textarea");
    await newItemInput.fill(itemContent);
    await newItemInput.press("Enter");
    await addItemResponse;

    const updatedNoteAfterAdd = await testPrisma.note.findUnique({
      where: { id: note.id },
      include: { checklistItems: true },
    });
    expect(updatedNoteAfterAdd?.checklistItems).toHaveLength(1);
    const createdItem = updatedNoteAfterAdd!.checklistItems[0];
    expect(createdItem.content).toBe(itemContent);

    await expect.poll(async () => await page2.getByTestId(createdItem.id).count()).toBe(1);

    const toggleResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await authenticatedPage
      .getByTestId(createdItem.id)
      .getByRole("checkbox", { disabled: false })
      .click();
    await toggleResponse;

    const toggledInDb = await testPrisma.checklistItem.findUnique({
      where: { id: createdItem.id },
    });
    expect(toggledInDb?.checked).toBe(true);

    await expect
      .poll(async () =>
        page2
          .getByTestId(createdItem.id)
          .getByRole("checkbox", { disabled: false })
          .getAttribute("data-state")
      )
      .toBe("checked");

    await authenticatedPage.getByTestId(createdItem.id).getByText(itemContent).click();
    const editInput = authenticatedPage.getByTestId(createdItem.id).locator("textarea").first();
    const editedContent = testContext.prefix("First item edited");
    const saveEditResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await editInput.fill(editedContent);
    await authenticatedPage.click("body");
    await saveEditResponse;

    const updatedItemDb = await testPrisma.checklistItem.findUnique({
      where: { id: createdItem.id },
    });
    expect(updatedItemDb?.content).toBe(editedContent);

    await expect
      .poll(async () => await page2.getByTestId(createdItem.id).getByText(editedContent).count())
      .toBeGreaterThan(0);

    await context2.close();
  });

  test("should sync note creation between multiple users and persist in DB", async ({
    authenticatedPage,
    testContext,
    testPrisma,
    browser,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Realtime Board Notes"),
        description: testContext.prefix("Realtime notes board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const { secondSessionToken } = await createSecondUserSession(testPrisma, testContext);
    const context2 = await browser.newContext();
    await context2.addCookies([
      {
        name: "authjs.session-token",
        value: secondSessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    const page2 = await context2.newPage();

    await authenticatedPage.goto(`/boards/${board.id}`);
    await page2.goto(`/boards/${board.id}`);

    await authenticatedPage.getByRole("button", { name: "Add note" }).click();
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    const notesAfterFirst = await testPrisma.note.findMany({ where: { boardId: board.id } });
    expect(notesAfterFirst).toHaveLength(1);

    await page2.getByRole("button", { name: "Add Note" }).click();
    await page2.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    const notesAfterSecond = await testPrisma.note.findMany({ where: { boardId: board.id } });
    expect(notesAfterSecond).toHaveLength(2);

    await expect
      .poll(async () => await authenticatedPage.locator(".rounded-lg.group.transition-all").count())
      .toBe(2);

    await context2.close();
  });

  test("should preserve active edits during polling and keep DB consistent", async ({
    authenticatedPage,
    testContext,
    testPrisma,
    browser,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Realtime Preserve"),
        description: testContext.prefix("Preserve edits board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [{ content: "Original content", checked: false, order: 0 }],
        },
      },
    });

    const { secondSessionToken } = await createSecondUserSession(testPrisma, testContext);
    const context2 = await browser.newContext();
    await context2.addCookies([
      {
        name: "authjs.session-token",
        value: secondSessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    const page2 = await context2.newPage();

    await authenticatedPage.goto(`/boards/${board.id}`);
    await page2.goto(`/boards/${board.id}`);

    await authenticatedPage.getByText("Original content").click();
    const editArea = authenticatedPage.locator('input[type="text"]').first();
    await expect(editArea).toBeVisible();
    await editArea.fill("Local editing draft");

    const noteChecklistItem = await testPrisma.checklistItem.findFirst({
      where: { noteId: note.id },
    });
    const putResp = page2.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${note.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await page2.evaluate(
      ({ boardId, id, itemId }) => {
        return fetch(`/api/boards/${boardId}/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistItems: [
              { id: itemId, content: "User 2 updated content", checked: false, order: 0 },
            ],
          }),
        });
      },
      { boardId: board.id, id: note.id, itemId: noteChecklistItem?.id }
    );
    await putResp;

    const dbChecklistItem = await testPrisma.checklistItem.findFirst({
      where: { noteId: note.id },
    });
    expect(dbChecklistItem?.content).toBe("User 2 updated content");

    await expect(editArea).toHaveValue("Local editing draft");

    await context2.close();
  });

  test("should sync note deletions across sessions and soft-delete in DB", async ({
    authenticatedPage,
    testContext,
    testPrisma,
    browser,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Realtime Delete"),
        description: testContext.prefix("Deletion board"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const keepNote = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [{ content: testContext.prefix("Note to keep"), checked: false, order: 0 }],
        },
      },
    });
    const deleteNote = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [{ content: testContext.prefix("Note to delete"), checked: false, order: 0 }],
        },
      },
    });

    const { secondSessionToken } = await createSecondUserSession(testPrisma, testContext);
    const context2 = await browser.newContext();
    await context2.addCookies([
      {
        name: "authjs.session-token",
        value: secondSessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    const page2 = await context2.newPage();

    await authenticatedPage.goto(`/boards/${board.id}`);
    await page2.goto(`/boards/${board.id}`);

    const deleteNoteChecklistItem = await testPrisma.checklistItem.findFirst({
      where: { noteId: deleteNote.id },
    });
    await authenticatedPage.locator(`text=${deleteNoteChecklistItem?.content}`).hover();
    const deleteButton = authenticatedPage.getByRole("button", {
      name: `Delete Note ${deleteNote.id}`,
      exact: true,
    });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/${deleteNote.id}`) &&
        resp.request().method() === "DELETE",
      { timeout: 7000 }
    );

    const softDeleted = await testPrisma.note.findUnique({ where: { id: deleteNote.id } });
    expect(softDeleted?.deletedAt).toBeTruthy();

    const keepNoteDb = await testPrisma.note.findUnique({ where: { id: keepNote.id } });
    expect(keepNoteDb?.deletedAt).toBeNull();

    await expect
      .poll(async () => await authenticatedPage.locator(".rounded-lg.group.transition-all").count())
      .toBe(1);
    await expect
      .poll(async () => await page2.locator(".rounded-lg.group.transition-all").count())
      .toBe(1);

    await context2.close();
  });

  test("should return updated timestamps when data changes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Timestamp Test"),
        description: testContext.prefix("Timestamp test"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [{ content: "Test item", checked: false, order: 0 }],
        },
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const initialResponse = await authenticatedPage.request.get(
      `/api/boards/${board.id}/notes?check=true`
    );
    const initialData = await initialResponse.json();
    const initialTimestamp = initialData.lastModified;

    await authenticatedPage.waitForTimeout(10);

    const checklistItem = await testPrisma.checklistItem.findFirst({ where: { noteId: note.id } });

    await authenticatedPage.getByTestId(checklistItem!.id).getByText("Test item").click();
    const editInput = authenticatedPage.getByTestId(checklistItem!.id).locator("textarea").first();
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue("Test item");

    await editInput.fill("Updated test item");
    await authenticatedPage.click("body");
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    const updatedResponse = await authenticatedPage.request.get(
      `/api/boards/${board.id}/notes?check=true`
    );
    const updatedData = await updatedResponse.json();
    const updatedTimestamp = updatedData.lastModified;

    const dbItem = await testPrisma.checklistItem.findFirst({ where: { noteId: note.id } });
    expect(dbItem?.content).toBe("Updated test item");

    expect(updatedTimestamp).toBeTruthy();
    if (initialTimestamp) {
      expect(new Date(updatedTimestamp).getTime()).toBeGreaterThan(
        new Date(initialTimestamp).getTime()
      );
    }
  });

  test("should verify polling mechanism works correctly", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Polling Test"),
        description: testContext.prefix("Polling test"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
        checklistItems: {
          create: [{ content: "Polling item", checked: false, order: 0 }],
        },
      },
    });

    const pollRequests: { timestamp: number; hasChanged: boolean }[] = [];
    await authenticatedPage.route(`**/api/boards/${board.id}/notes?check=true`, async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      pollRequests.push({
        timestamp: Date.now(),
        hasChanged: !!data.lastModified,
      });
      await route.fulfill({ response });
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage.waitForTimeout(6000);
    const initialPollCount = pollRequests.length;
    expect(initialPollCount).toBeGreaterThan(0);

    const checklistItem = await testPrisma.checklistItem.findFirst({ where: { noteId: note.id } });
    await authenticatedPage.getByTestId(checklistItem!.id).getByText("Polling item").click();
    const editInput = authenticatedPage.getByTestId(checklistItem!.id).locator("textarea").first();
    await expect(editInput).toBeVisible();

    await editInput.fill("Updated polling item");
    await authenticatedPage.click("body");
    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await authenticatedPage.waitForTimeout(5000);
    const finalPollCount = pollRequests.length;
    expect(finalPollCount).toBeGreaterThan(initialPollCount);

    for (let i = 1; i < pollRequests.length; i++) {
      const interval = pollRequests[i].timestamp - pollRequests[i - 1].timestamp;
      expect(interval).toBeGreaterThan(500);
      expect(interval).toBeLessThan(15000);
    }
  });
});
