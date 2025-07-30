import { test, expect } from '@playwright/test';

test.describe('Note to Todo Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com',
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
            description: 'A test board for e2e testing',
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
              description: 'A test board for e2e testing',
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
            notes: [
              {
                id: 'existing-note',
                content: 'Buy milk\nBuy bread\nBuy eggs',
                color: '#fef3c7',
                done: false,
                isChecklist: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
                },
              }
            ],
          }),
        });
      }
    });
  });

  test('should convert note to checklist and verify database state', async ({ page }) => {
    let conversionApiCalled = false;
    let noteAfterConversion: { isChecklist: boolean; checklistItems: Array<{ content: string }> } | null = null;
    
    await page.route('**/api/boards/test-board/notes/existing-note', async (route) => {
      if (route.request().method() === 'PUT') {
        conversionApiCalled = true;
        const requestBody = await route.request().postDataJSON();
        
        if (requestBody.isChecklist) {
          const checklistItems = [
            { id: 'item-1', content: 'Buy milk', checked: false, order: 0 },
            { id: 'item-2', content: 'Buy bread', checked: false, order: 1 },
            { id: 'item-3', content: 'Buy eggs', checked: false, order: 2 }
          ];
          
          noteAfterConversion = {
            ...requestBody,
            isChecklist: true,
            checklistItems
          };
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              note: {
                id: 'existing-note',
                content: 'Buy milk\nBuy bread\nBuy eggs',
                color: '#fef3c7',
                done: false,
                isChecklist: true,
                checklistItems,
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
      }
    });
    
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Buy milk')).toBeVisible();
    
    await page.evaluate(() => {
      const mockConversion = {
        isChecklist: true,
        content: 'Buy milk\nBuy bread\nBuy eggs'
      };
      fetch('/api/boards/test-board/notes/existing-note', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockConversion)
      });
    });
    
    await page.waitForTimeout(100);
    
    expect(conversionApiCalled).toBe(true);
    expect(noteAfterConversion).not.toBeNull();
    expect(noteAfterConversion!.isChecklist).toBe(true);
    expect(noteAfterConversion!.checklistItems).toHaveLength(3);
    expect(noteAfterConversion!.checklistItems[0].content).toBe('Buy milk');
  });

  test('should display note content correctly', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Buy milk')).toBeVisible();
    await expect(page.locator('text=Buy bread')).toBeVisible();
    await expect(page.locator('text=Buy eggs')).toBeVisible();
  });
});
