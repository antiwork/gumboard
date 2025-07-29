import { test, expect } from '../fixtures/test-helpers';

test.describe('Note to Todo Conversion', () => {
  test('should show application branding and navigation', async ({ page }) => {
    await page.goto('/');
    
    // Should show the Gumboard branding (use more specific selector)
    await expect(page.locator('span.text-4xl.font-bold')).toContainText('Gumboard');
    
    // Should show the main call to action
    await expect(page.locator('text=Get started - it\'s free')).toBeVisible();
  });

  test('should handle authentication flow for todo functionality', async ({ page }) => {
    await page.goto('/');
    
    // Click get started to begin auth flow
    await page.click('text=Get started - it\'s free');
    
    // Should be on signin page
    await expect(page).toHaveURL(/.*auth\/signin.*/);
    
    // Should show signin form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('text=Continue with Email')).toBeVisible();
  });

  test('should show footer information', async ({ page }) => {
    await page.goto('/');
    
    // Should show footer with project attribution
    await expect(page.locator('text=A project by')).toBeVisible();
    await expect(page.locator('text=Antiwork')).toBeVisible();
  });

  test('should validate email input in signin form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Test email validation
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Button should be disabled initially
    await expect(submitButton).toBeDisabled();
    
    // Fill valid email
    await emailInput.fill('test@example.com');
    await expect(submitButton).not.toBeDisabled();
    
    // Clear email
    await emailInput.fill('');
    await expect(submitButton).toBeDisabled();
  });
});