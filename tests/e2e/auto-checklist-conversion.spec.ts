import { test, expect } from '@playwright/test';

test.describe('Auto Checklist Conversion', () => {
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
              content: postData.content || '',
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
            },
          }),
        });
      }
    });
  });

  test('should auto-convert note to checklist when typing [ ]', async ({ page }) => {
    let noteCreated = false;
    let noteContentUpdated = false;
    let noteConvertedToChecklist = false;
    let capturedNoteData: any = null;
    let capturedContentData: any = null;
    let capturedChecklistData: any = null;

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
        noteCreated = true;
        capturedNoteData = postData;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
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
            },
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/new-note-id', async (route) => {
      if (route.request().method() === 'PUT') {
        const requestBody = await route.request().postDataJSON();
        
        if (requestBody.isChecklist) {
          noteConvertedToChecklist = true;
          capturedChecklistData = requestBody;
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              note: {
                id: 'new-note-id',
                content: requestBody.content || '',
                color: '#fef3c7',
                done: false,
                isChecklist: true,
                checklistItems: requestBody.checklistItems || [],
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
        } else {
          noteContentUpdated = true;
          capturedContentData = requestBody;
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              note: {
                id: 'new-note-id',
                content: requestBody.content || '',
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
              },
            }),
          });
        }
      }
    });

    await page.goto('/boards/test-board');
    
    await page.click('button:has-text("Add Your First Note")');
    expect(noteCreated).toBe(true);
    
    expect(capturedNoteData).not.toBeNull();
    expect(capturedNoteData.content).toBe('');
    
    const textarea = page.locator('textarea[placeholder*="Enter note content"]');
    await textarea.fill('stuff to do');
    await textarea.press('Control+Enter'); // Save content using keyboard shortcut
    
    await page.waitForTimeout(500);
    
    expect(noteContentUpdated).toBe(true);
    expect(capturedContentData).not.toBeNull();
    expect(capturedContentData.content).toBe('stuff to do');
    expect(capturedContentData.isChecklist).toBeUndefined();
    
    await page.hover('.group');
    await page.click('button:has(.w-3.h-3)');
    
    const editTextarea = page.locator('textarea[placeholder*="Enter note content"]');
    await editTextarea.fill('[ ] stuff to do');
    
    await page.waitForTimeout(500);
    
    expect(noteConvertedToChecklist).toBe(true);
    expect(capturedChecklistData).not.toBeNull();
    expect(capturedChecklistData.isChecklist).toBe(true);
    expect(capturedChecklistData.checklistItems).toBeDefined();
    expect(Array.isArray(capturedChecklistData.checklistItems)).toBe(true);
    
    const checklistItems = capturedChecklistData.checklistItems;
    expect(checklistItems).toHaveLength(1);
    expect(checklistItems[0].content).toBe('stuff to do');
    expect(checklistItems[0].checked).toBe(false);
  });

  test('should auto-convert with existing content', async ({ page }) => {
    let conversionCalled = false;

    await page.route('**/api/boards/test-board/notes/new-note-id', async (route) => {
      if (route.request().method() === 'PUT') {
        const requestBody = await route.request().postDataJSON();
        if (requestBody.isChecklist) {
          conversionCalled = true;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              note: {
                id: 'new-note-id',
                content: 'Buy milk\nBuy bread',
                isChecklist: true,
                checklistItems: [
                  { id: 'item-1', content: 'Buy milk', checked: false, order: 0 },
                  { id: 'item-2', content: 'Buy bread', checked: false, order: 1 }
                ],
                color: '#fef3c7',
                done: false,
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
    await page.click('button:has-text("Add Your First Note")');
    
    const textarea = page.locator('textarea[placeholder*="Enter note content"]');
    await textarea.fill('Buy milk\nBuy bread\n[ ]');
    
    await page.waitForTimeout(500);
    
    expect(conversionCalled).toBe(true);
  });

  test('should not convert if note is already a checklist', async ({ page }) => {
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
                isChecklist: true,
                checklistItems: [
                  { id: 'item-1', content: 'Existing item', checked: false, order: 0 }
                ],
                color: '#fef3c7',
                done: false,
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

    let conversionCalled = false;
    await page.route('**/api/boards/test-board/notes/checklist-note', async (route) => {
      if (route.request().method() === 'PUT') {
        const requestBody = await route.request().postDataJSON();
        if (requestBody.isChecklist) {
          conversionCalled = true;
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'checklist-note',
              content: requestBody.content || '',
              isChecklist: true,
              checklistItems: [
                { id: 'item-1', content: 'Existing item', checked: false, order: 0 }
              ],
              color: '#fef3c7',
              done: false,
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
    
    await expect(page.locator('text=Existing item')).toBeVisible();
    
    await page.click('text=Existing item');
    
    const input = page.locator('input.bg-transparent');
    await input.fill('Existing item [ ]');
    
    await page.waitForTimeout(500);
    
    expect(conversionCalled).toBe(false);
  });
});
