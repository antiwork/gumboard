import { test, expect } from "@playwright/test";

test.describe("Checklist Item Overflow Behavior", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "test-user",
            email: "test@example.com",
            name: "Test User",
          },
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user",
          email: "test@example.com",
          name: "Test User",
          isAdmin: true,
          organization: {
            id: "test-org",
            name: "Test Organization",
          },
        }),
      });
    });

    await page.route("**/api/boards/test-board", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-board",
          name: "Test Board",
          description: "A test board",
          isPublic: false,
          organizationId: "test-org",
          createdBy: "test-user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organization: {
            id: "test-org",
            name: "Test Organization",
          },
        }),
      });
    });

    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "test-board",
            name: "Test Board",
            description: "A test board",
            isPublic: false,
            organizationId: "test-org",
          },
        ]),
      });
    });

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "test-note-1",
              content: "Test note with overflow content",
              color: "#fef3c7",
              archivedAt: null,
              checklistItems: [
                {
                  id: "item-1",
                  content:
                    "Research and implement user authentication system with OAuth 2.0 integration, including Google and GitHub providers, secure token storage, and proper session management with automatic refresh capabilities",
                  checked: false,
                  order: 0,
                  noteId: "test-note-1",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: "item-2",
                  content:
                    "Set up CI/CD pipeline with automated testing, code quality checks, and deployment to staging and production environments",
                  checked: true,
                  order: 1,
                  noteId: "test-note-1",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: "item-3",
                  content: "Fix mobile layout",
                  checked: false,
                  order: 2,
                  noteId: "test-note-1",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User",
                email: "test@example.com",
              },
              board: {
                id: "test-board",
                name: "Test Board",
              },
              boardId: "test-board",
              createdBy: "test-user",
            },
          ]),
        });
      } else if (route.request().method() === "POST") {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-item-id",
            content: postData.content || "",
            checked: false,
            order: 99,
            noteId: "test-note-1",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      }
    });

    await page.route("**/api/boards/test-board/notes/*", async (route) => {
      if (route.request().method() === "PUT") {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            note: {
              id: route.request().url().split("/").pop(),
              content: postData.content || "Test note content",
              color: "#fef3c7",
              checklistItems: postData.checklistItems || [],
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto("/boards/test-board");

    await expect(page.locator("text=Test Board")).toBeVisible();

    await expect(page.locator(".note-background")).toBeVisible({ timeout: 10000 });

    await expect(page.locator("text=Research and implement user authentication")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should properly wrap long checklist item content", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText: "Research and implement user authentication",
      })
      .first();

    await expect(note).toBeVisible();

    const longTextElement = note.locator("[data-testid='item-1'] span.flex-1");
    await expect(longTextElement).toBeVisible();

    await expect(longTextElement).toHaveClass(/break-words/);
    await expect(longTextElement).toHaveClass(/whitespace-pre-wrap/);

    const containerElement = note.locator("[data-testid='item-1']");
    await expect(containerElement).toHaveClass(/items-start/);

    await expect(longTextElement).toContainText("Research and implement user authentication");

    const checkedItem = note.locator("[data-testid='item-2'] span.flex-1");
    await expect(checkedItem).toBeVisible();
    await expect(checkedItem).toHaveClass(/line-through/);
    await expect(checkedItem).toContainText("Set up CI/CD pipeline");

    const shortTextElement = note.locator("[data-testid='item-3'] span.flex-1");
    await expect(shortTextElement).toBeVisible();
    await expect(shortTextElement).toContainText("Fix mobile layout");

    const noteHeight = await note.boundingBox().then((box) => box?.height || 0);
    expect(noteHeight).toBeGreaterThan(150);
  });

  test("should handle overflow in edit mode with textarea", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText: "Research and implement user authentication",
      })
      .first();

    await expect(note).toBeVisible();

    const checklistItemSpan = note.locator("[data-testid='item-1'] span.flex-1");
    await expect(checklistItemSpan).toBeVisible();
    await checklistItemSpan.click();

    const textareaField = note.locator("[data-testid='item-1'] textarea");
    await expect(textareaField).toBeVisible();

    await expect(textareaField).toHaveCSS("white-space", "pre-wrap");
    await expect(textareaField).toHaveCSS("word-wrap", "break-word");
    await expect(textareaField).toHaveCSS("overflow-wrap", "break-word");

    const additionalText =
      " Here is some additional content to test how the textarea handles very long text that should wrap properly within the note boundaries.";
    await textareaField.press("End");
    await textareaField.type(additionalText);

    const textareaBox = await textareaField.boundingBox();
    const noteBox = await note.boundingBox();

    if (textareaBox && noteBox) {
      expect(textareaBox.width).toBeLessThanOrEqual(noteBox.width - 40);
      expect(textareaBox.height).toBeGreaterThan(50);
    }

    await textareaField.press("Enter");
    await textareaField.type("New line of text");

    const textareaValue = await textareaField.inputValue();
    expect(textareaValue).toContain("\n");

    await textareaField.press("Escape");
    await expect(textareaField).toHaveCount(0);

    await expect(checklistItemSpan).toContainText("Research and implement user authentication");
  });

  test("should maintain proper layout with mixed content lengths", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText: "Research and implement user authentication",
      })
      .first();

    await expect(note).toBeVisible();

    const longItem = note.locator("[data-testid='item-1'] span.flex-1");
    const mediumItem = note.locator("[data-testid='item-2'] span.flex-1");
    const shortItem = note.locator("[data-testid='item-3'] span.flex-1");

    await expect(longItem).toBeVisible();
    await expect(mediumItem).toBeVisible();
    await expect(shortItem).toBeVisible();

    for (const item of [longItem, mediumItem, shortItem]) {
      await expect(item).toHaveClass(/break-words/);
      await expect(item).toHaveClass(/whitespace-pre-wrap/);
    }

    await expect(mediumItem).toHaveClass(/line-through/);

    await expect(longItem).toContainText("Research and implement user authentication");
    await expect(mediumItem).toContainText("Set up CI/CD pipeline");
    await expect(shortItem).toContainText("Fix mobile layout");

    const noteHeight = await note.boundingBox().then((box) => box?.height || 0);
    expect(noteHeight).toBeGreaterThan(200);
    expect(noteHeight).toBeLessThan(800);
  });

  test("should handle adding new checklist items", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText: "Research and implement user authentication",
      })
      .first();

    await expect(note).toBeVisible();

    const initialHeight = await note.boundingBox().then((box) => box?.height || 0);

    const addTaskButton = note.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const inputTextarea = note.locator('textarea[placeholder="Add new item..."]');
    await expect(inputTextarea).toBeVisible();

    const newItemContent =
      "Create comprehensive API documentation with examples, authentication guides, and rate limiting information for all public endpoints";
    await inputTextarea.fill(newItemContent);

    await expect(inputTextarea).toHaveCSS("white-space", "pre-wrap");
    await expect(inputTextarea).toHaveCSS("word-wrap", "break-word");

    await inputTextarea.press("Enter");
    await inputTextarea.type("Second line of new item");

    const textareaValue = await inputTextarea.inputValue();
    expect(textareaValue).toContain("\n");

    await inputTextarea.press("Control+Enter");

    await expect(inputTextarea).toHaveCount(0);

    const newHeight = await note.boundingBox().then((box) => box?.height || 0);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test("should handle keyboard behavior and multi-line content", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText: "Research and implement user authentication",
      })
      .first();

    await expect(note).toBeVisible();

    const checklistItemSpan = note.locator("[data-testid='item-1'] span.flex-1");
    await checklistItemSpan.click();

    const textarea = note.locator("[data-testid='item-1'] textarea");
    await expect(textarea).toBeVisible();

    await textarea.fill("First line");
    await textarea.press("Enter");
    await textarea.type("Second line");
    await textarea.press("Enter");
    await textarea.type("Third line with more content that should wrap");

    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe(
      "First line\nSecond line\nThird line with more content that should wrap"
    );

    await textarea.press("Enter");
    await textarea.type("Fourth line");

    await expect(textarea).toBeVisible();

    await expect(textarea).toHaveCSS("white-space", "pre-wrap");

    const textareaBox = await textarea.boundingBox();
    expect(textareaBox?.height).toBeGreaterThan(60);

    await textarea.press("Escape");
    await expect(textarea).toHaveCount(0);
  });
});
