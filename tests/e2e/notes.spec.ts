import { ChecklistItem } from "@/components";
import { test, expect } from "@playwright/test";

test.describe("Note Management", () => {
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
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "new-note-id",
              content: "",
              color: "#fef3c7",
              done: false,
              checklistItems: postData.checklistItems || [
                {
                  id: `item-${Date.now()}`,
                  content: "",
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
              board: {
                id: "test-board",
                name: "Target Board",
              },
              boardId: "test-board",
            },
          }),
        });
      }
    });

    await page.route("**/api/boards/test-board/notes/new-note-id", async (route) => {
      if (route.request().method() === "PUT") {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "new-note-id",
              content: "",
              color: "#fef3c7",
              done: false,
              checklistItems: postData.checklistItems || [
                {
                  id: `item-${Date.now()}`,
                  content: "",
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
              board: {
                id: "test-board",
                name: "Target Board",
              },
              boardId: "test-board",
            },
          }),
        });
      }
    });

    await page.route("**/api/boards/all-notes/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ notes: [] }),
        });
      }

      if (route.request().method() === "POST") {
        const postData = await route.request().postDataJSON();

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "all-notes-note-id",
              content: postData.content || "",
              color: "#fef3c7",
              done: false,
              checklistItems: postData.checklistItems || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User",
                email: "test@example.com",
              },
              board: {
                id: "test-board",
                name: "Target Board",
              },
              boardId: "test-board",
            },
          }),
        });
      }
    });
  });

  test.describe("with Newlines", () => {
    test("should always use note.boardId for all API calls", async ({ page }) => {
      let apiCallsMade: { url: string; method: string }[] = [];

      const mockNoteData = {
        id: "test-note-123",
        content: "Original content",
        color: "#fef3c7",
        done: false,
        checklistItems: [
          {
            id: "item-1",
            content: "Test item",
            checked: false,
            order: 0,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        boardId: "note-actual-board-id",
        board: {
          id: "note-actual-board-id",
          name: "Note Actual Board",
        },
        user: {
          id: "test-user",
          name: "Test User",
          email: "test@example.com",
        },
      };

      await page.route("**/api/boards/*/notes/*", async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        apiCallsMade.push({
          url,
          method,
        });

        if (method === "PUT" || method === "DELETE") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              note: mockNoteData,
            }),
          });
        }
      });

      await page.route("**/api/boards/all-notes/notes", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              notes: [mockNoteData],
            }),
          });
        }
      });

      await page.goto("/boards/all-notes");

      // Check for all the actions for notes & checklistitem

      // Test 1: Toggle checklist item
      const checkbox = page.locator('[data-state="unchecked"]').first();
      await expect(checkbox).toBeVisible();
      await checkbox.click();

      // Test 2: Add a new checklist item
      const addTaskButton = page.locator('button:has-text("Add task")');
      await expect(addTaskButton).toBeVisible();
      await addTaskButton.click();
      const newItemInput = page.locator('input[placeholder="Add new item..."]');
      await expect(newItemInput).toBeVisible();
      await newItemInput.fill("New test item");
      await newItemInput.press("Enter");

      // Test 3: Edit checklist item content
      const existingItem = page.locator("text=Test item").first();
      await expect(existingItem).toBeVisible();
      await existingItem.dblclick();
      const editInput = page.locator('input[value="Test item"]');
      await editInput.isVisible();
      await editInput.fill("Edited test item");
      await page.getByText("Note Actual Board").click();

      // Test 4: Delete checklist item
      await page.getByRole("button", { name: "Delete item", exact: true }).click();

      expect(apiCallsMade.filter((call) => call.method === "PUT").length).toBe(4);
      expect(apiCallsMade.length).toBe(4);

      apiCallsMade.forEach((call) => {
        expect(call.url).toContain("api/boards/note-actual-board-id/notes/test-note-123");
      });
    });

    test("should autofocus new checklist item input when Add task is clicked", async ({ page }) => {
      await page.goto("/boards/test-board");

      await page.click('button:has-text("Add Your First Note")');
      await page.waitForTimeout(500);

      const initialInput = page.locator("input.bg-transparent").first();
      await initialInput.fill("First item");
      await initialInput.press("Enter");
      await page.waitForTimeout(300);

      await page.click('button:has-text("Add task")');

      const newItemInput = page.locator('input[placeholder="Add new item..."]');
      await expect(newItemInput).toBeVisible();
      await expect(newItemInput).toBeFocused();

      await newItemInput.blur();
      await page.waitForTimeout(100);

      await page.click('button:has-text("Add task")');
      await expect(newItemInput).toBeFocused();
    });

    test("should create a checklist note and verify database state", async ({ page }) => {
      let noteCreated = false;
      let noteData: any = null;

      await page.route("**/api/boards/test-board/notes", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes: [] }),
          });
        } else if (route.request().method() === "POST") {
          noteCreated = true;
          const postData = await route.request().postDataJSON();
          noteData = postData;

          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              note: {
                id: "new-note-id",
                content: "",
                color: "#fef3c7",
                done: false,
                checklistItems: postData.checklistItems || [
                  {
                    id: `item-${Date.now()}`,
                    content: "",
                    checked: false,
                    order: 0,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                board: {
                  id: "test-board-id",
                  name: "Test Board",
                },
                boardId: "test-board-id",
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

      await page.evaluate(() => {
        const mockNoteData = {
          content: "",
          checklistItems: [
            {
              id: `item-${Date.now()}`,
              content: "",
              checked: false,
              order: 0,
            },
          ],
        };
        fetch("/api/boards/test-board/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockNoteData),
        });
      });

      await page.waitForTimeout(100);

      expect(noteCreated).toBe(true);
      expect(noteData).not.toBeNull();
      expect(noteData!.checklistItems).toBeDefined();
      expect(Array.isArray(noteData!.checklistItems)).toBe(true);
    });

    test("should handle checklist item editing", async ({ page }) => {
      await page.goto("/boards/test-board");

      await page.click('button:has-text("Add Your First Note")');

      await page.waitForTimeout(500);

      await page.getByRole("button", { name: "Add task" }).first().click();
      await page.getByPlaceholder("Add new item...").fill("#1 Task item");
      await page.getByPlaceholder("Add new item...").press("Enter");
      await page.waitForTimeout(500);
      await expect(page.getByText("#1 Task item")).toBeVisible();

      await page.getByText("#1 Task item").click();
      const editInput = page.locator('input[value="#1 Task item"]');
      await expect(editInput).toBeVisible();
      await editInput.focus();
      await editInput.fill("#1 Task item edited");
      await page.locator('input[value="#1 Task item edited"]').press("Enter");
      await page.waitForTimeout(500);
      await expect(page.getByText("#1 Task item edited")).toBeVisible();
    });

    test("should handle creating multiple checklist items", async ({ page }) => {
      await page.goto("/boards/test-board");

      await page.click('button:has-text("Add Your First Note")');

      await page.waitForTimeout(500);

      await page.getByRole("button", { name: "Add task" }).first().click();
      await page.getByPlaceholder("Add new item...").fill("#1 Task item");
      await page.getByPlaceholder("Add new item...").press("Enter");
      await page.waitForTimeout(500);
      await expect(page.getByText("#1 Task item")).toBeVisible();

      await page.getByRole("button", { name: "Add task" }).first().click();
      await page.getByPlaceholder("Add new item...").fill("#2 Task item");
      await page.getByPlaceholder("Add new item...").press("Enter");
      await page.waitForTimeout(500);
      await expect(page.getByText("#2 Task item")).toBeVisible();
    });

    test("should display empty state when no notes exist", async ({ page }) => {
      await page.goto("/boards/test-board");

      await expect(page.locator("text=No notes yet")).toBeVisible();
      await expect(page.locator('button:has-text("Add Your First Note")')).toBeVisible();
    });

    test("should create a note in the all notes view", async ({ page }) => {
      await page.goto("/boards/all-notes");
      await page.getByRole("button", { name: "Add Note" }).first().click();
      await page.waitForTimeout(500);
      await expect(page.locator(".note-background")).toBeVisible();
    });
  });

  test.describe("Drag N Drop", () => {
    const testUser = { id: "test-user", name: "Test User", email: "test@example.com" };
    const testBoard = { id: "test-board", name: "Test Board", sendSlackUpdates: false };
    const noteColor = "#fef3c7";

    const createChecklistItem = (id: string, content: string, checked = false, order: number) => ({
      id,
      content,
      checked,
      order,
    });

    const createNote = (id: string, checklistItems: any[], content = "") => ({
      id,
      content,
      color: noteColor,
      done: false,
      checklistItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: testUser,
      boardId: "test-board",
      board: testBoard,
    });

    const setupNotesRoute = (page: any, notes: any[]) => {
      return page.route("**/api/boards/test-board/notes", async (route: any) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes }),
          });
        } else if (route.request().method() === "POST") {
          const postData = await route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              note: {
                id: "new-note-id",
                content: "",
                color: noteColor,
                done: false,
                checklistItems: postData.checklistItems || [
                  {
                    id: `item-${Date.now()}`,
                    content: "",
                    checked: false,
                    order: 0,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: testUser,
                board: {
                  id: "test-board",
                  name: "Target Board",
                },
                boardId: "test-board",
              },
            }),
          });
        }
      });
    };

    const setupNoteUpdateRoute = (
      page: any,
      noteId: string,
      didCallUpdateApi: { value: boolean } | null = null
    ) => {
      return page.route(`**/api/boards/test-board/notes/${noteId}`, async (route: any) => {
        if (route.request().method() === "PUT") {
          if (didCallUpdateApi !== null) didCallUpdateApi.value = true;

          const body = await route.request().postDataJSON();
          const processedChecklistItems =
            body.checklistItems?.map((item: Partial<ChecklistItem>, index: number) => ({
              ...item,
              order: index,
            })) || [];

          const updatedNote = {
            id: noteId,
            content: "Test Note with Checklist",
            color: noteColor,
            done: body.done,
            checklistItems: processedChecklistItems,
            slackMessageId: null,
            boardId: "test-board",
            createdBy: "test-user",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
            user: testUser,
            board: testBoard,
          };

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ note: updatedNote }),
          });
        }
      });
    };

    const performDragDrop = async (page: any, sourceSelector: string, targetSelector: string) => {
      const sourceElement = page.locator(sourceSelector);
      const targetElement = page.locator(targetSelector);

      await expect(sourceElement).toBeVisible();

      const targetBox = await targetElement.boundingBox();
      if (!targetBox) throw Error("will never throw");

      await sourceElement.hover();
      await page.mouse.down();
      // repeat to trigger dragover event reliably https://playwright.dev/docs/input#dragging-manually
      await targetElement.hover();
      await targetElement.hover();
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 5);
      await page.mouse.up();
    };

    const expectItemOrder = async (page: any, expectedOrder: Record<string, number>) => {
      for (const [itemId, order] of Object.entries(expectedOrder)) {
        await expect(page.getByTestId(itemId)).toHaveAttribute("data-testorder", order.toString());
      }
    };

    test.beforeEach(async ({ page }) => {
      const defaultNotes = [
        createNote("note-1", [
          createChecklistItem("item-a1", "Item A1", false, 0),
          createChecklistItem("item-a2", "Item A2", false, 1),
          createChecklistItem("item-a3", "Item A3", false, 2),
          createChecklistItem("item-a4", "Item A4", false, 3),
        ]),
        createNote("note-2", [
          createChecklistItem("item-b1", "Item B1", false, 0),
          createChecklistItem("item-b2", "Item B2", false, 1),
          createChecklistItem("item-b3", "Item B3", false, 2),
          createChecklistItem("item-b4", "Item B4", false, 3),
        ]),
      ];

      await setupNotesRoute(page, defaultNotes);

      await page.route("**/api/boards/test-board/notes/new-note-id", async (route) => {
        if (route.request().method() === "PUT") {
          const postData = await route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              note: {
                id: "new-note-id",
                content: "",
                color: noteColor,
                done: false,
                checklistItems: postData.checklistItems || [
                  {
                    id: `item-${Date.now()}`,
                    content: "",
                    checked: false,
                    order: 0,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: testUser,
                board: {
                  id: "test-board",
                  name: "Target Board",
                },
                boardId: "test-board",
              },
            }),
          });
        }
      });

      await page.route("**/api/boards/all-notes/notes", async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes: [] }),
          });
        }

        if (route.request().method() === "POST") {
          const postData = await route.request().postDataJSON();

          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              note: {
                id: "all-notes-note-id",
                content: postData.content || "",
                color: noteColor,
                done: false,
                checklistItems: postData.checklistItems || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: testUser,
                board: {
                  id: "test-board",
                  name: "Target Board",
                },
                boardId: "test-board",
              },
            }),
          });
        }
      });
    });

    test("should disallow DnD for checklist items across notes", async ({ page }) => {
      const didCallUpdateApi = { value: false };
      await setupNoteUpdateRoute(page, "note-1", didCallUpdateApi);

      await page.goto("/boards/test-board");
      await performDragDrop(page, "text=Item A1", "text=Item B1");

      await expectItemOrder(page, {
        "item-a1": 0,
        "item-a2": 1,
        "item-a3": 2,
        "item-a4": 3,
        "item-b1": 0,
        "item-b2": 1,
        "item-b3": 2,
        "item-b4": 3,
      });

      expect(didCallUpdateApi.value).toBeFalsy();
    });

    test("should not update state when an unchecked checklist item is dropped after checked", async ({
      page,
    }) => {
      const didCallUpdateApi = { value: false };
      const notes = [
        createNote(
          "note-1",
          [
            createChecklistItem("item-a1", "Item A1", false, 0),
            createChecklistItem("item-a2", "Item A2", false, 1),
            createChecklistItem("item-a3", "Item A3", true, 2),
            createChecklistItem("item-a4", "Item A4", true, 3),
          ],
          "Test Note with Checklist"
        ),
      ];

      await setupNotesRoute(page, notes);
      await setupNoteUpdateRoute(page, "note-1", didCallUpdateApi);

      await page.goto("/boards/test-board");
      await performDragDrop(page, "text=Item A1", "text=Item A3");

      await expectItemOrder(page, {
        "item-a1": 0,
        "item-a2": 1,
        "item-a3": 2,
        "item-a4": 3,
      });

      expect(didCallUpdateApi.value).toBeFalsy();
    });

    test("should re-order checklist items within a note", async ({ page }) => {
      const notes = [
        createNote(
          "note-1",
          [
            createChecklistItem("item-a1", "Item A1", false, 0),
            createChecklistItem("item-a2", "Item A2", false, 1),
            createChecklistItem("item-a3", "Item A3", false, 2),
            createChecklistItem("item-a4", "Item A4", false, 3),
          ],
          "Test Note with Checklist"
        ),
      ];

      await setupNotesRoute(page, notes);
      await setupNoteUpdateRoute(page, "note-1");

      await page.goto("/boards/test-board");
      await performDragDrop(page, "text=Item A3", "text=Item A1");
      await page.waitForTimeout(200);

      await expectItemOrder(page, {
        "item-a3": 0,
        "item-a1": 1,
        "item-a2": 2,
        "item-a4": 3,
      });
    });

    test("should re-order checked items within checked group area", async ({ page }) => {
      const notes = [
        createNote(
          "note-1",
          [
            createChecklistItem("item-a1", "Item A1", false, 0),
            createChecklistItem("item-a2", "Item A2", false, 1),
            createChecklistItem("item-a3", "Item A3", true, 2),
            createChecklistItem("item-a4", "Item A4", true, 3),
            createChecklistItem("item-a5", "Item A5", true, 4),
          ],
          "Test Note with Checklist"
        ),
      ];

      await setupNotesRoute(page, notes);
      await setupNoteUpdateRoute(page, "note-1");

      await page.goto("/boards/test-board");
      await performDragDrop(page, "text=Item A5", "text=Item A3");
      await page.waitForTimeout(200);

      await expectItemOrder(page, {
        "item-a1": 0,
        "item-a2": 1,
        "item-a5": 2,
        "item-a3": 3,
        "item-a4": 4,
      });
    });

    test("should re-order unchecked items within unchecked group area", async ({ page }) => {
      const notes = [
        createNote(
          "note-1",
          [
            createChecklistItem("item-a1", "Item A1", false, 0),
            createChecklistItem("item-a2", "Item A2", false, 1),
            createChecklistItem("item-a3", "Item A3", false, 2),
            createChecklistItem("item-a4", "Item A4", true, 3),
            createChecklistItem("item-a5", "Item A5", true, 4),
          ],
          "Test Note with Checklist"
        ),
      ];

      await setupNotesRoute(page, notes);
      await setupNoteUpdateRoute(page, "note-1");

      await page.goto("/boards/test-board");
      await performDragDrop(page, "text=Item A2", "text=Item A1");
      await page.waitForTimeout(200);

      await expectItemOrder(page, {
        "item-a2": 0,
        "item-a1": 1,
        "item-a3": 2,
        "item-a4": 3,
        "item-a5": 4,
      });
    });
  });
});
