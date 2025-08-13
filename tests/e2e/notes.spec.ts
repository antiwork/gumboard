import { ChecklistItem } from "@/components";
import { test, expect } from "../fixtures/test-helpers";

test.describe("Note Management", () => {
  let testBoard: { id: string; name: string; description: string | null };

  test.beforeEach(async ({ page, testUser, testOrganization, prisma }) => {
    testBoard = await prisma.board.create({
      data: {
        id: "test-board-" + Math.random().toString(36).substring(7),
        name: "Test Board",
        description: "A test board",
        organizationId: testOrganization.id,
        createdBy: testUser.id,
      },
    });

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
          },
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          isAdmin: true,
          organizationId: testOrganization.id,
          organization: testOrganization,
        }),
      });
    });

    await page.route(`**/api/boards/${testBoard.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          board: testBoard,
        }),
      });
    });

    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          boards: [testBoard],
        }),
      });
    });

    await page.route(`**/api/boards/${testBoard.id}/notes`, async (route) => {
      if (route.request().method() === "GET") {
        const notes = await prisma.note.findMany({
          where: { boardId: testBoard.id },
          include: { 
            checklistItems: { orderBy: { order: 'asc' } },
            user: true,
            board: true 
          },
        });
        
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ notes }),
        });
      } else if (route.request().method() === "POST") {
        const postData = await route.request().postDataJSON();
        
        const newNote = await prisma.note.create({
          data: {
            id: "note-" + Math.random().toString(36).substring(7),
            content: postData.content || "",
            color: postData.color || "#fef3c7",
            boardId: testBoard.id,
            createdBy: testUser.id,
            checklistItems: {
              create: postData.checklistItems?.map((item: any, index: number) => ({
                id: "item-" + Math.random().toString(36).substring(7),
                content: item.content || "",
                checked: item.checked || false,
                order: index,
              })) || [{
                id: "item-" + Math.random().toString(36).substring(7),
                  content: "",
                  checked: false,
                  order: 0,
              }]
            }
          },
          include: {
            checklistItems: { orderBy: { order: 'asc' } },
            user: true,
            board: true,
          },
        });

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ note: newNote }),
        });
      }
    });

    await page.route(`**/api/boards/${testBoard.id}/notes/*`, async (route) => {
      if (route.request().method() === "PUT") {
        const postData = await route.request().postDataJSON();
        const noteId = route.request().url().split('/').pop();
        
        const updatedNote = await prisma.note.update({
          where: { id: noteId },
          data: {
            content: postData.content,
            color: postData.color,
            checklistItems: postData.checklistItems ? {
              deleteMany: {},
              create: postData.checklistItems.map((item: any, index: number) => ({
                id: item.id || "item-" + Math.random().toString(36).substring(7),
                content: item.content || "",
                checked: item.checked || false,
                order: index,
              }))
            } : undefined
          },
          include: {
            checklistItems: { orderBy: { order: 'asc' } },
            user: true,
            board: true,
          },
        });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ note: updatedNote }),
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
              archivedAt: null,
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
        archivedAt: null,
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

    test("should autofocus new checklist item input when Add task is clicked", async ({ page, testUser }) => {
      await page.goto(`/boards/${testBoard.id}`);

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

    test("should create a checklist note and verify database state", async ({ 
      page, 
      prisma, 
      testUser 
    }) => {
      const notesCountBefore = await prisma.note.count({
        where: { boardId: testBoard.id },
      });

      await page.goto(`/boards/${testBoard.id}`);

      await page.evaluate((boardId) => {
        const mockNoteData = {
          content: "Test Note Content",
          color: "#fef3c7",
          checklistItems: [
            {
              content: "Test checklist item",
              checked: false,
              order: 0,
            },
          ],
        };
        fetch(`/api/boards/${boardId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockNoteData),
        });
      }, testBoard.id);

      await page.waitForTimeout(500);

      const notesCountAfter = await prisma.note.count({
        where: { boardId: testBoard.id },
      });

      const createdNote = await prisma.note.findFirst({
        where: { 
          boardId: testBoard.id,
          createdBy: testUser.id,
        },
        include: { 
          checklistItems: { orderBy: { order: 'asc' } },
          user: true,
          board: true,
        },
      });

      expect(notesCountAfter).toBe(notesCountBefore + 1);
      expect(createdNote).toBeTruthy();
      expect(createdNote?.content).toBe("Test Note Content");
      expect(createdNote?.color).toBe("#fef3c7");
      expect(createdNote?.boardId).toBe(testBoard.id);
      expect(createdNote?.createdBy).toBe(testUser.id);
      expect(createdNote?.checklistItems).toBeDefined();
      expect(createdNote?.checklistItems.length).toBeGreaterThan(0);
      expect(createdNote?.checklistItems[0].content).toBe("Test checklist item");
    });

    test("should handle checklist item editing", async ({ page, testUser, prisma }) => {
      const testNote = await prisma.note.create({
        data: {
          id: "edit-note-" + Math.random().toString(36).substring(7),
          content: "Test Note for Editing",
          color: "#fef3c7",
          boardId: testBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [{
              id: "edit-item-" + Math.random().toString(36).substring(7),
              content: "#1 Task item",
              checked: false,
              order: 0,
            }]
          }
        },
        include: {
          checklistItems: { orderBy: { order: 'asc' } },
          user: true,
          board: true,
        },
      });

      await page.goto(`/boards/${testBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.getByText("#1 Task item")).toBeVisible();

      await page.getByText("#1 Task item").click();
      const editInput = page.locator('input[value="#1 Task item"]');
      await expect(editInput).toBeVisible();
      await editInput.focus();
      await editInput.fill("#1 Task item edited");
      await page.locator('input[value="#1 Task item edited"]').press("Enter");
      await page.waitForTimeout(500);
      await expect(page.getByText("#1 Task item edited")).toBeVisible();

      const updatedNote = await prisma.note.findUnique({
        where: { id: testNote.id },
        include: { checklistItems: true },
      });
      expect(updatedNote?.checklistItems[0].content).toBe("#1 Task item edited");
    });

    test("should handle creating multiple checklist items", async ({ page, testUser, prisma }) => {
      const testNote = await prisma.note.create({
        data: {
          id: "multi-note-" + Math.random().toString(36).substring(7),
          content: "Test Note for Multiple Items",
          color: "#fef3c7",
          boardId: testBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [{
              id: "multi-item-1-" + Math.random().toString(36).substring(7),
              content: "#1 Task item",
              checked: false,
              order: 0,
            }]
          }
        },
        include: {
          checklistItems: { orderBy: { order: 'asc' } },
          user: true,
          board: true,
        },
      });

      await page.goto(`/boards/${testBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.getByText("#1 Task item")).toBeVisible();

      await page.getByRole("button", { name: "Add task" }).first().click();
      await page.getByPlaceholder("Add new item...").fill("#2 Task item");
      await page.getByPlaceholder("Add new item...").press("Enter");
      await page.waitForTimeout(500);
      await expect(page.getByText("#2 Task item")).toBeVisible();

      const updatedNote = await prisma.note.findUnique({
        where: { id: testNote.id },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });
      expect(updatedNote?.checklistItems.length).toBe(2);
      expect(updatedNote?.checklistItems[1].content).toBe("#2 Task item");
    });

    test("should display empty state when no notes exist", async ({ page, testUser }) => {
      await page.goto(`/boards/${testBoard.id}`);

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

  test.describe("Delete with Undo (toasts)", () => {
    test("should show Undo toast and restore note without issuing DELETE when undone", async ({
      page,
      testUser,
    }) => {
      let deleteCalled = false;

      await page.route(`**/api/boards/${testBoard.id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: testBoard,
          }),
        });
      });

      await page.route("**/api/boards", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            boards: [{ id: "test-board", name: "Test Board", description: "A test board" }],
          }),
        });
      });

      const note = {
        id: "note-to-delete",
        content: "",
        color: "#fef3c7",
        archivedAt: null,
        checklistItems: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: testUser,
        board: testBoard,
        boardId: testBoard.id,
      };

      await page.route(`**/api/boards/${testBoard.id}/notes`, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes: [note] }),
          });
        }
      });

      await page.route(`**/api/boards/${testBoard.id}/notes/note-to-delete`, async (route) => {
        if (route.request().method() === "DELETE") {
          deleteCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
          });
        }
      });

      await page.goto(`/boards/${testBoard.id}`);
      await page.getByRole("button", { name: "Delete Note note-to-delete", exact: true }).click();
      await expect(page.getByText("Note deleted")).toBeVisible();
      await page.getByRole("button", { name: "Undo" }).click();

      await expect(
        page.getByRole("button", { name: "Delete Note note-to-delete", exact: true })
      ).toBeVisible();

      await page.waitForTimeout(300);
      expect(deleteCalled).toBe(false);
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
      archivedAt: null,
      checklistItems,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: testUser,
      boardId: testBoard.id,
      board: testBoard,
    });

    const setupNotesRoute = (page: any, notes: any[]) => {
      return page.route(`**/api/boards/${testBoard.id}/notes`, async (route: any) => {
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
                archivedAt: null,
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
      return page.route(`**/api/boards/${testBoard.id}/notes/${noteId}`, async (route: any) => {
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
            archivedAt: body.archivedAt,
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

      await page.route(`**/api/boards/${testBoard.id}/notes/new-note-id`, async (route) => {
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
                archivedAt: null,
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
                archivedAt: null,
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

    test("should disallow DnD for checklist items across notes", async ({ page, testUser, prisma, testOrganization }) => {
      const dragTestBoard = await prisma.board.create({
        data: {
          id: "drag-test-board-" + Math.random().toString(36).substring(7),
          name: "Drag Test Board",
          description: "A test board for drag and drop",
          organizationId: testOrganization.id,
          createdBy: testUser.id,
        },
      });

      const note1 = await prisma.note.create({
        data: {
          id: "note-1",
          content: "Note A",
          color: "#fef3c7",
          boardId: dragTestBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [
              { id: "item-a1", content: "Item A1", checked: false, order: 0 },
              { id: "item-a2", content: "Item A2", checked: false, order: 1 },
              { id: "item-a3", content: "Item A3", checked: false, order: 2 },
              { id: "item-a4", content: "Item A4", checked: false, order: 3 },
            ]
          }
        },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });

      const note2 = await prisma.note.create({
        data: {
          id: "note-2",
          content: "Note B",
          color: "#fef3c7",
          boardId: dragTestBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [
              { id: "item-b1", content: "Item B1", checked: false, order: 0 },
              { id: "item-b2", content: "Item B2", checked: false, order: 1 },
              { id: "item-b3", content: "Item B3", checked: false, order: 2 },
              { id: "item-b4", content: "Item B4", checked: false, order: 3 },
            ]
          }
        },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });

      await page.route(`**/api/boards/${dragTestBoard.id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board: dragTestBoard }),
        });
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes`, async (route) => {
        if (route.request().method() === "GET") {
          const notes = await prisma.note.findMany({
            where: { boardId: dragTestBoard.id },
            include: { 
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true 
            },
          });
          
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes }),
          });
        }
      });

      await page.goto(`/boards/${dragTestBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.locator("text=Item A1")).toBeVisible();
      await expect(page.locator("text=Item B1")).toBeVisible();

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

      const note1After = await prisma.note.findUnique({
        where: { id: note1.id },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });
      expect(note1After?.checklistItems[0].content).toBe("Item A1");
    });

    test("should not update state when an unchecked checklist item is dropped after checked", async ({
      page,
      testUser,
      prisma,
      testOrganization,
    }) => {
      const dragTestBoard = await prisma.board.create({
        data: {
          id: "drag-test-board-2-" + Math.random().toString(36).substring(7),
          name: "Drag Test Board 2",
          description: "A test board for drag and drop",
          organizationId: testOrganization.id,
          createdBy: testUser.id,
        },
      });

      const note1 = await prisma.note.create({
        data: {
          id: "note-1",
          content: "Test Note with Checklist",
          color: "#fef3c7",
          boardId: dragTestBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [
              { id: "item-a1", content: "Item A1", checked: false, order: 0 },
              { id: "item-a2", content: "Item A2", checked: false, order: 1 },
              { id: "item-a3", content: "Item A3", checked: true, order: 2 },
              { id: "item-a4", content: "Item A4", checked: true, order: 3 },
            ]
          }
        },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });

      await page.route(`**/api/boards/${dragTestBoard.id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board: dragTestBoard }),
        });
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes`, async (route) => {
        if (route.request().method() === "GET") {
          const notes = await prisma.note.findMany({
            where: { boardId: dragTestBoard.id },
            include: { 
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true 
            },
          });
          
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes }),
          });
        }
      });

      await page.goto(`/boards/${dragTestBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.locator("text=Item A1")).toBeVisible();
      await expect(page.locator("text=Item A3")).toBeVisible();

      await performDragDrop(page, "text=Item A1", "text=Item A3");

      await expectItemOrder(page, {
        "item-a1": 0,
        "item-a2": 1,
        "item-a3": 2,
        "item-a4": 3,
      });

      const noteAfter = await prisma.note.findUnique({
        where: { id: note1.id },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });
      expect(noteAfter?.checklistItems[0].content).toBe("Item A1");
    });

    test("should re-order checklist items within a note", async ({ page, testUser, prisma, testOrganization }) => {
      const dragTestBoard = await prisma.board.create({
        data: {
          id: "drag-test-board-3-" + Math.random().toString(36).substring(7),
          name: "Drag Test Board 3",
          description: "A test board for drag and drop",
          organizationId: testOrganization.id,
          createdBy: testUser.id,
        },
      });

      const note1 = await prisma.note.create({
        data: {
          id: "note-1",
          content: "Test Note with Checklist",
          color: "#fef3c7",
          boardId: dragTestBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [
              { id: "item-a1", content: "Item A1", checked: false, order: 0 },
              { id: "item-a2", content: "Item A2", checked: false, order: 1 },
              { id: "item-a3", content: "Item A3", checked: false, order: 2 },
              { id: "item-a4", content: "Item A4", checked: false, order: 3 },
            ]
          }
        },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });

      await page.route(`**/api/boards/${dragTestBoard.id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board: dragTestBoard }),
        });
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes`, async (route) => {
        if (route.request().method() === "GET") {
          const notes = await prisma.note.findMany({
            where: { boardId: dragTestBoard.id },
            include: { 
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true 
            },
          });
          
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes }),
          });
        }
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes/note-1`, async (route) => {
        if (route.request().method() === "PUT") {
          const postData = await route.request().postDataJSON();

          if (postData.checklistItems) {
            await prisma.checklistItem.deleteMany({
              where: { noteId: "note-1" }
            });

            await prisma.checklistItem.createMany({
              data: postData.checklistItems.map((item: any, index: number) => ({
                id: item.id,
                content: item.content || "",
                checked: item.checked || false,
                order: index,
                noteId: "note-1",
              }))
            });
          }

          const updatedNote = await prisma.note.findUnique({
            where: { id: "note-1" },
            include: {
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true,
            },
          });

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ note: updatedNote }),
          });
        }
      });

      await page.goto(`/boards/${dragTestBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.locator("text=Item A3")).toBeVisible();
      await expect(page.locator("text=Item A1")).toBeVisible();

      await performDragDrop(page, "text=Item A3", "text=Item A1");
      await page.waitForTimeout(200);

      await expectItemOrder(page, {
        "item-a3": 0,
        "item-a1": 1,
        "item-a2": 2,
        "item-a4": 3,
      });

      const noteAfter = await prisma.note.findUnique({
        where: { id: note1.id },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });
      expect(noteAfter?.checklistItems.length).toBe(4);
    });

    test("should re-order checked items within checked group area", async ({ page, testUser, prisma, testOrganization }) => {
      const dragTestBoard = await prisma.board.create({
        data: {
          id: "drag-test-board-4-" + Math.random().toString(36).substring(7),
          name: "Drag Test Board 4",
          description: "A test board for drag and drop",
          organizationId: testOrganization.id,
          createdBy: testUser.id,
        },
      });

      const note1 = await prisma.note.create({
        data: {
          id: "note-1",
          content: "Test Note with Checklist",
          color: "#fef3c7",
          boardId: dragTestBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [
              { id: "item-a1", content: "Item A1", checked: false, order: 0 },
              { id: "item-a2", content: "Item A2", checked: false, order: 1 },
              { id: "item-a3", content: "Item A3", checked: true, order: 2 },
              { id: "item-a4", content: "Item A4", checked: true, order: 3 },
              { id: "item-a5", content: "Item A5", checked: true, order: 4 },
            ]
          }
        },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });

      await page.route(`**/api/boards/${dragTestBoard.id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board: dragTestBoard }),
        });
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes`, async (route) => {
        if (route.request().method() === "GET") {
          const notes = await prisma.note.findMany({
            where: { boardId: dragTestBoard.id },
            include: { 
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true 
            },
          });
          
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes }),
          });
        }
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes/note-1`, async (route) => {
        if (route.request().method() === "PUT") {
          const postData = await route.request().postDataJSON();

          if (postData.checklistItems) {
            await prisma.checklistItem.deleteMany({
              where: { noteId: "note-1" }
            });

            await prisma.checklistItem.createMany({
              data: postData.checklistItems.map((item: any, index: number) => ({
                id: item.id,
                content: item.content || "",
                checked: item.checked || false,
                order: index,
                noteId: "note-1",
              }))
            });
          }

          const updatedNote = await prisma.note.findUnique({
            where: { id: "note-1" },
            include: {
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true,
            },
          });

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ note: updatedNote }),
          });
        }
      });

      await page.goto(`/boards/${dragTestBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.locator("text=Item A5")).toBeVisible();
      await expect(page.locator("text=Item A3")).toBeVisible();

      await performDragDrop(page, "text=Item A5", "text=Item A3");
      await page.waitForTimeout(200);

      await expectItemOrder(page, {
        "item-a1": 0,
        "item-a2": 1,
        "item-a5": 2,
        "item-a3": 3,
        "item-a4": 4,
      });

      const noteAfter = await prisma.note.findUnique({
        where: { id: note1.id },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });
      expect(noteAfter?.checklistItems.length).toBe(5);
    });

    test("should re-order unchecked items within unchecked group area", async ({ page, testUser, prisma, testOrganization }) => {
      const dragTestBoard = await prisma.board.create({
        data: {
          id: "drag-test-board-5-" + Math.random().toString(36).substring(7),
          name: "Drag Test Board 5",
          description: "A test board for drag and drop",
          organizationId: testOrganization.id,
          createdBy: testUser.id,
        },
      });

      const note1 = await prisma.note.create({
        data: {
          id: "note-1",
          content: "Test Note with Checklist",
          color: "#fef3c7",
          boardId: dragTestBoard.id,
          createdBy: testUser.id,
          checklistItems: {
            create: [
              { id: "item-a1", content: "Item A1", checked: false, order: 0 },
              { id: "item-a2", content: "Item A2", checked: false, order: 1 },
              { id: "item-a3", content: "Item A3", checked: false, order: 2 },
              { id: "item-a4", content: "Item A4", checked: true, order: 3 },
              { id: "item-a5", content: "Item A5", checked: true, order: 4 },
            ]
          }
        },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });

      await page.route(`**/api/boards/${dragTestBoard.id}`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ board: dragTestBoard }),
        });
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes`, async (route) => {
        if (route.request().method() === "GET") {
          const notes = await prisma.note.findMany({
            where: { boardId: dragTestBoard.id },
            include: { 
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true 
            },
          });
          
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ notes }),
          });
        }
      });

      await page.route(`**/api/boards/${dragTestBoard.id}/notes/note-1`, async (route) => {
        if (route.request().method() === "PUT") {
          const postData = await route.request().postDataJSON();

          if (postData.checklistItems) {
            await prisma.checklistItem.deleteMany({
              where: { noteId: "note-1" }
            });

            await prisma.checklistItem.createMany({
              data: postData.checklistItems.map((item: any, index: number) => ({
                id: item.id,
                content: item.content || "",
                checked: item.checked || false,
                order: index,
                noteId: "note-1",
              }))
            });
          }

          const updatedNote = await prisma.note.findUnique({
            where: { id: "note-1" },
            include: {
              checklistItems: { orderBy: { order: 'asc' } },
              user: true,
              board: true,
            },
          });

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ note: updatedNote }),
          });
        }
      });

      await page.goto(`/boards/${dragTestBoard.id}`);
      await page.waitForTimeout(1000);

      await expect(page.locator("text=Item A2")).toBeVisible();
      await expect(page.locator("text=Item A1")).toBeVisible();

      await performDragDrop(page, "text=Item A2", "text=Item A1");
      await page.waitForTimeout(200);

      await expectItemOrder(page, {
        "item-a2": 0,
        "item-a1": 1,
        "item-a3": 2,
        "item-a4": 3,
        "item-a5": 4,
      });

      const noteAfter = await prisma.note.findUnique({
        where: { id: note1.id },
        include: { checklistItems: { orderBy: { order: 'asc' } } },
      });
      expect(noteAfter?.checklistItems.length).toBe(5);
    });
  });

  test.describe("Empty Note Prevention", () => {
    test("should not create empty item when pressing Enter at start of item", async ({ page, testUser }) => {
      await page.goto(`/boards/${testBoard.id}`);

      // Create a new note with initial checklist item
      await page.click('button:has-text("Add Your First Note")');
      await page.waitForTimeout(500);

      // Add first item with content
      const initialInput = page.locator("input.bg-transparent").first();
      await initialInput.fill("First item content");
      await initialInput.press("Enter");
      await page.waitForTimeout(500);

      // Wait for the item to be visible
      await expect(page.getByText("First item content")).toBeVisible();

      // Click at the beginning of the existing item
      await page.getByText("First item content").click();

      // Get the input field for the existing item
      const itemInput = page.locator('input[value="First item content"]');
      await expect(itemInput).toBeVisible();

      // Position cursor at the start (position 0)
      await itemInput.focus();
      await page.keyboard.press("Home"); // Move cursor to start

      // Press Enter - should NOT create a new empty item
      await itemInput.press("Enter");
      await page.waitForTimeout(500);

      // Verify only one item exists and it still has the original content
      const checklistItems = page.getByRole("checkbox");
      await expect(checklistItems).toHaveCount(1);
      await expect(page.getByText("First item content")).toBeVisible();
    });

    test("should not create empty item when pressing Enter at end of item", async ({ page, testUser }) => {
      await page.goto(`/boards/${testBoard.id}`);

      // Create a new note with initial checklist item
      await page.click('button:has-text("Add Your First Note")');
      await page.waitForTimeout(500);

      // Add first item with content
      const initialInput = page.locator("input.bg-transparent").first();
      await initialInput.fill("Last item content");
      await initialInput.press("Enter");
      await page.waitForTimeout(500);

      // Wait for the item to be visible
      await expect(page.getByText("Last item content")).toBeVisible();

      // Click on the existing item to edit it
      await page.getByText("Last item content").click();

      // Get the input field for the existing item
      const itemInput = page.locator('input[value="Last item content"]');
      await expect(itemInput).toBeVisible();

      // Position cursor at the end
      await itemInput.focus();
      await page.keyboard.press("End"); // Move cursor to end

      // Press Enter - should NOT create a new empty item when cursor is at end
      await itemInput.press("Enter");
      await page.waitForTimeout(500);

      // Verify only one item exists and it still has the original content
      const checklistItems = page.getByRole("checkbox");
      await expect(checklistItems).toHaveCount(1);
      await expect(page.getByText("Last item content")).toBeVisible();
    });
  });
});
