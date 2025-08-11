import { test, expect } from '@playwright/test';

test.describe('Checklist overflow behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com', name: 'Test User' } }),
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
          organization: { id: 'test-org', name: 'Test Organization' },
        }),
      });
    });


    await page.route('**/api/boards/test-board', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ board: { id: 'test-board', name: 'Test Board', description: 'A test board' } }),
      });
    });


    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [{ id: 'test-board', name: 'Test Board', description: 'A test board' }] }),
      });
    });
  });

  test('long checklist item wraps and Add task stays inside the note', async ({ page }) => {
    const longText = 'This is a very long checklist item that should wrap and not overflow the note width. '.repeat(8);

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [{
              id: 'checklist-note',
              content: '',
              color: '#fef3c7',
              done: false,
              x: 100,
              y: 100,
              width: 260,
              height: 150,
              checklistItems: [ { id: 'item-1', content: longText, checked: false, order: 0 } ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
            }],
          }),
        });
      }
    });

    await page.goto('/boards/test-board');


    const textLocator = page.locator('text=This is a very long checklist item').first();
    await expect(textLocator).toBeVisible();

    const itemBox = await textLocator.boundingBox();
    expect(itemBox).not.toBeNull();
    if (itemBox) {
      expect(itemBox.height).toBeGreaterThan(28); 
    }


    const noteContainer = page.locator('.note-background').first();
    await page.waitForFunction((el) => {
      if (!el) return false;
      const h = parseFloat(getComputedStyle(el as HTMLElement).height);
      return h > 200; // expanded
    }, await noteContainer.elementHandle());


    const contentContainer = page.locator('.note-background .overflow-y-auto').first();
    await expect(contentContainer).toBeVisible();
    const noHorizontalOverflow = await contentContainer.evaluate((el) => {
      const elem = el as HTMLElement;
      return elem.scrollWidth <= elem.clientWidth;
    });
    expect(noHorizontalOverflow).toBe(true);


    const addTaskButton = page.locator('button:has-text("Add task")').first();
    await expect(addTaskButton).toBeVisible();

    const noteBox = await noteContainer.boundingBox();
    const addTaskBox = await addTaskButton.boundingBox();
    expect(noteBox).not.toBeNull();
    expect(addTaskBox).not.toBeNull();
    if (noteBox && addTaskBox) {
      const noteRight = noteBox.x + noteBox.width;
      const noteBottom = noteBox.y + noteBox.height;
      const addTaskRight = addTaskBox.x + addTaskBox.width;
      const addTaskBottom = addTaskBox.y + addTaskBox.height;

      expect(addTaskBottom).toBeLessThanOrEqual(noteBottom + 0.5);
      expect(addTaskBox.x).toBeGreaterThanOrEqual(noteBox.x - 0.5);
      expect(addTaskRight).toBeLessThanOrEqual(noteRight + 0.5);
    }
  });
});


