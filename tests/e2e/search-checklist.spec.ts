import { test, expect } from "@playwright/test";

test.describe("Search Notes Checklist Items", () => {
  test.beforeEach(async ({ page }) => {
    // Mock session and user
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "test-user", email: "test@example.com", name: "Test User" },
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
          organization: { id: "test-org", name: "Test Organization" },
        }),
      });
    });

    // Mock board data
    await page.route("**/api/boards/test-board", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          board: { id: "test-board", name: "Test Board", description: "A test board" },
        }),
      });
    });

    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          boards: [
            { id: "test-board", name: "Test Board", description: "A test board" },
          ],
        }),
      });
    });

    await page.goto("/boards/test-board");
  });

  test("should search checklist items - basic functionality", async ({ page }) => {
    const dummyNotes = [
      {
        id: "note-1",
        title: "Shopping List",
        content: "My shopping items",
        checklistItems: [
          { id: "item-1", content: "Buy milk", checked: false, order: 0 },
          { id: "item-2", content: "Call mom", checked: false, order: 1 },
        ],
      },
      {
        id: "note-2", 
        title: "Work Tasks",
        content: "Development work",
        checklistItems: [
          { id: "item-3", content: "Write Playwright tests", checked: false, order: 0 },
          { id: "item-4", content: "Review pull requests", checked: true, order: 1 },
        ],
      },
      {
        id: "note-3",
        title: "Personal",
        content: "Personal tasks",
        checklistItems: [
          { id: "item-5", content: "Plan vacation to Hawaii", checked: false, order: 0 },
        ],
      },
      {
        id: "note-4",
        title: "Empty Note", 
        content: "This note has no checklist items",
        checklistItems: [],
      },
    ];

    // Mock notes API
    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            notes: dummyNotes.map((note, index) => ({
              ...note,
              color: "#fef3c7",
              archivedAt: null,
              x: 100 + index * 50,
              y: 100,
              width: 200,
              height: 150,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User",
                email: "test@example.com",
              },
            })),
          }),
        });
      }
    });

    await page.reload();

    const searchInput = page.getByPlaceholder("Search notes...");
    
    // Helper: Wait for debounce and search results
    const waitForSearch = async () => {
      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    };

    // Helper function to check visibility
    const verifyNoteVisibility = async (visibleTexts: string[], hiddenTexts: string[]) => {
      for (const text of visibleTexts) {
        await expect(page.locator(`text=${text}`)).toBeVisible();
      }
      
      for (const text of hiddenTexts) {
        const element = page.locator(`text=${text}`);
        const count = await element.count();
        
        if (count > 0) {
          await expect(element).toBeHidden();
        }
      }
    };

    // Test case 1: Exact word match
    await searchInput.fill("milk");
    await waitForSearch();
    await verifyNoteVisibility(["Buy milk"], ["Write Playwright tests", "Plan vacation"]);
    
    // Test case 2: Case insensitive search
    await searchInput.fill("MILK");
    await waitForSearch();
    await expect(page.locator('text=Buy milk')).toBeVisible();

    await searchInput.fill("MiLk");
    await waitForSearch();
    await expect(page.locator('text=Buy milk')).toBeVisible();
    
    // Test case 3: Partial word match
    await searchInput.fill("play");
    await waitForSearch();
    await expect(page.locator('text=Write Playwright tests')).toBeVisible();
    
    // Test case 4: Multiple word search
    await searchInput.fill("pull requests");
    await waitForSearch();
    await expect(page.locator('text=Review pull requests')).toBeVisible();
    
    // Test case 5: Single character search
    await searchInput.fill("m");
    await waitForSearch();
    await expect(page.locator('text=Buy milk')).toBeVisible();
    await expect(page.locator('text=Call mom')).toBeVisible();
    
    // Test case 6: Search in both checked and unchecked items
    await searchInput.fill("requests"); // This is a checked item
    await waitForSearch();
    await expect(page.locator('text=Review pull requests')).toBeVisible();
    
    // Test case 7: Search term not found
    await searchInput.fill("nonexistentterm");
    await waitForSearch();
    
    const searchTermNotFoundChecks = [
      page.locator('text=Buy milk'),
      page.locator('text=Write Playwright tests'),
      page.locator('text=Plan vacation')
    ];
    
    let allHidden = true;
    for (const check of searchTermNotFoundChecks) {
      const count = await check.count();
      if (count > 0) {
        const isVisible = await check.isVisible();
        if (isVisible) {
          allHidden = false;
          break;
        }
      }
    }
    expect(allHidden).toBe(true);

    // Test case 8: Clear search - all notes visible
    await searchInput.fill("");
    await waitForSearch();
    await expect(page.locator('text=Buy milk')).toBeVisible();
    await expect(page.locator('text=Write Playwright tests')).toBeVisible();
    await expect(page.locator('text=Plan vacation')).toBeVisible();
  });

  test("should handle edge cases and special characters", async ({ page }) => {
    const edgeCaseNotes = [
      {
        id: "note-special",
        title: "Special Characters",
        content: "",
        checklistItems: [
          { id: "item-special-1", content: "Buy @#$% special items!", checked: false, order: 0 },
          { id: "item-special-2", content: "Call +1-555-123-4567", checked: false, order: 1 },
          { id: "item-special-3", content: "Email: user@domain.com", checked: false, order: 2 },
          { id: "item-special-4", content: "Price: $99.99", checked: false, order: 3 },
          { id: "item-special-5", content: "100% completion rate", checked: false, order: 4 },
        ],
      },
      {
        id: "note-numbers",
        title: "Numbers and Time",
        content: "", 
        checklistItems: [
          { id: "item-numbers-1", content: "Meeting at 3:30 PM", checked: false, order: 0 },
          { id: "item-numbers-2", content: "Call at 09:00 AM", checked: false, order: 1 },
          { id: "item-numbers-3", content: "Date: 2024-12-31", checked: false, order: 2 },
          { id: "item-numbers-4", content: "Order #12345", checked: false, order: 3 },
        ],
      },
      {
        id: "note-whitespace",
        title: "Whitespace Tests",
        content: "",
        checklistItems: [
          { id: "item-whitespace-1", content: "  leading spaces", checked: false, order: 0 },
          { id: "item-whitespace-2", content: "trailing spaces  ", checked: false, order: 1 },
          { id: "item-whitespace-3", content: "multiple   spaces   between", checked: false, order: 2 },
          { id: "item-whitespace-4", content: "\ttab\tcharacters\t", checked: false, order: 3 },
        ],
      },
    ];

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json", 
          body: JSON.stringify({
            notes: edgeCaseNotes.map((note, index) => ({
              ...note,
              color: "#fef3c7",
              archivedAt: null,
              x: 100 + index * 50,
              y: 100,
              width: 200,
              height: 150,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User", 
                email: "test@example.com",
              },
            })),
          }),
        });
      }
    });

    await page.reload();
    await expect(page.locator('text=Buy @#$% special items!')).toBeVisible({ timeout: 5000 });

    const searchInput = page.getByPlaceholder("Search notes...");
    
    // Test special characters
    await searchInput.fill("@#$%");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Buy @#$% special items!')).toBeVisible();
    
    // Test email search
    await searchInput.fill("@domain.com");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Email: user@domain.com')).toBeVisible();
    
    // Test phone number search
    await searchInput.fill("555-123");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Call +1-555-123-4567')).toBeVisible();
    
    // Test currency symbol
    await searchInput.fill("$99.99");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Price: $99.99')).toBeVisible();
    
    // Test percentage
    await searchInput.fill("100%");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=100% completion rate')).toBeVisible();
    
    // Test time format
    await searchInput.fill("3:30");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Meeting at 3:30 PM')).toBeVisible();
    
    // Test date format
    await searchInput.fill("2024-12-31");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Date: 2024-12-31')).toBeVisible();
    
    // Test order number with hash
    await searchInput.fill("#12345");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Order #12345')).toBeVisible();
    
    // Test whitespace handling
    await searchInput.fill("leading");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=leading spaces')).toBeVisible();
    
    await searchInput.fill("trailing");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=trailing spaces')).toBeVisible();
    
    await searchInput.fill("multiple spaces");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=multiple   spaces   between')).toBeVisible();
  });

  test("should handle search with very long and very short queries", async ({ page }) => {
    const lengthTestNotes = [
      {
        id: "note-long",
        title: "Long Content",
        content: "",
        checklistItems: [
          { 
            id: "item-long-1", 
            content: "This is a very long checklist item that contains multiple words and should test how the search handles longer text strings with various combinations", 
            checked: false, 
            order: 0 
          },
          { id: "item-long-2", content: "a", checked: false, order: 1 },
          { id: "item-long-3", content: "supercalifragilisticexpialidocious", checked: false, order: 2 },
        ],
      },
    ];

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json", 
          body: JSON.stringify({
            notes: lengthTestNotes.map((note, index) => ({
              ...note,
              color: "#fef3c7",
              archivedAt: null,
              x: 100 + index * 50,
              y: 100,
              width: 200,
              height: 150,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User", 
                email: "test@example.com",
              },
            })),
          }),
        });
      }
    });

    await page.reload();
    await expect(page.locator('text=This is a very long checklist')).toBeVisible({ timeout: 5000 });

    const searchInput = page.getByPlaceholder("Search notes...");
    
    // Test single character
    await searchInput.fill("a");
    await page.waitForTimeout(1000);
    await expect(page.locator('text="a"')).toBeVisible();
    
    // Test very long search term
    await searchInput.fill("very long checklist item that contains multiple words");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=This is a very long checklist')).toBeVisible();
    
    // Test very long single word
    await searchInput.fill("supercalifragilisticexpialidocious");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=supercalifragilisticexpialidocious')).toBeVisible();
    
    // Test partial match of long word
    await searchInput.fill("supercali");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=supercalifragilisticexpialidocious')).toBeVisible();
  });

  test("should handle rapid consecutive searches (debouncing)", async ({ page }) => {
    const rapidSearchNotes = [
      {
        id: "note-rapid",
        title: "Rapid Search Test",
        content: "",
        checklistItems: [
          { id: "item-rapid-1", content: "apple pie", checked: false, order: 0 },
          { id: "item-rapid-2", content: "banana split", checked: false, order: 1 },
          { id: "item-rapid-3", content: "cherry tart", checked: false, order: 2 },
        ],
      },
    ];

    await page.route("**/api/boards/test-board/notes", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json", 
          body: JSON.stringify({
            notes: rapidSearchNotes.map((note, index) => ({
              ...note,
              color: "#fef3c7",
              archivedAt: null,
              x: 100 + index * 50,
              y: 100,
              width: 200,
              height: 150,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: "test-user",
                name: "Test User", 
                email: "test@example.com",
              },
            })),
          }),
        });
      }
    });

    await page.reload();
    await expect(page.locator('text=apple pie')).toBeVisible({ timeout: 5000 });

    const searchInput = page.getByPlaceholder("Search notes...");
    
    // Rapid fire searches to test debouncing
    await searchInput.fill("a");
    await searchInput.fill("ap");  
    await searchInput.fill("app");
    await searchInput.fill("appl");
    await searchInput.fill("apple");
    
    // Wait for debounce to settle
    await page.waitForTimeout(1200);
    await page.waitForLoadState('networkidle');
    
    // Final result should show apple
    await expect(page.locator('text=apple pie')).toBeVisible();
    
    // Quick change to different search
    await searchInput.fill("banana");
    await page.waitForTimeout(1000);
    await expect(page.locator('text=banana split')).toBeVisible();
  });

  
});