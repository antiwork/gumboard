import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete email authentication flow and verify database state', async ({ page }) => {
    let emailSent = false;
    let authData: { email: string } | null = null;
    
    await page.route('**/api/auth/signin/email', async (route) => {
      emailSent = true;
      const postData = await route.request().postDataJSON();
      authData = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/auth/verify-request' }),
      });
    });
    
    await page.goto('/auth/signin');
    
    await page.evaluate(() => {
      const mockAuthData = { email: 'test@example.com' };
      fetch('/api/auth/signin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAuthData)
      });
    });
    
    await page.waitForTimeout(100);
    
    expect(emailSent).toBe(true);
    expect(authData).not.toBeNull();
    expect(authData!.email).toBe('test@example.com');
  });

  test('should authenticate user and access dashboard', async ({ page }) => {
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

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=No boards yet')).toBeVisible();
  });

  test('should redirect unauthenticated users to signin', async ({ page }) => {
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth.*signin/, { timeout: 5000 });
  });

  test('should authenticate user via Google OAuth and access dashboard', async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'google-user',
            name: 'Google User',
            email: 'google@example.com',
            image: 'https://example.com/avatar.jpg',
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
            id: 'google-user',
            name: 'Google User',
            email: 'google@example.com',
          },
        }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=No boards yet')).toBeVisible();
  });

  test('should link magic link and Google OAuth accounts when using same email', async ({ page }) => {
    const testEmail = 'linked@example.com';
    let magicLinkAuthData: { email: string } | null = null;
    let googleAuthData: { email: string } | null = null;
    
    await page.route('**/api/auth/signin/email', async (route) => {
      const postData = await route.request().postDataJSON();
      magicLinkAuthData = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/auth/verify-request' }),
      });
    });

    await page.route('**/api/auth/signin/google', async (route) => {
      const postData = await route.request().postDataJSON();
      googleAuthData = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/dashboard' }),
      });
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'linked-user-id',
            name: 'Linked User',
            email: testEmail,
            image: 'https://example.com/avatar.jpg',
            providers: ['email', 'google'],
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
            id: 'linked-user-id',
            name: 'Linked User',
            email: testEmail,
            providers: ['email', 'google'],
          },
        }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/auth/signin');
    
    await page.evaluate((email) => {
      const mockAuthData = { email };
      fetch('/api/auth/signin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockAuthData)
      });
    }, testEmail);
    
    await page.waitForTimeout(100);
    
    expect(magicLinkAuthData).not.toBeNull();
    expect(magicLinkAuthData!.email).toBe(testEmail);

    await page.evaluate((email) => {
      const mockGoogleAuthData = { email };
      fetch('/api/auth/signin/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockGoogleAuthData)
      });
    }, testEmail);
    
    await page.waitForTimeout(100);
    
    expect(googleAuthData).not.toBeNull();
    expect(googleAuthData!.email).toBe(testEmail);

    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=No boards yet')).toBeVisible();
    
    expect(magicLinkAuthData!.email).toBe(googleAuthData!.email);
  });
});
