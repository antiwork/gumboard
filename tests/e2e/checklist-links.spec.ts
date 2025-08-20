import { test, expect } from "../fixtures/test-helpers";
import { sanitizeChecklistContent } from "../../lib/sanitize";

test.describe("Checklist HTML Links", () => {
  test("should create links via paste-to-link functionality", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Link Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for link functionality"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await authenticatedPage.click('button:has-text("Add Note")');
    await createNoteResponse;

    const testItemContent = "Check out GitHub repository";
    const testUrl = "https://github.com/antiwork/gumboard";

    const initialInput = authenticatedPage.locator('[data-testid="new-item"] textarea').first();
    await expect(initialInput).toBeVisible({ timeout: 10000 });
    await initialInput.fill(testItemContent);

    await initialInput.focus();
    await authenticatedPage.keyboard.press("Control+a"); // Select all
    await authenticatedPage.keyboard.type(testItemContent);

    const startIndex = testItemContent.indexOf("GitHub");
    await initialInput.focus();
    await initialInput.evaluate(
      (textarea, { start, end }) => {
        (textarea as HTMLTextAreaElement).setSelectionRange(start, end);
      },
      { start: startIndex, end: startIndex + 6 }
    );

    await authenticatedPage.evaluate(
      ({ url }) => {
        const textarea = document.querySelector(
          '[data-testid="new-item"] textarea'
        ) as HTMLTextAreaElement;
        if (textarea) {
          const pasteData = new DataTransfer();
          pasteData.setData("text/plain", url);

          const pasteEvent = new ClipboardEvent("paste", {
            clipboardData: pasteData,
            bubbles: true,
            cancelable: true,
          });

          textarea.dispatchEvent(pasteEvent);
        }
      },
      { url: testUrl }
    );

    const createItemResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await initialInput.press("Enter");
    await createItemResponse;

    const linkElement = authenticatedPage.locator('a[href="https://github.com/antiwork/gumboard"]');
    await expect(linkElement).toBeVisible();
    await expect(linkElement).toHaveText("GitHub");

    // Verify in database
    const notes = await testPrisma.note.findMany({
      where: { boardId: board.id },
      include: { checklistItems: true },
    });

    expect(notes).toHaveLength(1);
    expect(notes[0].checklistItems).toHaveLength(1);
    expect(notes[0].checklistItems[0].content).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://github.com/antiwork/gumboard">GitHub</a>'
    );
  });

  test("should sanitize HTML content to allow only anchor tags", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Sanitization Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for HTML sanitization"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const itemId = testContext.prefix("sanitize-item");
    await testPrisma.checklistItem.create({
      data: {
        id: itemId,
        content: "Test content",
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const maliciousContent =
      'Test <script>alert("xss")</script> <b>bold</b> <a href="https://example.com">link</a> text';

    await authenticatedPage.request.put(`http://localhost:3000/api/boards/${board.id}/notes/${note.id}`, {
      data: {
        checklistItems: [
          {
            id: itemId,
            content: maliciousContent,
            checked: false,
            order: 0,
          },
        ],
      },
    });

    const updatedItem = await testPrisma.checklistItem.findUnique({
      where: { id: itemId },
    });

    expect(updatedItem?.content).not.toContain("<script>");
    expect(updatedItem?.content).not.toContain("<b>");
    expect(updatedItem?.content).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://example.com">link</a>'
    );
    expect(updatedItem?.content).toContain("Test  bold  text"); // Tags stripped but content preserved
  });

  test("should render links as clickable elements", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Clickable Links Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for clickable links"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const itemId = testContext.prefix("link-item");
    const linkContent =
      'Check out <a href="https://github.com/antiwork/gumboard">GitHub</a> repository';
    const sanitizedContent = sanitizeChecklistContent(linkContent);

    await testPrisma.checklistItem.create({
      data: {
        id: itemId,
        content: sanitizedContent,
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const linkElement = authenticatedPage.locator('a[href="https://github.com/antiwork/gumboard"]');
    await expect(linkElement).toBeVisible();
    await expect(linkElement).toHaveText("GitHub");
    await expect(linkElement).toHaveAttribute("target", "_blank");
    await expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");

    await expect(linkElement).toBeEnabled();
  });

  test("should preserve existing checklist functionality with HTML content", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Functionality Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for functionality preservation"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const itemId = testContext.prefix("func-item");
    const linkContent = 'Task with <a href="https://example.com">link</a>';
    const sanitizedContent = sanitizeChecklistContent(linkContent);

    await testPrisma.checklistItem.create({
      data: {
        id: itemId,
        content: sanitizedContent,
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const checkbox = authenticatedPage.locator('[data-state="unchecked"]').first();
    await expect(checkbox).toBeVisible();

    const toggleResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await checkbox.click();
    await toggleResponse;

    const updatedItem = await testPrisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    expect(updatedItem?.checked).toBe(true);

    const editableElement = authenticatedPage.locator(
      `[data-testid="${itemId}"] [contenteditable="true"]`
    );
    await editableElement.click();

    const editResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await authenticatedPage.evaluate((itemId) => {
      const element = document.querySelector(`[data-testid="${itemId}"] [contenteditable="true"]`);
      if (element) {
        element.innerHTML = element.innerHTML + " - updated";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, itemId);

    await authenticatedPage.click("body");
    await editResponse;

    const editedItem = await testPrisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    expect(editedItem?.content).toContain("updated");
    expect(editedItem?.content).toContain(
      '<a target="_blank" rel="noopener noreferrer" href="https://example.com">link</a>'
    );
  });

  test("should handle link removal by deleting link text", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Link Removal Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board for link removal"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const itemId = testContext.prefix("removal-item");
    const linkContent =
      'Check out <a href="https://github.com/antiwork/gumboard">GitHub</a> repository';
    const sanitizedContent = sanitizeChecklistContent(linkContent);

    await testPrisma.checklistItem.create({
      data: {
        id: itemId,
        content: sanitizedContent,
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const editableElement = authenticatedPage.locator(
      `[data-testid="${itemId}"] [contenteditable="true"]`
    );
    await editableElement.click();

    const editResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes/`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await authenticatedPage.evaluate((itemId) => {
      const element = document.querySelector(`[data-testid="${itemId}"] [contenteditable="true"]`);
      if (element) {
        element.innerHTML = "Check out repository";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, itemId);

    await authenticatedPage.click("body");
    await editResponse;

    const updatedItem = await testPrisma.checklistItem.findUnique({
      where: { id: itemId },
    });
    expect(updatedItem?.content).toBe("Check out repository");
    expect(updatedItem?.content).not.toContain("<a");

    const linkElement = authenticatedPage.locator('a[href="https://github.com/antiwork/gumboard"]');
    await expect(linkElement).not.toBeVisible();
  });
});
