import { test, expect } from '@playwright/test';
import { 
  createMockOrganization, 
  createMockUserWithOrganization 
} from '../fixtures/test-helpers';

test.describe('Checklist Backspace Behavior', () => {
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

    await page.goto('/boards/test-board');
  });

  test('should verify backspace behavior exists in checklist items', async ({ page }) => {
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
                    content: 'Test item',
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
              checklistItems: [],
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
    
    await expect(page.locator('text=Test item')).toBeVisible();
    
    const checklistItemElement = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Test item' });
    await expect(checklistItemElement).toBeVisible();
  });
});
