import { test, expect } from '@playwright/test';

test.describe('Board Name Link Functionality', () => {
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

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boards: [
            {
              id: 'test-board-1',
              name: 'Test Board 1',
              description: 'First test board',
              _count: { notes: 2 },
            },
            {
              id: 'test-board-2',
              name: 'Test Board 2',
              description: 'Second test board',
              _count: { notes: 3 },
            },
          ],
        }),
      });
    });

    await page.route('**/api/boards/test-board-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          board: {
            id: 'test-board-1',
            name: 'Test Board 1',
            description: 'First test board',
          },
        }),
      });
    });

    await page.route('**/api/boards/test-board-2', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          board: {
            id: 'test-board-2',
            name: 'Test Board 2',
            description: 'Second test board',
          },
        }),
      });
    });

    await page.route('**/api/boards/all-notes/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [
            {
              id: 'note-1',
              content: 'Note from Board 1',
              color: '#fef3c7',
              done: false,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: 'test-board-1',
                name: 'Test Board 1',
              },
            },
            {
              id: 'note-2',
              content: 'Note from Board 2',
              color: '#dcfce7',
              done: false,
              checklistItems: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: 'test-board-2',
                name: 'Test Board 2',
              },
            },
          ],
        }),
      });
    });
  });

  test('should display board names as clickable links in All notes view', async ({ page }) => {
    await page.goto('/boards/all-notes');
    
    await expect(page.locator('text=Note from Board 1')).toBeVisible();
    await expect(page.locator('text=Note from Board 2')).toBeVisible();
    
    await expect(page.locator('text=Test Board 1')).toBeVisible();
    await expect(page.locator('text=Test Board 2')).toBeVisible();
    
    const boardLink1 = page.locator('a', { hasText: 'Test Board 1' });
    const boardLink2 = page.locator('a', { hasText: 'Test Board 2' });
    
    await expect(boardLink1).toBeVisible();
    await expect(boardLink2).toBeVisible();
    
    await expect(boardLink1).toHaveAttribute('href', '/boards/test-board-1');
    await expect(boardLink2).toHaveAttribute('href', '/boards/test-board-2');
  });

  test('should navigate to correct board when clicking board name link', async ({ page }) => {
    await page.goto('/boards/all-notes');
    
    await page.locator('a', { hasText: 'Test Board 1' }).click();
    
    await expect(page).toHaveURL('/boards/test-board-1');
    
    await page.goto('/boards/all-notes');
    
    await page.locator('a', { hasText: 'Test Board 2' }).click();
    
    await expect(page).toHaveURL('/boards/test-board-2');
  });

  test('should maintain styling for board name links', async ({ page }) => {
    await page.goto('/boards/all-notes');
    
    const boardLink = page.locator('a', { hasText: 'Test Board 1' }).first();
    
    await expect(boardLink).toHaveClass(/text-xs/);
    await expect(boardLink).toHaveClass(/text-blue-600/);
    await expect(boardLink).toHaveClass(/font-medium/);
    await expect(boardLink).toHaveClass(/truncate/);
    
    await expect(boardLink).toHaveClass(/hover:opacity-100/);
    await expect(boardLink).toHaveClass(/transition-opacity/);
  });
});
