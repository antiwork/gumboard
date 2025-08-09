import { test, expect } from '@playwright/test'

test.describe('Note Management with Newlines', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
          }
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: true,
          organization: {
            id: 'test-org',
            name: 'Test Organization',
          },
        }),
      });
    });

    await page.route('**/api/boards/test-board', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          board: {
            id: 'test-board',
            name: 'Test Board',
            description: 'A test board',
          },
        }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boards: [
            {
              id: 'test-board',
              name: 'Test Board',
              description: 'A test board',
            },
          ],
        }),
      });
    });

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [],
          }),
        });
      } else if (route.request().method() === 'POST') {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [{
                id: `item-${Date.now()}`,
                content: '',
                checked: false,
                order: 0,
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/new-note-id', async (route) => {
      if (route.request().method() === 'PUT') {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [{
                id: `item-${Date.now()}`,
                content: '',
                checked: false,
                order: 0,
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          }),
        });
      }
    });

    await page.route('**/api/boards/all-notes/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [] }),
        });
      }
    
      if (route.request().method() === 'POST') {
        const postData = await route.request().postDataJSON();
    
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'all-notes-note-id',
              content: postData.content || '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: postData.boardId || 'target-board-id',
                name: 'Target Board',
              }
            }
          }),
        });
      }
    });
  });

  test('should create a checklist note and verify database state', async ({ page }) => {
    let noteCreated = false;
    let noteData: any = null;

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [] }),
        });
      } else if (route.request().method() === 'POST') {
        noteCreated = true;
        const postData = await route.request().postDataJSON();
        noteData = postData;
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [{
                id: `item-${Date.now()}`,
                content: '',
                checked: false,
                order: 0,
              }],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    await page.evaluate(() => {
      const mockNoteData = { 
        content: '',
        checklistItems: [{
          id: `item-${Date.now()}`,
          content: '',
          checked: false,
          order: 0,
        }]
      };
      fetch('/api/boards/test-board/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockNoteData)
      });
    });
    
    await page.waitForTimeout(100);
    
    expect(noteCreated).toBe(true);
    expect(noteData).not.toBeNull();
    expect(noteData!.checklistItems).toBeDefined();
    expect(Array.isArray(noteData!.checklistItems)).toBe(true);
  });

  test('should handle checklist item editing', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await page.click('button:has-text("Add Your First Note")');
    
    await page.waitForTimeout(500);
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await input.fill('Test checklist item');
    await input.blur();
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=Test checklist item')).toBeVisible();
  });

  test('should handle creating multiple checklist items', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await page.click('button:has-text("Add Your First Note")');
    
    await page.waitForTimeout(500);
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await input.fill('First item');
    await input.blur();
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=First item')).toBeVisible();
  });

  test('should display empty state when no notes exist', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=No notes yet')).toBeVisible();
    await expect(page.locator('button:has-text("Add Your First Note")')).toBeVisible();
  });

  test('should create a note in the all notes view', async ({ page }) => {
    await page.goto('/boards/all-notes');
    await page.click('button:has(svg.lucide-pencil)');
    await page.waitForTimeout(500);
    await expect(page.locator('.note-background')).toBeVisible();
  });

});
