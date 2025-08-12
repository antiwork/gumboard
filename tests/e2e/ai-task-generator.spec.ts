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

  test("should display AI task generator button when OpenAI is configured", async ({ page }) => {
    await page.goto("/boards/test-board");

    await expect(page.locator("text=Existing task")).toBeVisible();
    
    // AI task generator button should be visible (sparkles icon)
    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await expect(aiButton).toBeVisible();
    
    const sparklesIcon = aiButton.locator('svg.lucide-sparkles');
    await expect(sparklesIcon).toBeVisible();
  });

  test("should show setup instructions when OpenAI is not configured", async ({ page }) => {
    // Override user mock to not have OpenAI API key
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
            openaiApiKey: null,
          },
        }),
      });
    });

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await expect(aiButton).toBeVisible();
    await aiButton.click();

    // Should show setup instructions instead of input form
    await expect(page.locator("text=AI Task Assistant Not Configured")).toBeVisible();
    await expect(page.locator("text=Go to Settings → Organization → AI Task Assistant")).toBeVisible();
    await expect(page.locator("text=Get one from OpenAI")).toBeVisible();
    
    // Input form should not be visible
    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await expect(inputField).not.toBeVisible();
  });

  test("should open AI task generator dialog when button is clicked", async ({ page }) => {
    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await expect(aiButton).toBeVisible();
    await aiButton.click();

    // Dialog should open
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    const dialogTitle = page.locator("text=Generate Tasks with AI");
    await expect(dialogTitle).toBeVisible();
    
    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await expect(inputField).toBeVisible();
    
    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeVisible();
  });

  test("should generate AI tasks and display them", async ({ page }) => {
    // Mock the AI agent API call
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 3 tasks for learning React",
          tasks: [
            {
              content: "Set up React development environment",
              status: "pending",
              priority: "high",
            },
            {
              content: "Learn React hooks and state management",
              status: "pending",
              priority: "medium",
            },
            {
              content: "Build a practice project with React",
              status: "pending",
              priority: "low",
            },
          ],
        }),
      });
    });

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("Learn React hooks");
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for AI response
    await expect(page.locator("text=Generated Tasks")).toBeVisible();
    
    // Check that tasks are displayed
    await expect(page.locator("text=Set up React development environment")).toBeVisible();
    await expect(page.locator("text=Learn React hooks and state management")).toBeVisible();
    await expect(page.locator("text=Build a practice project with React")).toBeVisible();
    
    // Check priority badges
    await expect(page.locator("text=high priority")).toBeVisible();
    await expect(page.locator("text=medium priority")).toBeVisible();
    await expect(page.locator("text=low priority")).toBeVisible();
    
    // Check selection count
    await expect(page.locator("text=3/3 selected")).toBeVisible();
  });

  test("should handle AI API error gracefully", async ({ page }) => {
    // Mock API error
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "AI not configured. Please add OpenAI API key in Settings.",
        }),
      });
    });

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("Learn React hooks");
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Error message should be displayed
    const errorMessage = page.locator("text=AI not configured. Please add OpenAI API key in Settings.");
    await expect(errorMessage).toBeVisible();
  });

  test("should allow selecting and deselecting tasks", async ({ page }) => {
    // Mock AI response
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 2 tasks",
          tasks: [
            {
              content: "Task 1",
              status: "pending",
              priority: "high",
            },
            {
              content: "Task 2",
              status: "pending",
              priority: "medium",
            },
          ],
        }),
      });
    });

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("Test tasks");
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    await expect(page.locator("text=2/2 selected")).toBeVisible();

    // Click first task to deselect
    const firstTask = page.locator("text=Task 1").locator("..");
    await firstTask.click();

    await expect(page.locator("text=1/2 selected")).toBeVisible();

    // Click "Select All" button
    const selectAllButton = page.locator('button:has-text("Select All")');
    await selectAllButton.click();

    await expect(page.locator("text=2/2 selected")).toBeVisible();

    // Click "Deselect All" button
    const deselectAllButton = page.locator('button:has-text("Deselect All")');
    await deselectAllButton.click();

    await expect(page.locator("text=0/2 selected")).toBeVisible();
  });

  test("should add selected tasks to the note", async ({ page }) => {
    let noteUpdateCalled = false;
    let updatedChecklistItems: any[] = [];

    // Mock AI response
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 2 tasks",
          tasks: [
            {
              content: "AI Generated Task 1",
              status: "pending",
              priority: "high",
            },
            {
              content: "AI Generated Task 2",
              status: "pending",
              priority: "medium",
            },
          ],
        }),
      });
    });

    // Mock note update
    await page.route("**/api/boards/test-board/notes/test-note", async (route) => {
      if (route.request().method() === "PUT") {
        noteUpdateCalled = true;
        const requestBody = await route.request().postDataJSON();
        updatedChecklistItems = requestBody.checklistItems;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "test-note",
              content: "",
              color: "#fef3c7",
              done: false,
              checklistItems: requestBody.checklistItems,
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

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("Generate tasks");
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    await expect(page.locator("text=AI Generated Task 1")).toBeVisible();

    // Deselect one task
    const secondTask = page.locator("text=AI Generated Task 2").locator("..");
    await secondTask.click();

    await expect(page.locator("text=1/2 selected")).toBeVisible();

    // Add selected tasks
    const addButton = page.locator('button:has-text("Add 1 Task")');
    await addButton.click();

    expect(noteUpdateCalled).toBe(true);
    expect(updatedChecklistItems).toHaveLength(2); // 1 existing + 1 new
    expect(updatedChecklistItems[1].content).toBe("AI Generated Task 1");
  });

  test("should handle empty input gracefully", async ({ page }) => {
    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const generateButton = page.locator('button:has-text("Generate")');
    await expect(generateButton).toBeDisabled();

    // Type and delete to test empty state
    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("test");
    await expect(generateButton).toBeEnabled();
    
    await inputField.fill("");
    await expect(generateButton).toBeDisabled();
  });

  test("should show loading state while generating tasks", async ({ page }) => {
    // Delay the API response to test loading state
    await page.route("**/api/agent/process", async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 1 task",
          tasks: [{ content: "Test task", status: "pending", priority: "medium" }],
        }),
      });
    });

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("Test task");
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Should show loading state
    await expect(page.locator("text=Generating...")).toBeVisible();

    // Wait for completion
    await expect(page.locator("text=Test task")).toBeVisible();
    await expect(page.locator("text=Generating...")).not.toBeVisible();
  });

  test("should reset dialog state when starting over", async ({ page }) => {
    // Mock AI response
    await page.route("**/api/agent/process", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Generated 1 task",
          tasks: [{ content: "Test task", status: "pending", priority: "medium" }],
        }),
      });
    });

    await page.goto("/boards/test-board");

    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await aiButton.click();

    const inputField = page.locator('input[placeholder*="Learn React hooks"]');
    await inputField.fill("Test task");
    
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    await expect(page.locator("text=Test task")).toBeVisible();

    // Click "Start Over"
    const startOverButton = page.locator('button:has-text("Start Over")');
    await startOverButton.click();

    // Dialog should reset
    await expect(page.locator("text=Test task")).not.toBeVisible();
    await expect(inputField).toHaveValue("");
    await expect(generateButton).toBeDisabled();
  });

  test("should not display AI button for readonly notes", async ({ page }) => {
    // Mock user without edit permissions
    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "different-user",
          email: "different@example.com",
          name: "Different User",
          isAdmin: false,
          organization: {
            id: "test-org",
            name: "Test Organization",
            openaiApiKey: "configured",
          },
        }),
      });
    });

    await page.goto("/boards/test-board");

    // AI button should not be visible for readonly notes (user doesn't own the note)
    const aiButton = page.locator('button[title="Generate tasks with AI"]');
    await expect(aiButton).not.toBeVisible();
  });
});