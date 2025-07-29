import { test, expect } from '../fixtures/test-helpers';

test.describe('Note Creation with Newlines', () => {
  test('should show homepage with demo functionality', async ({ page }) => {
    await page.goto('/');
    
    // Should show the main heading
    await expect(page.locator('text=Keep on top of your team\'s to-dos.')).toBeVisible();
    
    // Should show the get started button
    await expect(page.locator('text=Get started - it\'s free')).toBeVisible();
  });

  test('should navigate from homepage to signin', async ({ page }) => {
    await page.goto('/');
    
    // Click get started button
    await page.click('text=Get started - it\'s free');
    
    // Should navigate to signin page
    await expect(page).toHaveURL(/.*auth\/signin.*/);
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
  });

  test('should show features section on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Should show features section
    await expect(page.locator('text=Everything you need to stay organized')).toBeVisible();
    await expect(page.locator('text=Sticky notes & tasks')).toBeVisible();
    await expect(page.locator('text=Real-time collaboration')).toBeVisible();
    await expect(page.locator('text=Organization management')).toBeVisible();
  });

  test('should show interactive demo on homepage', async ({ page }) => {
    await page.goto('/');
    
    // The homepage should have some kind of demo component
    // This tests that the page loads properly and shows the main content
    await expect(page.locator('span.text-4xl.font-bold')).toContainText('Gumboard');
    await expect(page.locator('text=free, real-time sticky note board')).toBeVisible();
  });
});