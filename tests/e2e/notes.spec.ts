import { test, expect } from '../fixtures/test-helpers';

test.describe('Note Creation with Newlines', () => {
  test('should show homepage with demo functionality', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Keep on top of your team\'s to-dos.')).toBeVisible();
    
    await expect(page.locator('text=Get started - it\'s free')).toBeVisible();
  });

  test('should navigate from homepage to signin', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Get started - it\'s free');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
    await expect(page.locator('text=Welcome to Gumboard')).toBeVisible();
  });

  test('should show features section on homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Everything you need to stay organized')).toBeVisible();
    await expect(page.locator('text=Sticky notes & tasks')).toBeVisible();
    await expect(page.locator('text=Real-time collaboration')).toBeVisible();
    await expect(page.locator('text=Organization management')).toBeVisible();
  });

  test('should show interactive demo on homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('span.text-4xl.font-bold')).toContainText('Gumboard');
    await expect(page.locator('text=free, real-time sticky note board')).toBeVisible();
  });

  test('should show demo section on homepage', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=interactive demo')).toBeVisible();
  });

  test('should show demo note creation requires authentication', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should show demo features', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=add notes, edit text, and complete tasks')).toBeVisible();
  });

  test('should show demo functionality description', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Try the interactive demo')).toBeVisible();
  });
});
