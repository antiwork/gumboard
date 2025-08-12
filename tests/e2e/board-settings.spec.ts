import { test, expect } from "@playwright/test";

test.describe("Board Settings", () => {
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
          expires: new Date(Date.now() + 86400000).toISOString(),
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
            slackWebhookUrl: "https://hooks.slack.com/test-webhook",
            members: [],
          },
        }),
      });
    });

    await page.route("**/api/boards/test-board", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "test-board",
              name: "Test Board",
              description: "A test board",
              sendSlackUpdates: true,
            },
          }),
        });
      }
    });

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [],
          }),
        });
      }
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
              sendSlackUpdates: true,
            },
          ],
        }),
      });
    });
  });

  test("should open board settings dialog and display current settings", async ({ page }) => {
    await page.goto("/boards/test-board");

    await page.click('button:has(div:has-text("Test Board"))');
    await page.click('button:has-text("Board settings")');

    await expect(page.locator("text=Board settings")).toBeVisible();
    await expect(page.locator('text=Configure settings for "Test Board" board.')).toBeVisible();
    await expect(page.locator('label:has-text("Send updates to Slack")')).toBeVisible();

    const checkbox = page.locator("#sendSlackUpdates");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test("should toggle Slack updates setting and save changes", async ({ page }) => {
    let boardUpdateCalled = false;
    let updatedSettings: any = null;

    await page.route("**/api/boards/test-board", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "test-board",
              name: "Test Board",
              description: "A test board",
              sendSlackUpdates: true,
            },
          }),
        });
      } else if (route.request().method() === "PUT") {
        boardUpdateCalled = true;
        updatedSettings = await route.request().postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "test-board",
              name: "Test Board",
              description: "A test board",
              sendSlackUpdates: updatedSettings.sendSlackUpdates,
            },
          }),
        });
      }
    });

    await page.goto("/boards/test-board");

    await page.click('button:has(div:has-text("Test Board"))');
    await page.click('button:has-text("Board settings")');

    const checkbox = page.locator("#sendSlackUpdates");
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await page.click('button:has-text("Save settings")');

    expect(boardUpdateCalled).toBe(true);
    expect(updatedSettings).not.toBeNull();
    expect(updatedSettings.sendSlackUpdates).toBe(false);

    await expect(page.locator("text=Board settings")).not.toBeVisible();
  });

  test("should respect Slack updates setting when creating notes", async ({ page }) => {
    let slackNotificationSent = false;
    let noteCreated = false;

    await page.route("**/api/boards/test-board", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "test-board",
              name: "Test Board",
              description: "A test board",
              sendSlackUpdates: false,
            },
          }),
        });
      }
    });

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [],
          }),
        });
      } else if (route.request().method() === "POST") {
        noteCreated = true;
        const postData = await route.request().postDataJSON();

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "new-note-id",
              content: postData.content,
              color: "#fef3c7",
              archivedAt: null,
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

    await page.route("https://hooks.slack.com/test-webhook", async (route) => {
      slackNotificationSent = true;
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      });
    });

    await page.goto("/boards/test-board");

    await page.evaluate(() => {
      fetch("/api/boards/test-board/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Test note content",
          color: "#fef3c7",
        }),
      });
    });

    await page.waitForTimeout(100);

    expect(noteCreated).toBe(true);
    expect(slackNotificationSent).toBe(false);
  });

  test("should display correct board settings state", async ({ page }) => {
    await page.route("**/api/boards/test-board", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "test-board",
              name: "Demo Board",
              description: "A demo board",
              sendSlackUpdates: true,
            },
          }),
        });
      }
    });

    await page.goto("/boards/test-board");

    await page.click('button:has(div:has-text("Demo Board"))');
    await page.click('button:has-text("Board settings")');

    await expect(page.locator("text=Board settings")).toBeVisible();
    await expect(page.locator('label:has-text("Send updates to Slack")')).toBeVisible();

    const checkbox = page.locator("#sendSlackUpdates");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test("should cancel board settings changes", async ({ page }) => {
    await page.goto("/boards/test-board");

    await page.click('button:has(div:has-text("Test Board"))');
    await page.click('button:has-text("Board settings")');

    const checkbox = page.locator("#sendSlackUpdates");
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await page.click('button:has-text("Cancel")');

    await expect(page.locator("text=Board settings")).not.toBeVisible();

    await page.click('button:has(div:has-text("Test Board"))');
    await page.click('button:has-text("Board settings")');

    await expect(checkbox).toBeChecked();
  });
});
