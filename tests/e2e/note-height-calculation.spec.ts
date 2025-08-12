import { test, expect } from "@playwright/test";

test.describe("Note Height Calculation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "test-user", email: "test@example.com", name: "Test User" },
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
          organization: { id: "test-org", name: "Test Organization" },
        }),
      });
    });

    await page.route("**/api/boards/test-board", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          board: { id: "test-board", name: "Test Board", description: "A test board" },
        }),
      });
    });
  });

  test("should auto-resize checklist items with long content", async ({ page }) => {
    const longContent =
      "This is a very long checklist item that should wrap to multiple lines and cause the textarea to auto-resize to accommodate the full content without cutting off any text";

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: [
                  { id: "item-1", content: longContent, checked: false, order: 0 },
                  { id: "item-2", content: "Short item", checked: false, order: 1 },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: "test-user", name: "Test User", email: "test@example.com" },
              },
            ],
          }),
        });
      }
    });

    await page.goto("/boards/test-board");

    await expect(page.locator(`text=${longContent}`)).toBeVisible();

    await expect(page.locator('button:has-text("Add Note")')).toBeVisible();

    await page.locator(`text=${longContent}`).click();
    const textarea = page.locator('textarea').filter({ hasText: "This is a very long" });
    await expect(textarea).toBeVisible();

    await textarea.fill(longContent + " with even more content added to make it longer");
    const initialHeight = await textarea.evaluate((el) => el.scrollHeight);
    await textarea.fill(
      longContent + " with even more content added to make it longer and longer and longer"
    );
    const newHeight = await textarea.evaluate((el) => el.scrollHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test("should maintain Add Note button visibility with multiple long items", async ({ page }) => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `item-${i}`,
      content: `This is checklist item ${i + 1} with very long content that should wrap to multiple lines and test the height calculation thoroughly`,
      checked: false,
      order: i,
    }));

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: items,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: "test-user", name: "Test User", email: "test@example.com" },
              },
            ],
          }),
        });
      }
    });

    await page.goto("/boards/test-board");

    for (const item of items) {
      await expect(page.locator(`text=${item.content}`)).toBeVisible();
    }

    const addNoteButton = page.locator('button:has-text("Add Note")');
    await expect(addNoteButton).toBeVisible();

    await addNoteButton.click();
    await expect(page.locator(".note-background")).toBeVisible();
  });

  test("should handle responsive behavior with different screen sizes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const longContent =
      "This is a very long checklist item that should wrap differently on mobile screens and still maintain proper height calculation";

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: [{ id: "item-1", content: longContent, checked: false, order: 0 }],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: "test-user", name: "Test User", email: "test@example.com" },
              },
            ],
          }),
        });
      }
    });

    await page.goto("/boards/test-board");

    await expect(page.locator(`text=${longContent}`)).toBeVisible();
    await expect(page.locator('button:has-text("Add Note")')).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();

    await expect(page.locator(`text=${longContent}`)).toBeVisible();
    await expect(page.locator('button:has-text("Add Note")')).toBeVisible();
  });

});
