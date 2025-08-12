import { test, expect } from "@playwright/test";

test.describe("Add Task Button", () => {
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
  });

  test('should display "Add task" button for all notes when user is authorized', async ({
    page,
  }) => {
    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "checklist-note",
                content: "",
                color: "#fef3c7",
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: "item-1",
                    content: "Existing task",
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
              {
                id: "regular-note",
                content: "Regular note content",
                color: "#fef3c7",
                done: false,
                x: 300,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [],
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

    await page.goto("/boards/test-board");

    await expect(page.locator("text=Existing task")).toBeVisible();

    const addTaskButtons = page.locator('button:has-text("Add task")');
    await expect(addTaskButtons).toHaveCount(2);

    const firstAddTaskButton = addTaskButtons.first();
    await expect(firstAddTaskButton).toBeVisible();

    const plusIcon = firstAddTaskButton.locator("svg");
    await expect(plusIcon).toBeVisible();

    const secondAddTaskButton = addTaskButtons.nth(1);
    await expect(secondAddTaskButton).toBeVisible();
  });

  test('should not display "Add task" button when user is not authorized', async ({ page }) => {
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
          },
        }),
      });
    });

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "checklist-note",
                content: "",
                color: "#fef3c7",
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: "item-1",
                    content: "Existing task",
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

    await page.goto("/boards/test-board");

    await expect(page.locator("text=Existing task")).toBeVisible();

    const addTaskButton = page.locator('button:has-text("Add task")');
    await expect(addTaskButton).not.toBeVisible();
  });

  test('should create new checklist item when "Add task" button is clicked', async ({ page }) => {
    let noteUpdateCalled = false;
    let updatedChecklistItems: any[] = [];

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "checklist-note",
                content: "",
                color: "#fef3c7",
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: "item-1",
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

    await page.route("**/api/boards/test-board/notes/checklist-note", async (route) => {
      if (route.request().method() === "PUT") {
        noteUpdateCalled = true;
        const requestBody = await route.request().postDataJSON();
        updatedChecklistItems = requestBody.checklistItems;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "checklist-note",
              content: "",
              color: "#fef3c7",
              done: false,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
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

    await expect(page.locator("text=Existing task")).toBeVisible();

    const addTaskButton = page.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const newItemInput = page.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).toBeVisible();
    await expect(newItemInput).toBeFocused();

    await newItemInput.fill("New task from button");
    await newItemInput.press("Enter");

    expect(noteUpdateCalled).toBe(true);
    expect(updatedChecklistItems).toHaveLength(2);
    expect(updatedChecklistItems[1].content).toBe("New task from button");
  });

  test('should keep "Add task" button visible when already adding a checklist item (everpresent)', async ({
    page,
  }) => {
    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "checklist-note",
                content: "",
                color: "#fef3c7",
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: "item-1",
                    content: "Existing task",
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

    await page.goto("/boards/test-board");

    await expect(page.locator("text=Existing task")).toBeVisible();

    const addTaskButton = page.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    const newItemInput = page.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).toBeVisible();
    await expect(addTaskButton).toBeVisible();
  });

  test("should not add checklist item on background click", async ({ page }) => {
    let noteUpdateCalled = false;

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "checklist-note",
                content: "",
                color: "#fef3c7",
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: "item-1",
                    content: "Existing task",
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

    await page.route("**/api/boards/test-board/notes/checklist-note", async (route) => {
      if (route.request().method() === "PUT") {
        noteUpdateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "checklist-note",
              content: "",
              color: "#fef3c7",
              done: false,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: [],
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

    await expect(page.locator("text=Existing task")).toBeVisible();

    const noteBackground = page
      .locator('[data-testid="note-checklist-note"]')
      .or(page.locator(".note-background").first());
    await noteBackground.click({ position: { x: 50, y: 50 } });

    await page.waitForTimeout(500);

    const newItemInput = page.locator('input[placeholder="Add new item..."]');
    await expect(newItemInput).not.toBeVisible();
    expect(noteUpdateCalled).toBe(false);
  });
});
