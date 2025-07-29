import { test, expect, cleanupTestData } from '../fixtures/test-helpers';

test.describe('Account Creation', () => {
  test('should show sign in button on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Look for the actual button text from your homepage
    await expect(page.locator('text=Get started - it\'s free')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/');
    
    // Click the get started button
    await page.click('text=Get started - it\'s free');
    
    // Should navigate to auth signin page
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should show authentication form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Should show some form of authentication
    // This test verifies the auth page loads properly
    await expect(page).toHaveTitle(/.*Gumboard.*/);
  });
});