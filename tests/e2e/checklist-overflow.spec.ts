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
          board: {
            id: "test-board",
            name: "Test Board",
            description: "A test board",
          },
        }),
      });
    });

    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          boards: [
            {
              id: "test-board",
              name: "Test Board",
              description: "A test board",
            },
          ],
        }),
      });
    });

    await page.goto("/boards/test-board");
  });

  test("should properly wrap long checklist item content", async ({ page }) => {
    const longText =
      "This is an extremely long task description that goes on and on and contains many words to test how our migration handles very long content that might cause issues with database storage or JSON formatting when converted to checklist items and we want to make sure it works correctly without truncation or corruption of the data";

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note-1",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                x: 100,
                y: 100,
                width: 250,
                height: 200,
                checklistItems: [
                  {
                    id: "item-1",
                    content: longText,
                    checked: false,
                    order: 0,
                  },
                  {
                    id: "item-2",
                    content: "Short item",
                    checked: false,
                    order: 1,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: {
                  id: "test-user",
                  name: "Test User",
                  email: "test@example.com",
                },
              },
            ],
          }),
        });
      }
    });

    await page.waitForSelector("[data-testid='item-1']");

    const longTextElement = page.locator("[data-testid='item-1'] span.flex-1");
    await expect(longTextElement).toBeVisible();

    await expect(longTextElement).toHaveClass(/word-wrap/);
    await expect(longTextElement).toHaveClass(/break-words/);
    await expect(longTextElement).toHaveClass(/whitespace-pre-wrap/);
    await expect(longTextElement).toHaveClass(/overflow-wrap/);

    const containerElement = page.locator("[data-testid='item-1']");
    await expect(containerElement).toHaveClass(/items-start/);

    await expect(longTextElement).toContainText(longText);

    const shortTextElement = page.locator("[data-testid='item-2'] span.flex-1");
    await expect(shortTextElement).toBeVisible();
    await expect(shortTextElement).toContainText("Short item");
  });

  test("should handle overflow in edit mode", async ({ page }) => {
    const longText =
      "This is an extremely long task description that goes on and on and contains many words to test how our migration handles very long content that might cause issues with database storage or JSON formatting when converted to checklist items and we want to make sure it works correctly without truncation or corruption of the data";

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note-1",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                x: 100,
                y: 100,
                width: 250,
                height: 200,
                checklistItems: [
                  {
                    id: "item-1",
                    content: "Edit me",
                    checked: false,
                    order: 0,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: {
                  id: "test-user",
                  name: "Test User",
                  email: "test@example.com",
                },
              },
            ],
          }),
        });
      }
    });

    await page.route("**/api/boards/test-board/notes/test-note-1", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "test-note-1",
              content: "",
              color: "#fef3c7",
              archivedAt: null,
              x: 100,
              y: 100,
              width: 250,
              height: 200,
              checklistItems: [
                {
                  id: "item-1",
                  content: longText,
                  checked: false,
                  order: 0,
                },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User",
                email: "test@example.com",
              },
            },
          }),
        });
      }
    });

    await page.waitForSelector("[data-testid='item-1']");

    const checklistItemSpan = page.locator("[data-testid='item-1'] span.flex-1");
    await checklistItemSpan.click();

    const inputField = page.locator("[data-testid='item-1'] input");
    await expect(inputField).toBeVisible();

    await expect(inputField).toHaveClass(/word-wrap/);
    await expect(inputField).toHaveClass(/break-words/);
    await expect(inputField).toHaveClass(/whitespace-pre-wrap/);
    await expect(inputField).toHaveClass(/overflow-wrap/);

    await inputField.clear();
    await inputField.fill(longText);

    await page.click("body");

    await expect(checklistItemSpan).toContainText(longText);
  });

  test("should maintain proper layout with mixed content lengths", async ({ page }) => {
    const longText =
      "This is an extremely long task description that goes on and on and contains many words to test how our migration handles very long content that might cause issues with database storage";
    const mediumText =
      "This is a medium-length task description that has some words but not too many";
    const shortText = "Short task";

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note-1",
                content: "",
                color: "#fef3c7",
                archivedAt: null,
                x: 100,
                y: 100,
                width: 250,
                height: 300,
                checklistItems: [
                  {
                    id: "item-1",
                    content: longText,
                    checked: false,
                    order: 0,
                  },
                  {
                    id: "item-2",
                    content: mediumText,
                    checked: true,
                    order: 1,
                  },
                  {
                    id: "item-3",
                    content: shortText,
                    checked: false,
                    order: 2,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: {
                  id: "test-user",
                  name: "Test User",
                  email: "test@example.com",
                },
              },
            ],
          }),
        });
      }
    });

    await page.waitForSelector("[data-testid='item-1']");

    const longItem = page.locator("[data-testid='item-1'] span.flex-1");
    const mediumItem = page.locator("[data-testid='item-2'] span.flex-1");
    const shortItem = page.locator("[data-testid='item-3'] span.flex-1");

    await expect(longItem).toBeVisible();
    await expect(mediumItem).toBeVisible();
    await expect(shortItem).toBeVisible();

    for (const item of [longItem, mediumItem, shortItem]) {
      await expect(item).toHaveClass(/word-wrap/);
      await expect(item).toHaveClass(/break-words/);
      await expect(item).toHaveClass(/whitespace-pre-wrap/);
      await expect(item).toHaveClass(/overflow-wrap/);
    }

    await expect(mediumItem).toHaveClass(/line-through/);

    await expect(longItem).toContainText(longText);
    await expect(mediumItem).toContainText(mediumText);
    await expect(shortItem).toContainText(shortText);
  });
});
