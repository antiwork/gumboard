import { test, expect } from "@playwright/test";

test.describe("Note Height Adjustment", () => {
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

    // Mock user data
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

    // Mock boards API (needed for the dropdown)
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

    // Mock notes API - return a note with large checklist items directly
    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "test-note-1",
                content: "Test note content",
                color: "#fef3c7",
                archivedAt: null,
                checklistItems: [
                  {
                    id: "item-1",
                    content:
                      "This is a very long checklist item that should make the note height increase significantly. It contains multiple sentences and should wrap to multiple lines to properly test the height adjustment functionality.",
                    checked: false,
                    order: 0,
                  },
                  {
                    id: "item-2",
                    content:
                      "Another long checklist item with substantial content to ensure the note height adjusts properly. This item also contains multiple sentences and should contribute to the overall note height calculation.",
                    checked: false,
                    order: 1,
                  },
                  {
                    id: "item-3",
                    content:
                      "A third checklist item with even more content to thoroughly test the height adjustment. This item has multiple lines and should demonstrate the note's ability to accommodate varying content lengths.",
                    checked: true,
                    order: 2,
                  },
                  {
                    id: "item-4",
                    content: "Short item for testing",
                    checked: false,
                    order: 3,
                  },
                  {
                    id: "item-5",
                    content: "Another short item for contrast testing",
                    checked: false,
                    order: 4,
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
              },
            ],
          }),
        });
      } else if (route.request().method() === "POST") {
        // Handle POST requests if needed
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: {
              id: "new-note-id",
              content: postData.content || "",
              color: postData.color || "#fef3c7",
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
                name: "Test Board",
              },
              boardId: "test-board",
            },
          }),
        });
      }
    });

    // Mock note update API
    await page.route("**/api/boards/test-board/notes/*", async (route) => {
      if (route.request().method() === "PUT") {
        const postData = await route.request().postDataJSON();

        // Handle the delete operation by filtering out the deleted item
        const updatedChecklistItems = postData.checklistItems || [];

        // Ensure we always return a valid note structure
        const updatedNote = {
          id: route.request().url().split("/").pop(),
          content: postData.content || "Test note content",
          color: "#fef3c7",
          archivedAt: null,
          checklistItems: updatedChecklistItems,
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
        };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            note: updatedNote,
          }),
        });
      }
    });

    // Navigate to the test board
    await page.goto("/boards/test-board");

    // Wait for the page to load and verify the board is visible
    await expect(page.locator("text=Test Board")).toBeVisible();

    // Wait a bit more for the page to fully load and render
    await page.waitForTimeout(2000);

    // Wait for the note to be visible
    await expect(page.locator(".note-background")).toBeVisible({ timeout: 10000 });

    // Verify the main checklist items are visible (these are unique)
    await expect(page.locator("text=This is a very long checklist item")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("text=Another long checklist item")).toBeVisible({ timeout: 10000 });
  });

  test("note height accommodates large checklist items", async ({ page }) => {
    // Find the note by looking for the unique long checklist item
    const note = page
      .locator(".note-background")
      .filter({
        hasText:
          "This is a very long checklist item that should make the note height increase significantly",
      })
      .first();

    // Wait for note to be visible and get dimensions
    await expect(note).toBeVisible();
    const noteHeight = await note.boundingBox().then((box) => box?.height || 0);
    expect(noteHeight).toBeGreaterThan(0);

    // Verify all checklist items are visible using unique text
    await expect(note.locator("text=This is a very long checklist item")).toBeVisible();
    await expect(note.locator("text=Another long checklist item")).toBeVisible();
    await expect(note.locator("text=A third checklist item")).toBeVisible();
    await expect(note.locator("text=Short item for testing")).toBeVisible();
    await expect(note.locator("text=Another short item for contrast testing")).toBeVisible();

    // Verify the note height is reasonable for the content
    expect(noteHeight).toBeGreaterThan(200); // Should be tall enough for multiple long items
    expect(noteHeight).toBeLessThan(800); // Shouldn't be excessively tall
  });

  test("note height adjusts when removing checklist items", async ({ page }) => {
    // Find the note by looking for the unique long checklist item (same as first test)
    const note = page
      .locator(".note-background")
      .filter({
        hasText:
          "This is a very long checklist item that should make the note height increase significantly",
      })
      .first();
    await expect(note).toBeVisible();

    // Get initial height with all items
    const heightWithAllItems = await note.boundingBox().then((box) => box?.height || 0);

    // Find the specific item to delete by its test ID (item-1)
    const itemToDelete = note.locator('[data-testid="item-1"]');
    await expect(itemToDelete).toBeVisible();

    // Hover over the item to show delete button
    await itemToDelete.hover();
    const deleteButton = itemToDelete.getByRole("button", { name: "Delete item" });
    await expect(deleteButton).toBeVisible();

    // Click the delete button
    await deleteButton.click();

    // Wait a moment for the operation to complete
    await page.waitForTimeout(1000);

    // Check if the item is still visible (it should be removed)
    const itemStillVisible = await itemToDelete.isVisible();

    // The item should be removed
    expect(itemStillVisible).toBe(false);

    // Since the note reference might be stale after deletion, let's just verify
    // that the delete operation worked by checking that the item is gone
    // and that we can still find notes on the page
    const remainingNotes = page.locator(".note-background");
    await expect(remainingNotes).toHaveCount(1);

    // Verify that the remaining note still has some content
    const remainingNote = remainingNotes.first();
    await expect(remainingNote).toBeVisible();

    // Get the current height and verify it's reasonable
    const currentHeight = await remainingNote.boundingBox().then((box) => box?.height || 0);

    // Height should be reasonable
    expect(currentHeight).toBeGreaterThan(0);
    expect(currentHeight).toBeLessThan(1000);

    // The height should have decreased since we removed an item
    expect(currentHeight).toBeLessThan(heightWithAllItems);
  });

  test("note maintains proper spacing without excessive gaps", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText:
          "This is a very long checklist item that should make the note height increase significantly",
      })
      .first();
    await expect(note).toBeVisible();

    // Get current height
    const currentHeight = await note.boundingBox().then((box) => box?.height || 0);

    // Height should be reasonable for the content
    expect(currentHeight).toBeGreaterThan(150); // Should accommodate multiple long items
    expect(currentHeight).toBeLessThan(800); // Shouldn't be excessively tall

    // Verify no excessive spacing between items
    const noteBox = await note.boundingBox();
    const addTaskButton = note.locator('button:has-text("Add task")');
    const buttonBox = await addTaskButton.boundingBox();

    if (noteBox && buttonBox) {
      // Button should be reasonably close to the content above it
      const spaceAboveButton = buttonBox.y - (noteBox.y + noteBox.height - buttonBox.height);
      expect(spaceAboveButton).toBeLessThan(50); // Shouldn't have excessive space above button
    }
  });

  test("delete buttons stay within note boundaries", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText:
          "This is a very long checklist item that should make the note height increase significantly",
      })
      .first();
    await expect(note).toBeVisible();

    // Hover over a checklist item to show delete button
    await note.locator("text=Another long checklist item").hover();

    // Find delete button using the correct selector
    const deleteButton = note.getByRole("button", { name: "Delete item" }).first();
    await expect(deleteButton).toBeVisible();

    // Get note and delete button positions
    const noteBox = await note.boundingBox();
    const deleteButtonBox = await deleteButton.boundingBox();

    if (noteBox && deleteButtonBox) {
      // Delete button should be within note boundaries
      expect(deleteButtonBox.x).toBeGreaterThanOrEqual(noteBox.x);
      expect(deleteButtonBox.x + deleteButtonBox.width).toBeLessThanOrEqual(
        noteBox.x + noteBox.width
      );
      expect(deleteButtonBox.y).toBeGreaterThanOrEqual(noteBox.y);
      expect(deleteButtonBox.y + deleteButtonBox.height).toBeLessThanOrEqual(
        noteBox.y + noteBox.height
      );
    }
  });

  test("note height adjusts when adding new checklist items", async ({ page }) => {
    const note = page
      .locator(".note-background")
      .filter({
        hasText:
          "This is a very long checklist item that should make the note height increase significantly",
      })
      .first();
    await expect(note).toBeVisible();

    // Get initial height
    const initialHeight = await note.boundingBox().then((box) => box?.height || 0);

    // Find and click the "Add task" button
    const addTaskButton = note.locator('button:has-text("Add task")');
    await expect(addTaskButton).toBeVisible();
    await addTaskButton.click();

    // Wait for the input textarea to appear
    const inputTextarea = note.locator('textarea[placeholder="Add new item..."]');
    await expect(inputTextarea).toBeVisible();

    // Type long content and save
    const newItemContent =
      "This is a newly added checklist item with substantial content to test height adjustment when adding items to an already populated note.";
    await inputTextarea.fill(newItemContent);
    await inputTextarea.press("Enter");

    // Wait for the item to be added and verify it's visible
    await expect(note.locator("text=This is a newly added checklist item")).toBeVisible();

    // Get new height and verify it increased
    const newHeight = await note.boundingBox().then((box) => box?.height || 0);
    expect(newHeight).toBeGreaterThan(initialHeight);

    // Verify all original items are still visible
    await expect(note.locator("text=This is a very long checklist item")).toBeVisible();
    await expect(note.locator("text=Another long checklist item")).toBeVisible();
    await expect(note.locator("text=A third checklist item")).toBeVisible();
    await expect(note.locator("text=Short item for testing")).toBeVisible();
    await expect(note.locator("text=Another short item for contrast testing")).toBeVisible();
  });
});
