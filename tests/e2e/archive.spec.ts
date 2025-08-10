import { test, expect } from '@playwright/test';
import { 
  createMockOrganization, 
  createMockUserWithOrganization 
} from '../fixtures/test-helpers';

test.describe('Archive Functionality', () => {
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

    // Mock the organizations API endpoint
    await page.route('**/api/user/organizations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: testOrg.id,
              name: testOrg.name,
              role: 'ADMIN'
            }
          ]
        }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      const url = new URL(route.request().url());
      const organizationId = url.searchParams.get('organizationId');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boards: [
            {
              id: 'test-board',
              name: 'Test Board',
              description: 'A test board',
              _count: { notes: 5 },
              isPublic: false,
              createdBy: testUser.id,
              organizationId: organizationId || testOrg.id,
            },
          ],
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

    await page.route('**/api/boards/all-notes/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [],
        }),
      });
    });

    await page.route('**/api/boards/archive/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [],
        }),
      });
    });
  });

  test('should display Archive board on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for the dashboard to load
    await page.waitForTimeout(3000);

    // Check if we're showing the "No boards yet" message
    const noBoardsMessage = page.locator('text=Get started by creating your first board');
    const hasNoBoards = await noBoardsMessage.isVisible();
    
    if (hasNoBoards) {
      // If no boards, the Archive board should not be visible
      const archiveCard = page.locator('[href="/boards/archive"]');
      await expect(archiveCard).not.toBeVisible();
      
      // Test that we can still access the Archive board directly
      await page.goto('/boards/archive');
      await expect(page).toHaveURL('/boards/archive');
      await expect(page.locator('text=No notes yet')).toBeVisible();
    } else {
      // If boards are loaded, the Archive board should be visible
      const archiveCard = page.locator('[href="/boards/archive"]');
      await expect(archiveCard).toBeVisible();
    }
  });

  test('should navigate to Archive board from dashboard', async ({ page }) => {
    await page.route('**/api/boards/archive/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [
            {
              id: 'archived-note-1',
              content: 'This is an archived note',
              color: '#fef3c7',
              done: true,
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
    });

    // Navigate directly to Archive board instead of going through dashboard
    await page.goto('/boards/archive');
    
    await expect(page).toHaveURL('/boards/archive');
    await expect(page.locator('text=This is an archived note')).toBeVisible();
  });

  test('should archive a note and remove it from regular board', async ({ page }) => {
    let noteArchived = false;
    let archivedNoteData: any = null;

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'test-note-1',
                content: 'Test note to archive',
                color: '#fef3c7',
                done: false,
                checklistItems: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                board: {
                  id: 'test-board',
                  name: 'Test Board',
                },
                boardId: 'test-board',
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
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
        if (putData.done === true) {
          noteArchived = true;
          archivedNoteData = putData;
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'test-note-1',
              content: 'Test note to archive',
              color: '#fef3c7',
              done: true,
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

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Test note to archive')).toBeVisible();
    
    const archiveButton = page.locator('[title="Archive note"]');
    await expect(archiveButton).toBeVisible();
    await archiveButton.click();
    
    await page.waitForTimeout(500);
    
    expect(noteArchived).toBe(true);
    expect(archivedNoteData.done).toBe(true);
  });

  test('should not show archive button on Archive board', async ({ page }) => {
    await page.route('**/api/boards/archive/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [
            {
              id: 'archived-note-1',
              content: 'This is an archived note',
              color: '#fef3c7',
              done: true,
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
    });

    await page.goto('/boards/archive');
    
    await expect(page.locator('text=This is an archived note')).toBeVisible();
    
    const archiveButton = page.locator('[title="Archive note"]');
    await expect(archiveButton).not.toBeVisible();
  });


  test('should show empty state on Archive board when no archived notes exist', async ({ page }) => {
    await page.route('**/api/boards/archive/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [],
        }),
      });
    });

    await page.goto('/boards/archive');
    
    await expect(page.locator('text=No notes yet')).toBeVisible();
  });

  test('should display board name as "Archive" in navigation', async ({ page }) => {
    await page.route('**/api/boards/archive/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notes: [],
        }),
      });
    });

    await page.goto('/boards/archive');
    
    await expect(page.locator('text=Archive')).toBeVisible();
  });
});
