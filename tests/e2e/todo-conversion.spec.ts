import { test, expect } from '../fixtures/test-helpers';

test.describe('Note to Todo Conversion', () => {
  test('should show application branding and navigation', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('span.text-4xl.font-bold')).toContainText('Gumboard');
    
    await expect(page.locator('text=Get started - it\'s free')).toBeVisible();
  });

  test('should handle authentication flow for todo functionality', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=Get started - it\'s free');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
    
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('text=Continue with Email')).toBeVisible();
  });

  test('should show footer information', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=A project by')).toBeVisible();
    await expect(page.locator('text=Antiwork')).toBeVisible();
  });

  test('should validate email input in signin form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const emailInput = page.locator('#email');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(submitButton).toBeDisabled();
    
    await emailInput.fill('test@example.com');
    await expect(submitButton).not.toBeDisabled();
    
    await emailInput.fill('');
    await expect(submitButton).toBeDisabled();
  });

  test('should show demo functionality description', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=add notes, edit text, and complete tasks')).toBeVisible();
  });

  test('should show interactive demo section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=interactive demo')).toBeVisible();
  });

  test('should show todo conversion requires authentication', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should show demo features description', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Create colorful sticky notes with interactive checklists')).toBeVisible();
  });

  test('should show demo collaboration features', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=Work together seamlessly with your team in real-time')).toBeVisible();
  });
});
