import { test, expect } from "@playwright/test"

test.describe("Keyboard Shortcuts", () => {
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
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      })
    })

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
      })
    })
  })

  test.describe("Dashboard Shortcuts", () => {
    test.beforeEach(async ({ page }) => {
      // Mock boards API
      await page.route("**/api/boards", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            boards: [
              {
                id: "board-1",
                name: "Test Board",
                description: "Test Description",
                createdBy: "test-user",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        })
      })

      await page.goto("/dashboard")
      // Wait for page to be ready
      await page.waitForLoadState('networkidle')
    })

    test('pressing "n" opens new board modal', async ({ page }) => {
      // Press 'n' key
      await page.keyboard.press("n")

      // Check if modal is visible
      await expect(page.getByText("Create New Board")).toBeVisible()

      // Check if input is focused
      const boardNameInput = page.getByPlaceholder("Enter board name")
      await expect(boardNameInput).toBeFocused()
    })

    test("pressing Escape closes new board modal", async ({ page }) => {
      // Open modal first
      await page.keyboard.press("n")
      await expect(page.getByText("Create New Board")).toBeVisible()

      // Press Escape
      await page.keyboard.press("Escape")

      // Modal should be hidden
      await expect(page.getByText("Create New Board")).not.toBeVisible()
    })

    test("pressing Shift+? shows keyboard shortcuts modal", async ({
      page,
    }) => {
      // Press Shift+?
      await page.keyboard.press("Shift+?")

      // Check if shortcuts modal is visible
      await expect(page.getByRole('heading', { name: 'Keyboard Shortcuts' })).toBeVisible()

      // Check if shortcuts are displayed
      await expect(page.getByText("Create new board")).toBeVisible()
      await expect(page.getByText("Cancel/Close")).toBeVisible()
      await expect(page.getByText("Show keyboard shortcuts")).toBeVisible()
    })
  })

  test.describe("Board Page Shortcuts", () => {
    test.beforeEach(async ({ page }) => {
      // Mock board API
      await page.route("**/api/boards/board-1", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            board: {
              id: "board-1",
              name: "Test Board",
              description: "Test Description",
            },
          }),
        })
      })

      // Mock boards list
      await page.route("**/api/boards", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            boards: [
              {
                id: "board-1",
                name: "Test Board",
                description: "Test Description",
              },
            ],
          }),
        })
      })

      // Mock notes API
      await page.route("**/api/boards/board-1/notes", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: [
              {
                id: "note-1",
                content: "Test Note",
                color: "#fef3c7",
                done: false,
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
        })
      })

      await page.goto("/boards/board-1")
      // Wait for page to be ready
      await page.waitForLoadState('networkidle')
    })

    test('pressing "n" opens new note modal', async ({ page }) => {
      // Press 'n' key
      await page.keyboard.press("n")

      // Check if modal is visible
      await expect(page.getByText("Add New Note")).toBeVisible()
    })

    test("pressing Cmd/Ctrl+K focuses search", async ({ page }) => {
      const isMac = process.platform === "darwin"
      const searchInput = page.getByPlaceholder("Search notes...").first()

      // Wait a bit for keyboard shortcuts to be registered
      await page.waitForTimeout(500)

      // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if (isMac) {
        await page.keyboard.press("Meta+k")
      } else {
        await page.keyboard.press("Control+k")
      }

      // Check if search input is focused
      await expect(searchInput).toBeFocused()
    })

    test("pressing Escape while editing note cancels edit", async ({
      page,
    }) => {
      // Click on a note to edit - look for note content paragraph
      await page.locator('p').filter({ hasText: "Test Note" }).click()

      // Check if edit mode is active
      await expect(page.locator("textarea")).toBeVisible()

      // Press Escape
      await page.keyboard.press("Escape")

      // Edit mode should be cancelled
      await expect(page.locator("textarea")).not.toBeVisible()
    })

    test("shortcuts do not trigger while typing in input", async ({ page }) => {
      // Open new note modal
      await page.keyboard.press("n")
      const textarea = page.getByPlaceholder("Enter your note...")
      await textarea.fill("")

      // Type 'n' in the textarea
      await textarea.type("n")

      // Should not open another modal
      const modals = await page.getByText("Add New Note").count()
      expect(modals).toBe(1)
    })

    test("Escape works even when typing in input", async ({ page }) => {
      // Open new note modal
      await page.keyboard.press("n")
      await expect(page.getByText("Add New Note")).toBeVisible()

      // Focus on textarea
      const textarea = page.getByPlaceholder("Enter your note...")
      await textarea.focus()

      // Press Escape
      await page.keyboard.press("Escape")

      // Modal should close
      await expect(page.getByText("Add New Note")).not.toBeVisible()
    })
  })

  test.describe("Platform-specific display", () => {
    test("shows Mac symbols on macOS", async ({ page, browserName }) => {
      // This test requires user agent manipulation to simulate Mac
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "platform", {
          get: () => "MacIntel",
          configurable: true,
        })
      })

      await page.route("**/api/boards", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards: [] }),
        })
      })

      await page.goto("/dashboard")

      // Open shortcuts modal
      await page.keyboard.press("Shift+?")

      // Check for Mac symbols
      const shortcutElement = page.locator("kbd").filter({ hasText: /⌘|⇧|⌥/ })
      await expect(shortcutElement.first()).toBeVisible() // Should have at least one Mac symbol
    })

    test("shows Windows/Linux keys on non-Mac", async ({ page }) => {
      // This test requires user agent manipulation to simulate Windows
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "platform", {
          get: () => "Win32",
          configurable: true,
        })
      })

      await page.route("**/api/boards", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards: [] }),
        })
      })

      await page.goto("/dashboard")

      // Open shortcuts modal
      await page.keyboard.press("Shift+?")

      // Check for Windows/Linux keys
      const shortcutElement = page
        .locator("kbd")
        .filter({ hasText: /Ctrl|Shift|Alt/ })
      await expect(shortcutElement.first()).toBeVisible() // Should have at least one non-Mac key
    })
  })
})