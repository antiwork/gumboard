import { test, expect, isAuthenticationRequired } from '../fixtures/test-helpers';

test.describe('Board Creation', () => {
  test('should show homepage for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Keep on top of your team\'s to-dos.')).toBeVisible();
  });

  test('should show signin form elements', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle email input in signin form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const testEmail = 'test@example.com';
    await page.fill('#email', testEmail);
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
    
    await expect(page.locator('#email')).toHaveValue(testEmail);
  });

  test('should show magic link sent message after form submission', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const testEmail = 'test@example.com';
    await page.fill('#email', testEmail);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });

  test('should show board creation requires authentication', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should show board access requires authentication', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should show authentication required for board management', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
  });
});
