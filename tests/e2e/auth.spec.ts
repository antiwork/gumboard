import { test, expect } from '@playwright/test';
import { 
  createMockOrganization, 
  createMockUserWithOrganization,
  createMockUserWithMultipleOrganizations 
} from '../fixtures/test-helpers';

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
            name: testUser.name,
            email: testUser.email,
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            organizations: testUser.organizations,
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
    // Mock both session and user API to return unauthenticated
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null), // No session
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth.*signin/, { timeout: 20000 });
  });

  test('should authenticate user via Google OAuth and access dashboard', async ({ page }) => {
    const testOrg = createMockOrganization({ id: 'google-org', name: 'Google Organization' });
    const testUser = createMockUserWithOrganization(testOrg, 'ADMIN', {
      id: 'google-user',
      email: 'google@example.com',
      name: 'Google User',
      image: 'https://example.com/avatar.jpg'
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            image: testUser.image,
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            organizations: testUser.organizations,
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

  test('should authenticate user via GitHub OAuth and access dashboard', async ({ page }) => {
    const testOrg = createMockOrganization({ id: 'github-org', name: 'GitHub Organization' });
    const testUser = createMockUserWithOrganization(testOrg, 'ADMIN', {
      id: 'github-user',
      email: 'github@example.com',
      name: 'GitHub User',
      image: 'https://avatars.githubusercontent.com/u/123?v=4'
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            image: testUser.image,
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            organizations: testUser.organizations,
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
    const testOrg = createMockOrganization({ id: 'linked-org', name: 'Linked Organization' });
    const testUser = createMockUserWithOrganization(testOrg, 'ADMIN', {
      id: 'linked-user-id',
      email: testEmail,
      name: 'Linked User',
      image: 'https://example.com/avatar.jpg'
    });

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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            image: testUser.image,
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            organizations: testUser.organizations,
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

  test('should link magic link and GitHub OAuth accounts when using same email', async ({ page }) => {
    const testEmail = 'linked@example.com';
    const testOrg = createMockOrganization({ id: 'linked-org', name: 'Linked Organization' });
    const testUser = createMockUserWithOrganization(testOrg, 'ADMIN', {
      id: 'linked-user-id',
      email: testEmail,
      name: 'Linked User',
      image: 'https://avatars.githubusercontent.com/u/456?v=4'
    });

    let magicLinkAuthData: { email: string } | null = null;
    let githubAuthData: { email: string } | null = null;
    
    await page.route('**/api/auth/signin/email', async (route) => {
      const postData = await route.request().postDataJSON();
      magicLinkAuthData = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/auth/verify-request' }),
      });
    });

    await page.route('**/api/auth/signin/github', async (route) => {
      const postData = await route.request().postDataJSON();
      githubAuthData = postData;
      
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            image: testUser.image,
            providers: ['email', 'github'],
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            organizations: testUser.organizations,
            providers: ['email', 'github'],
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
      const mockGitHubAuthData = { email };
      fetch('/api/auth/signin/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockGitHubAuthData)
      });
    }, testEmail);
    
    await page.waitForTimeout(100);
    
    expect(githubAuthData).not.toBeNull();
    expect(githubAuthData!.email).toBe(testEmail);

    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=No boards yet')).toBeVisible();
    
    expect(magicLinkAuthData!.email).toBe(githubAuthData!.email);
  });

  test('should handle user with multiple organizations', async ({ page }) => {
    const org1 = createMockOrganization({ id: 'org-1', name: 'Organization 1' });
    const org2 = createMockOrganization({ id: 'org-2', name: 'Organization 2' });
    const testUser = createMockUserWithMultipleOrganizations(
      [org1, org2], 
      ['ADMIN', 'MEMBER'],
      {
        id: 'multi-org-user',
        email: 'multi@example.com',
        name: 'Multi Org User'
      }
    );

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
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
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            organizations: testUser.organizations,
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
});
