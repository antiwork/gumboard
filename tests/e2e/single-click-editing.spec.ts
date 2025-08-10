import { test, expect } from '@playwright/test';
import { 
  createMockOrganization, 
  createMockUserWithOrganization 
} from '../fixtures/test-helpers';

test.describe('Single Click Editing', () => {
  test.beforeEach(async ({ page }) => {
    const testOrg = createMockOrganization({ id: 'test-org', name: 'Test Organization' });
    const testUser = createMockUserWithOrganization(testOrg, 'ADMIN', {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User'
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
          }
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          // Include both old and new format for compatibility
          organization: {
            id: testOrg.id,
            name: testOrg.name,
            slackWebhookUrl: testOrg.slackWebhookUrl,
            members: []
          },
          organizations: testUser.organizations,
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
  });

  test('should enable single click editing for checklist items', async ({ page }) => {
    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'test-note-1',
                content: '',
                color: '#fef3c7',
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Click to edit me',
                    checked: false,
                    order: 0
                  }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'test-user', // Add this field
                boardId: 'test-board', // Add this field
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
                },
                board: {
                  id: 'test-board',
                  name: 'Test Board',
                  organizationId: 'test-org', // Add this field
                },
              }
            ],
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/test-note-1', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'test-note-1',
              content: '',
              color: '#fef3c7',
              done: false,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: [
                {
                  id: 'item-1',
                  content: 'Updated content',
                  checked: false,
                  order: 0
                }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'test-user',
              boardId: 'test-board',
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: 'test-board',
                name: 'Test Board',
                organizationId: 'test-org',
              },
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Click to edit me')).toBeVisible();
    
    const checklistItem = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Click to edit me' });
    await expect(checklistItem).toBeVisible();
    
    await checklistItem.click();
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Click to edit me');
  });

  test('should save changes on blur', async ({ page }) => {
    let updateCalled = false;
    let updatedContent = '';

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'checklist-note',
                content: '',
                color: '#fef3c7',
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Original content',
                    checked: false,
                    order: 0
                  }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'test-user', // Add this field
                boardId: 'test-board', // Add this field
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
                },
                board: {
                  id: 'test-board',
                  name: 'Test Board',
                  organizationId: 'test-org', // Add this field
                },
              }
            ],
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/checklist-note', async (route) => {
      if (route.request().method() === 'PUT') {
        updateCalled = true;
        const requestBody = await route.request().postDataJSON();
        updatedContent = requestBody.checklistItems[0].content;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'checklist-note',
              content: '',
              color: '#fef3c7',
              done: false,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: [
                {
                  id: 'item-1',
                  content: requestBody.checklistItems[0].content,
                  checked: false,
                  order: 0
                }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'test-user',
              boardId: 'test-board',
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: 'test-board',
                name: 'Test Board',
                organizationId: 'test-org',
              },
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Original content')).toBeVisible();
    
    const checklistItem = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Original content' });
    await checklistItem.click();
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    
    await input.fill('Updated content on blur');
    await input.blur();
    
    await page.waitForTimeout(500);
    
    expect(updateCalled).toBe(true);
    expect(updatedContent).toBe('Updated content on blur');
  });

  test('should save changes on Enter key', async ({ page }) => {
    let updateCalled = false;
    let updatedContent = '';

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'checklist-note',
                content: '',
                color: '#fef3c7',
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Original content',
                    checked: false,
                    order: 0
                  }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'test-user', // Add this field
                boardId: 'test-board', // Add this field
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
                },
                board: {
                  id: 'test-board',
                  name: 'Test Board',
                  organizationId: 'test-org', // Add this field
                },
              }
            ],
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/checklist-note', async (route) => {
      if (route.request().method() === 'PUT') {
        updateCalled = true;
        const requestBody = await route.request().postDataJSON();
        updatedContent = requestBody.checklistItems[0].content;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'checklist-note',
              content: '',
              color: '#fef3c7',
              done: false,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: [
                {
                  id: 'item-1',
                  content: requestBody.checklistItems[0].content,
                  checked: false,
                  order: 0
                }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'test-user',
              boardId: 'test-board',
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: 'test-board',
                name: 'Test Board',
                organizationId: 'test-org',
              },
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Original content')).toBeVisible();
    
    const checklistItem = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Original content' });
    await checklistItem.click();
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    
    await input.fill('Updated content on Enter');
    await input.press('Enter');
    
    await page.waitForTimeout(500);
    
    expect(updateCalled).toBe(true);
    expect(updatedContent).toBe('Updated content on Enter');
  });

  test('should cancel editing on Escape key', async ({ page }) => {
    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'checklist-note',
                content: '',
                color: '#fef3c7',
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Original content',
                    checked: false,
                    order: 0
                  }
                ],
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

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Original content')).toBeVisible();
    
    const checklistItem = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Original content' });
    await checklistItem.click();
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    
    await input.fill('This should be cancelled');
    await input.press('Escape');
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=Original content')).toBeVisible();
    await expect(input).not.toBeVisible();
  });

  test('should handle empty content gracefully', async ({ page }) => {
    let updateCalled = false;

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'checklist-note',
                content: '',
                color: '#fef3c7',
                done: false,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Original content',
                    checked: false,
                    order: 0
                  }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'test-user', // Add this field
                boardId: 'test-board', // Add this field
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
                },
                board: {
                  id: 'test-board',
                  name: 'Test Board',
                  organizationId: 'test-org', // Add this field
                },
              }
            ],
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/checklist-note', async (route) => {
      if (route.request().method() === 'PUT') {
        updateCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'checklist-note',
              content: '',
              color: '#fef3c7',
              done: false,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: [
                {
                  id: 'item-1',
                  content: '',
                  checked: false,
                  order: 0
                }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'test-user',
              boardId: 'test-board',
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: 'test-board',
                name: 'Test Board',
                organizationId: 'test-org',
              },
            },
          }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Original content')).toBeVisible();
    
    const checklistItem = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Original content' });
    await checklistItem.click();
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
    
    await input.fill('');
    await input.press('Enter');
    
    await page.waitForTimeout(500);
    
    expect(updateCalled).toBe(true);
  });
});
