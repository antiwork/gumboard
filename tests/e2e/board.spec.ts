import { test, expect, isAuthenticationRequired } from '../fixtures/test-helpers';

test.describe('Board Creation', () => {
  test('should redirect to authentication when accessing dashboard without login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to signin page
    await expect(page).toHaveURL(/.*auth\/signin.*/);
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
  });

  test('should show signin form elements', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Should show the signin form
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle email input in signin form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const testEmail = 'test@example.com';
    await page.fill('input[type="email"]', testEmail);
    
    // Button should be enabled when email is filled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
    
    // Should show the correct email value
    await expect(page.locator('input[type="email"]')).toHaveValue(testEmail);
  });

  test('should show magic link sent message after form submission', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const testEmail = 'test@example.com';
    await page.fill('input[type="email"]', testEmail);
    await page.click('button[type="submit"]');
    
    // Should show the "check your email" message
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });
});