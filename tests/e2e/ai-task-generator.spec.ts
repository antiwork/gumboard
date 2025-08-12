import { test, expect } from "@playwright/test";

test.describe("AI Task Generator", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
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

    // Mock user with organization that has OpenAI API key
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
            openaiApiKey: "configured",
          },
        }),
      });
    });

    // Mock board data
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

    // Mock notes with existing tasks
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
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: "existing-item-1",
                    content: "Existing task",
                    checked: false,
                    order: 0,
                  },
                ],
                board: {
                  id: "test-board",
                  name: "Test Board",
                },
                boardId: "test-board",
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
  });

  test("should display AI button when OpenAI is configured", async ({ page }) => {
    await page.goto("/boards/test-board");
    
    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await expect(aiButton).toBeVisible();
    await expect(aiButton.locator('svg.lucide-sparkles')).toBeVisible();
  });

  test("should show setup instructions when OpenAI not configured", async ({ page }) => {
    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user",
          email: "test@example.com",
          name: "Test User",
          isAdmin: true,
          organization: { id: "test-org", name: "Test Organization", openaiApiKey: null },
        }),
      });
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();

    await expect(page.locator("text=AI Task Assistant Not Configured")).toBeVisible();
    await expect(page.locator('input[placeholder*="Learn React hooks"]')).not.toBeVisible();
  });

  test("should open dialog when button clicked", async ({ page }) => {
    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=Generate Tasks with AI")).toBeVisible();
    await expect(page.locator('input[placeholder*="Learn React hooks"]')).toBeVisible();
  });

  test("should generate and display tasks", async ({ page }) => {
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 3 tasks",
          tasks: [
            { content: "Task 1", status: "pending", priority: "high" },
            { content: "Task 2", status: "pending", priority: "medium" },
            { content: "Task 3", status: "pending", priority: "low" },
          ],
        }),
      });
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();
    await page.locator('input[placeholder*="Learn React hooks"]').fill("Test input");
    await page.locator('button:has-text("Generate")').click();

    await expect(page.locator("text=Generated Tasks")).toBeVisible();
    await expect(page.locator("text=Task 1")).toBeVisible();
    await expect(page.locator("text=high priority")).toBeVisible();
    await expect(page.locator("text=3/3 selected")).toBeVisible();
  });

  test("should handle API errors", async ({ page }) => {
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "AI not configured. Please add OpenAI API key in Settings." }),
      });
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();
    await page.locator('input[placeholder*="Learn React hooks"]').fill("Test input");
    await page.locator('button:has-text("Generate")').click();

    await expect(page.locator("text=AI not configured. Please add OpenAI API key in Settings.")).toBeVisible();
  });

  test("should handle task selection", async ({ page }) => {
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 2 tasks",
          tasks: [
            { content: "Task 1", status: "pending", priority: "high" },
            { content: "Task 2", status: "pending", priority: "medium" },
          ],
        }),
      });
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();
    await page.locator('input[placeholder*="Learn React hooks"]').fill("Test");
    await page.locator('button:has-text("Generate")').click();

    await expect(page.locator("text=2/2 selected")).toBeVisible();
    
    await page.locator("text=Task 1").locator("..").click();
    await expect(page.locator("text=1/2 selected")).toBeVisible();
    
    await page.locator('button:has-text("Select All")').click();
    await expect(page.locator("text=2/2 selected")).toBeVisible();
  });

  test("should add selected tasks to note", async ({ page }) => {
    let noteUpdateCalled = false;

    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 1 task",
          tasks: [{ content: "AI Task", status: "pending", priority: "high" }],
        }),
      });
    });

    await page.route("**/api/boards/test-board/notes/test-note", async (route) => {
      if (route.request().method() === "PUT") {
        noteUpdateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ note: { id: "test-note" } }),
        });
      }
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();
    await page.locator('input[placeholder*="Learn React hooks"]').fill("Test");
    await page.locator('button:has-text("Generate")').click();
    await page.locator('button:has-text("Add 1 Task")').click();

    expect(noteUpdateCalled).toBe(true);
  });

  test("should validate input", async ({ page }) => {
    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();

    await expect(page.locator('button:has-text("Generate")')).toBeDisabled();
    
    await page.locator('input[placeholder*="Learn React hooks"]').fill("test");
    await expect(page.locator('button:has-text("Generate")')).toBeEnabled();
  });

  test("should show loading state", async ({ page }) => {
    await page.route("**/api/agent/process", async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 1 task",
          tasks: [{ content: "Test task", status: "pending" }],
        }),
      });
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();
    await page.locator('input[placeholder*="Learn React hooks"]').fill("Test");
    await page.locator('button:has-text("Generate")').click();

    await expect(page.locator("text=Generating...")).toBeVisible();
    await expect(page.locator("text=Test task")).toBeVisible();
  });

  test("should reset dialog state", async ({ page }) => {
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 1 task",
          tasks: [{ content: "Test task", status: "pending" }],
        }),
      });
    });

    await page.goto("/boards/test-board");
    await page.locator('button[title="Generate tasks with AI"]').click();
    await page.locator('input[placeholder*="Learn React hooks"]').fill("Test");
    await page.locator('button:has-text("Generate")').click();
    await expect(page.locator("text=Test task")).toBeVisible();

    await page.locator('button:has-text("Start Over")').click();
    await expect(page.locator("text=Test task")).not.toBeVisible();
  });

  test("should not show AI button for readonly users", async ({ page }) => {
    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "different-user",
          email: "different@example.com",
          name: "Different User",
          isAdmin: false,
          organization: { id: "test-org", name: "Test Organization", openaiApiKey: "configured" },
        }),
      });
    });

    await page.goto("/boards/test-board");
    await expect(page.locator('button[title="Generate tasks with AI"]')).not.toBeVisible();
  });
});