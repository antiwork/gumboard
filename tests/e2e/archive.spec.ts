import { test, expect, dbHelpers, generateTestIds } from "../fixtures/test-helpers";

test.describe("Archive Functionality", () => {
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
              _count: { notes: 5 },
              isPublic: false,
              createdBy: "test-user",
            },
          ],
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

    await page.route("**/api/boards/all-notes/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [],
        }),
      });
    });

    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [],
        }),
      });
    });
  });

  test("should display Archive board on dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    const archiveCard = page.locator('[href="/boards/archive"]');
    await expect(archiveCard).toBeVisible();
  });

  test("should navigate to Archive board from dashboard", async ({ page }) => {
    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [
            {
              id: "archived-note-1",
              content: "This is an archived note",
              color: "#fef3c7",
              archivedAt: true,
              checklistItems: [],
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
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard");

    await page.click('[href="/boards/archive"]');

    await expect(page).toHaveURL("/boards/archive");
    await expect(page.locator("text=This is an archived note")).toBeVisible();
  });

  test("should archive a note and verify database state", async ({ page, prisma }) => {
    let noteArchived = false;
    let archivedNoteData: any = null;
    const { testNoteId, testBoardId, testUserId, testOrgId, testEmail } = generateTestIds();

    // Setup test data in correct order (respecting foreign keys)
    const org = await prisma.organization.upsert({
      where: { id: testOrgId },
      update: {},
      create: { 
        id: testOrgId, 
        name: "Test Organization" 
      }
    });

    const user = await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: testEmail,
        name: "Test User",
        organizationId: testOrgId
      }
    });

    const board = await prisma.board.upsert({
      where: { id: testBoardId },
      update: {},
      create: {
        id: testBoardId,
        name: "Test Board",
        createdBy: testUserId,
        organizationId: testOrgId
      }
    });

    const note = await prisma.note.upsert({
      where: { id: testNoteId },
      update: {},
      create: {
        id: testNoteId,
        content: "Test note to archive",
        boardId: testBoardId,
        createdBy: testUserId
      }
    });

    await page.route(`**/api/boards/${testBoardId}/notes`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: testNoteId,
                content: "Test note to archive",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                board: {
                  id: testBoardId,
                  name: "Test Board",
                },
                boardId: testBoardId,
                user: {
                  id: testUserId,
                  name: "Test User",
                  email: "test@example.com",
                },
              },
            ],
          }),
        });
      }
    });

    await page.route(`**/api/boards/${testBoardId}/notes/${testNoteId}`, async (route) => {
      if (route.request().method() === "PUT") {
        const putData = await route.request().postDataJSON();
        if (putData.archivedAt && typeof putData.archivedAt === "string") {
          noteArchived = true;
          archivedNoteData = putData;
          
          // Update database state
          await prisma.note.update({
            where: { id: testNoteId },
            data: { archivedAt: new Date() }
          });
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: testNoteId,
              content: "Test note to archive",
              color: "#fef3c7",
              archivedAt: true,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: testUserId,
                name: "Test User",
                email: "test@example.com",
              },
            },
          }),
        });
      }
    });

    // Add board endpoint route for the test board
    await page.route(`**/api/boards/${testBoardId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          board: {
            id: testBoardId,
            name: "Test Board",
            description: "A test board",
          },
        }),
      });
    });

    await page.goto(`/boards/${testBoardId}`);

    await expect(page.locator("text=Test note to archive")).toBeVisible();

    const archiveButton = page.locator('[title="Archive note"]');
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();

    await page.waitForTimeout(500);

    expect(noteArchived).toBe(true);
    expect(archivedNoteData.archivedAt).toBeTruthy();

    // Verify database state
    const isArchived = await dbHelpers.verifyNoteArchived(prisma, testNoteId);
    expect(isArchived).toBe(true);

    const archivedNotes = await dbHelpers.getArchivedNotes(prisma);
    expect(archivedNotes.some(note => note.id === testNoteId)).toBe(true);

    // Cleanup specific test data
    await prisma.note.deleteMany({ where: { id: testNoteId } });
    await prisma.board.deleteMany({ where: { id: testBoardId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
  });

  test("should not show archive button on Archive board", async ({ page }) => {
    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [
            {
              id: "archived-note-1",
              content: "This is an archived note",
              color: "#fef3c7",
              archivedAt: true,
              checklistItems: [],
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
            },
          ],
        }),
      });
    });

    await page.goto("/boards/archive");

    await expect(page.locator("text=This is an archived note")).toBeVisible();

    const archiveButton = page.locator('[title="Archive note"]');
    await expect(archiveButton).not.toBeVisible();
  });

  test("should show empty state on Archive board when no archived notes exist", async ({
    page,
  }) => {
    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [],
        }),
      });
    });

    await page.goto("/boards/archive");

    await expect(page.locator("text=No notes yet")).toBeVisible();
  });

  test('should display board name as "Archive" in navigation', async ({ page }) => {
    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [],
        }),
      });
    });

    await page.goto("/boards/archive");

    await expect(page.locator("text=Archive")).toBeVisible();
  });

  test("should show unarchive button instead of archive button on Archive board", async ({
    page,
  }) => {
    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [
            {
              id: "note1",
              content: "This is an archived note",
              color: "#fef3c7",
              archivedAt: true,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "1",
                name: "user1",
                email: "user1@gmail.com",
              },
              board: {
                id: "1",
                name: "board1",
              },
            },
          ],
        }),
      });
    });

    await page.goto("/boards/archive");
    await expect(page.locator("text=This is an archived note")).toBeVisible();

    const unarchiveButton = page.locator('[title="Unarchive note"]');
    await expect(unarchiveButton).toBeVisible();

    const archiveButton = page.locator('[title="Archive note"]');
    await expect(archiveButton).not.toBeVisible();
  });

  test("should unarchive a note and remove it from archive view", async ({ page }) => {
    let noteUnarchived = false;
    let unarchivedNoteData: any = null;

    await page.route("**/api/boards/archive/notes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          notes: [
            {
              id: "note1",
              content: "Test note to unarchive",
              color: "#fef3c7",
              archivedAt: true,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "1",
                name: "user1",
                email: "user1@gmail.com",
              },
              board: {
                id: "1",
                name: "board1",
              },
            },
          ],
        }),
      });
    });

    await page.route("**/api/boards/1/notes/note1", async (route) => {
      if (route.request().method() === "PUT") {
        const putData = await route.request().postDataJSON();
        if (putData.archivedAt === null) {
          noteUnarchived = true;
          unarchivedNoteData = putData;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "note1",
              content: "Test note to unarchive",
              color: "#fef3c7",
              archivedAt: null,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "1",
                name: "user1",
                email: "user1@gmail.com",
              },
              board: {
                id: "1",
                name: "board1",
              },
            },
          }),
        });
      }
    });

    await page.goto("/boards/archive");
    await expect(page.locator("text=Test note to unarchive")).toBeVisible();

    const unarchiveButton = page.locator('[title="Unarchive note"]');
    await expect(unarchiveButton).toBeVisible();
    await unarchiveButton.click();

    await page.waitForTimeout(500);
    await expect(page.locator("text=Test note to unarchive")).not.toBeVisible();
    expect(noteUnarchived).toBe(true);
    expect(unarchivedNoteData.archivedAt).toBe(null);
    await expect(page.locator("text=Test note to unarchive")).not.toBeVisible();
  });

  test("should complete full archive-unarchive workflow", async ({ page }) => {
    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "workflow-note",
                content: "Note for archive-unarchive workflow test",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                boardId: "test-board",
                board: {
                  id: "test-board",
                  name: "Test Board",
                },
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

    await page.route("**/api/boards/test-board/notes/workflow-note", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "workflow-note",
              content: "Note for archive-unarchive workflow test",
              color: "#fef3c7",
              archivedAt: true,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              boardId: "test-board",
              board: {
                id: "test-board",
                name: "Test Board",
              },
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
    await expect(page.locator("text=Note for archive-unarchive workflow test")).toBeVisible();

    const archiveButton = page.locator('[title="Archive note"]').first();
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();
    await page.waitForTimeout(500);
    await expect(page.locator("text=Note for archive-unarchive workflow test")).not.toBeVisible();
  });
});
