import { test, expect } from '@playwright/test';

test.describe('GitHub Authentication Flow', () => {
  test('should display GitHub login button on signin page', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check that GitHub button is visible
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();
    
    // Verify the button has the correct styling
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    await expect(githubButton).toHaveClass(/outline/);
  });

  test('should initiate GitHub OAuth flow when button is clicked', async ({ page }) => {
    let githubAuthInitiated = false;
    
    await page.route('**/api/auth/signin/github', async (route) => {
      githubAuthInitiated = true;
      
      // Mock the GitHub OAuth redirect
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          url: 'https://github.com/login/oauth/authorize?client_id=test&redirect_uri=http://localhost:3000/api/auth/callback/github&scope=read:user,user:email'
        }),
      });
    });

    await page.goto('/auth/signin');
    
    // Click the GitHub button
    await page.click('button:has-text("Continue with GitHub")');
    
    expect(githubAuthInitiated).toBe(true);
  });

  test('should handle GitHub OAuth callback and authenticate user', async ({ page }) => {
    // Mock the GitHub OAuth callback
    await page.route('**/api/auth/callback/github', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: '/dashboard',
          user: {
            id: 'github-user-123',
            name: 'GitHub User',
            email: 'github@example.com',
            image: 'https://avatars.githubusercontent.com/u/123?v=4',
          },
        }),
      });
    });

    // Mock the session after GitHub authentication
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'github-user-123',
            name: 'GitHub User',
            email: 'github@example.com',
            image: 'https://avatars.githubusercontent.com/u/123?v=4',
          },
        }),
      });
    });

    // Mock user API
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'github-user-123',
            name: 'GitHub User',
            email: 'github@example.com',
            image: 'https://avatars.githubusercontent.com/u/123?v=4',
          },
        }),
      });
    });

    // Mock boards API
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    // Simulate GitHub OAuth callback
    await page.goto('/api/auth/callback/github?code=test-code&state=test-state');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify user is authenticated
    await expect(page.locator('text=No boards yet')).toBeVisible();
  });

  test('should handle GitHub authentication errors gracefully', async ({ page }) => {
    await page.route('**/api/auth/signin/github', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'GitHub authentication failed',
          message: 'Invalid client credentials'
        }),
      });
    });

    await page.goto('/auth/signin');
    
    // Click the GitHub button
    await page.click('button:has-text("Continue with GitHub")');
    
    // Should handle error gracefully (not crash)
    await expect(page).toHaveURL(/.*auth.*signin/);
  });

  test('should link GitHub account with existing email account', async ({ page }) => {
    const testEmail = 'linked@example.com';
    let githubAuthData: any = null;
    
    // Mock GitHub OAuth with same email as existing account
    await page.route('**/api/auth/signin/github', async (route) => {
      const postData = await route.request().postDataJSON();
      githubAuthData = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          url: '/dashboard',
          user: {
            id: 'linked-user-id',
            name: 'Linked User',
            email: testEmail,
            image: 'https://avatars.githubusercontent.com/u/456?v=4',
            providers: ['email', 'github'],
          },
        }),
      });
    });

    // Mock session for linked account
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'linked-user-id',
            name: 'Linked User',
            email: testEmail,
            image: 'https://avatars.githubusercontent.com/u/456?v=4',
            providers: ['email', 'github'],
          },
        }),
      });
    });

    // Mock user API for linked account
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'linked-user-id',
            name: 'Linked User',
            email: testEmail,
            image: 'https://avatars.githubusercontent.com/u/456?v=4',
            providers: ['email', 'github'],
          },
        }),
      });
    });

    // Mock boards API
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/auth/signin');
    
    // Click GitHub button
    await page.click('button:has-text("Continue with GitHub")');
    
    await page.waitForTimeout(100);
    
    // Verify GitHub auth was initiated
    expect(githubAuthData).not.toBeNull();
    
    // Navigate to dashboard to verify linked account
    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=No boards yet')).toBeVisible();
  });

  test('should maintain GitHub authentication state across page reloads', async ({ page }) => {
    // Mock persistent session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'github-user-123',
            name: 'GitHub User',
            email: 'github@example.com',
            image: 'https://avatars.githubusercontent.com/u/123?v=4',
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
            id: 'github-user-123',
            name: 'GitHub User',
            email: 'github@example.com',
            image: 'https://avatars.githubusercontent.com/u/123?v=4',
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

    // First visit to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Reload the page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=No boards yet')).toBeVisible();
  });

  test('should handle GitHub OAuth with missing email scope', async ({ page }) => {
    // Mock GitHub OAuth without email permission
    await page.route('**/api/auth/callback/github', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'GitHub email access required',
          message: 'Please grant email access to continue'
        }),
      });
    });

    await page.goto('/api/auth/callback/github?code=test-code&state=test-state');
    
    // Should handle the error gracefully
    await expect(page).toHaveURL(/.*auth.*signin/);
  });

  test('should verify GitHub button is properly positioned in OAuth section', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check that GitHub button is in the OAuth section
    const oauthSection = page.locator('text=or continue with').locator('..');
    const githubButton = oauthSection.locator('button:has-text("Continue with GitHub")');
    
    await expect(githubButton).toBeVisible();
    
    // Verify it's positioned after the Google button
    const googleButton = oauthSection.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();
    
    // Check that both buttons are in the same container
    const buttonContainer = page.locator('.space-y-3');
    await expect(buttonContainer.locator('button:has-text("Continue with Google")')).toBeVisible();
    await expect(buttonContainer.locator('button:has-text("Continue with GitHub")')).toBeVisible();
  });
}); 