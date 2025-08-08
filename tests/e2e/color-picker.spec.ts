import { test, expect } from '@playwright/test';

test.describe('Color Picker Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { 
            id: 'test-user', 
            email: 'test@example.com', 
            name: 'Test User' 
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
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
            members: [],
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
            description: 'A test board for color picker',
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
              description: 'A test board for color picker',
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
                id: 'test-note-1',
                content: 'Test note for color picker',
                color: (await page.evaluate(() => window.matchMedia('(prefers-color-scheme: dark)').matches)) ? '#18181B' : '#f4f4f5',
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
                  id: 'test-board',
                  name: 'Test Board',
                },
              },
            ],
          }),
        });
      } else if (route.request().method() === 'POST') {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: postData.content || '',
              color: '#18181B',
              done: false,
              checklistItems: postData.checklistItems || [],
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
  });

  test('should display palette icon on note cards for note author', async ({ page }) => {
    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
  });

  test('should open color picker dropdown when palette icon is clicked', async ({ page }) => {
    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();
    const colorPicker = page.locator('.color-picker');
    await expect(colorPicker).toBeVisible();
    const colorSwatches = page.locator('.color-picker button');
    await expect(colorSwatches).toHaveCount(8);
  });

  test('should change note background color when color is selected', async ({ page }) => {
    let colorUpdateCalled = false;
    let updatedColor = '';

    await page.route('**/api/boards/test-board/notes/test-note-1', async (route) => {
      if (route.request().method() === 'PUT') {
        colorUpdateCalled = true;
        const putData = await route.request().postDataJSON();
        updatedColor = putData.color;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-note-1',
            content: putData.content,
            color: putData.color,
            done: false,
            checklistItems: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: {
              id: 'test-user',
              name: 'Test User',
              email: 'test@example.com',
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();
    await page.waitForSelector('.color-picker');
    const yellowColor = page.locator('.color-picker button').first();
    await yellowColor.click();
    await page.waitForTimeout(500);
    expect(colorUpdateCalled).toBe(true);
    expect(updatedColor).toBe('#fef3c7');
  });

  test('should close color picker when clicking outside', async ({ page }) => {
    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();
    await page.waitForSelector('.color-picker');
    await page.click('body');
    await expect(page.locator('.color-picker')).not.toBeVisible();
  });

  test('should close color picker when pressing escape key', async ({ page }) => {
    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();
    await page.waitForSelector('.color-picker');
    await page.keyboard.press('Escape');
    await expect(page.locator('.color-picker')).not.toBeVisible();
  });

  test('should not show palette icon for non-author users', async ({ page }) => {
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'other-user',
          email: 'other@example.com',
          name: 'Other User',
          isAdmin: false,
          organization: {
            id: 'test-org',
            name: 'Test Organization',
            members: [],
          },
        }),
      });
    });

    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).not.toBeVisible();
  });

  test('should show palette icon for admin users even if not note author', async ({ page }) => {
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'admin-user',
          email: 'admin@example.com',
          name: 'Admin User',
          isAdmin: true,
          organization: {
            id: 'test-org',
            name: 'Test Organization',
            members: [],
          },
        }),
      });
    });

    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
  });

  test('should persist color changes after page refresh', async ({ page }) => {
    let savedColor = '#18181B';

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'test-note-1',
                content: 'Test note for color picker',
                color: savedColor,
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
                  id: 'test-board',
                  name: 'Test Board',
                },
              },
            ],
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/test-note-1', async (route) => {
      if (route.request().method() === 'PUT') {
        const putData = await route.request().postDataJSON();
        savedColor = putData.color;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-note-1',
            content: putData.content,
            color: putData.color,
            done: false,
            checklistItems: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: {
              id: 'test-user',
              name: 'Test User',
              email: 'test@example.com',
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();
    await page.waitForSelector('.color-picker');
    const pinkColor = page.locator('.color-picker button').nth(1);
    await pinkColor.click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    const noteCard = page.locator('[data-testid="note-card"]');
    await expect(noteCard).toHaveClass(/bg-\[#fce7f3\]|bg-pink-100\/20/);
  });

  test('should display all 8 color options in the picker', async ({ page }) => {
    await page.goto('/boards/test-board');
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 5000 });
    await page.hover('[data-testid="note-card"]');
    const paletteButton = page.locator('[data-testid="palette-button"]');
    await expect(paletteButton).toBeVisible();
    await paletteButton.click();
    await page.waitForSelector('.color-picker');
    const colorSwatches = page.locator('.color-picker button');
    await expect(colorSwatches).toHaveCount(8);
    const expectedColors = [
      'rgb(254, 243, 199)',
      'rgb(252, 231, 243)',
      'rgb(219, 234, 254)',
      'rgb(220, 252, 231)',
      'rgb(254, 215, 215)',
      'rgb(224, 231, 255)',
      'rgb(243, 232, 255)',
      'rgb(254, 244, 230)',
    ];
    for (let i = 0; i < expectedColors.length; i++) {
      const swatch = colorSwatches.nth(i);
      await expect(swatch).toHaveCSS('background-color', expectedColors[i]);
    }
  });
});
