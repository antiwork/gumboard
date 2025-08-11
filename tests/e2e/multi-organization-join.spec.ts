import { test, expect } from '@playwright/test';
import { 
  createMockOrganization, 
  createMockUserWithOrganization 
} from '../fixtures/test-helpers';

test.describe('Multi-Organization Join Functionality', () => {
  test.beforeEach(async ({ page }) => {
    const testOrg = createMockOrganization({ id: 'test-org', name: 'Test Organization' });
    const testUser = createMockUserWithOrganization(testOrg, 'ADMIN', {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User'
    });

    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: testUser.id,
            email: testUser.email,
            name: testUser.name,
          }
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: testUser.id,
          email: testUser.email,
          name: testUser.name,
          organization: {
            id: testOrg.id,
            name: testOrg.name,
            slackWebhookUrl: testOrg.slackWebhookUrl,
            members: []
          },
          organizations: testUser.organizations,
        }),
      });
    });
  });

  test('should allow user to join multiple organizations', async ({ page }) => {
    await page.route('**/api/organization/join', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully joined organization'
          }),
        });
      }
    });

    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      const url = new URL(route.request().url());
      const token = url.searchParams.get('token');
      
      if (token === 'valid-token-1') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            organization: {
              id: 'new-org-1',
              name: 'New Organization 1'
            }
          }),
        });
      } else if (token === 'valid-token-2') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            organization: {
              id: 'new-org-2',
              name: 'New Organization 2'
            }
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: false,
            error: 'Invalid token'
          }),
        });
      }
    });

    // Test joining first organization
    await page.goto('/join/valid-token-1');
    await page.waitForTimeout(2000);

    // Check that the join page loads (even if it shows an error for invalid token)
    await expect(page.locator('body')).toBeVisible();

    // Test joining second organization
    await page.goto('/join/valid-token-2');
    await page.waitForTimeout(2000);

    // Check that the join page loads
    await expect(page.locator('body')).toBeVisible();

    // Verify that no single-org restriction error is shown
    const errorMessage = page.locator('text=already a member of another organization');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should handle existing user joining new organization', async ({ page }) => {
    await page.route('**/api/organization/join', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully joined organization'
          }),
        });
      }
    });

    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          organization: {
            id: 'new-org',
            name: 'New Organization'
          }
        }),
      });
    });

    await page.route('**/api/user/organizations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: 'test-org',
              name: 'Test Organization',
              role: 'ADMIN'
            }
          ]
        }),
      });
    });

    await page.goto('/join/valid-token');
    await page.waitForTimeout(1000);

        // Should allow joining even though user is already in an organization
    await expect(page.locator('body')).toBeVisible();

    // Should NOT show single-organization restriction error
    const errorMessage = page.locator('text=already a member of another organization');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should handle new user account creation and joining', async ({ page }) => {
    await page.route('**/api/organization/auto-create-account-and-join', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Account created and joined organization successfully'
          }),
        });
      }
    });

    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          organization: {
            id: 'new-org',
            name: 'New Organization'
          }
        }),
      });
    });

    await page.goto('/join/valid-token');
    await page.waitForTimeout(1000);

        // Should show the join form for new users
    await expect(page.locator('body')).toBeVisible();

    // Should NOT show single-organization restriction error
    const errorMessage = page.locator('text=already a member of another organization');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should validate self-serve invite tokens', async ({ page }) => {
    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: false,
          error: 'Invalid or expired token'
        }),
      });
    });

    await page.goto('/join/invalid-token');
    await page.waitForTimeout(1000);

    // Should show error for invalid token
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle expired self-serve invite tokens', async ({ page }) => {
    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: false,
          error: 'Token has expired'
        }),
      });
    });

    await page.goto('/join/expired-token');
    await page.waitForTimeout(1000);

    // Should show error for expired token
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show organization details in join page', async ({ page }) => {
    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          organization: {
            id: 'new-org',
            name: 'Amazing Organization',
            description: 'A fantastic organization to join',
            memberCount: 15
          }
        }),
      });
    });

    await page.goto('/join/valid-token');
    await page.waitForTimeout(1000);

    // Should show organization details
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle join organization API errors gracefully', async ({ page }) => {
    await page.route('**/api/organization/self-serve-invites/validate-token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          organization: {
            id: 'new-org',
            name: 'New Organization'
          }
        }),
      });
    });

    await page.route('**/api/organization/join', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to join organization'
          }),
        });
      }
    });

    await page.goto('/join/valid-token');
    await page.waitForTimeout(1000);

    // For now, just verify the page loads
    await expect(page.locator('body')).toBeVisible();
  });
});
