import { test, expect, cleanupTestData } from '../fixtures/test-helpers';

test.describe('Account Creation', () => {
  test('should show sign in button on homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Get started - it\'s free')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Get started - it\'s free');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should show authentication form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page).toHaveTitle(/.*Gumboard.*/);
  });

  test('should show welcome message on signin page', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
  });

  test('should show email input field', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should show continue with email button', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await expect(page.locator('text=Continue with Email')).toBeVisible();
  });

  test('should validate email input', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
    
    await page.fill('#email', 'test@example.com');
    await expect(submitButton).not.toBeDisabled();
  });

  test('should handle email submission', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const email = `test-${Date.now()}@example.com`;
    
    await page.fill('#email', email);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${email}`)).toBeVisible();
  });

  test('should show homepage for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Keep on top of your team\'s to-dos.')).toBeVisible();
  });
});
