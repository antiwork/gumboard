import { test, expect } from '@playwright/test';

test.describe('Organization Setup Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
          }
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          organization: null,
        }),
      });
    });
  });

  test('should show "Save" button when no email addresses are filled', async ({ page }) => {
    await page.goto('/setup/organization');
    
    await expect(page.locator('h1:has-text("Setup Your Organization")')).toBeVisible();
    await expect(page.locator('text=Welcome, Test User!')).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save');
    await expect(submitButton).toBeVisible();
  });

  test('should show "Save" button when email fields are empty', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save');
  });

  test('should show "Save" button when email addresses contain only whitespace', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('   ');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save');
  });

  test('should show "Save" button when email addresses are invalid (no @ symbol)', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('invalid-email');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save');
  });

  test('should show "Save & Send Invites" button when one valid email is filled', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('teammate@company.com');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save & Send Invites');
  });

  test('should show "Save & Send Invites" button when multiple valid emails are filled', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const firstEmailInput = page.locator('input[type="email"]').first();
    await firstEmailInput.fill('teammate1@company.com');
    
    const addTeamMemberButton = page.locator('button:has-text("Add Team Member")');
    await addTeamMemberButton.click();
    
    const secondEmailInput = page.locator('input[type="email"]').nth(1);
    await secondEmailInput.fill('teammate2@company.com');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save & Send Invites');
  });

  test('should show "Save & Send Invites" when at least one email is valid (mixed valid/invalid)', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const firstEmailInput = page.locator('input[type="email"]').first();
    await firstEmailInput.fill('invalid-email');
    
    const addTeamMemberButton = page.locator('button:has-text("Add Team Member")');
    await addTeamMemberButton.click();
    
    const secondEmailInput = page.locator('input[type="email"]').nth(1);
    await secondEmailInput.fill('valid@company.com');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save & Send Invites');
  });

  test('should dynamically update button text when typing in email field', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const emailInput = page.locator('input[type="email"]').first();
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(submitButton).toHaveText('Save');
    
    await emailInput.fill('test');
    await expect(submitButton).toHaveText('Save');
    
    await emailInput.fill('test@');
    await expect(submitButton).toHaveText('Save & Send Invites');
    
    await emailInput.fill('test@company.com');
    await expect(submitButton).toHaveText('Save & Send Invites');
    
    await emailInput.fill('');
    await expect(submitButton).toHaveText('Save');
  });

  test('should show "Creating..." when form is being submitted', async ({ page }) => {
    let organizationCreateCalled = false;

    await page.route('**/api/organization', async (route) => {
      organizationCreateCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: {
            id: 'test-org',
            name: 'Test Organization',
          },
        }),
      });
    });

    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('teammate@company.com');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save & Send Invites');
    
    await submitButton.click();
    
    await expect(submitButton).toHaveText('Creating...');
    await expect(submitButton).toBeDisabled();
  });

  test('should maintain button functionality with conditional text', async ({ page }) => {
    await page.goto('/setup/organization');
    
    const orgNameInput = page.locator('input[id="organizationName"]');
    await orgNameInput.fill('Test Organization');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveText('Save');
    await expect(submitButton).not.toBeDisabled();
    
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('teammate@company.com');
    
    await expect(submitButton).toHaveText('Save & Send Invites');
    await expect(submitButton).not.toBeDisabled();
  });
});
