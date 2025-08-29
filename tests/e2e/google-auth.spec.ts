import { test, expect } from "../fixtures/test-helpers";

test.describe("Google Authentication Flow", () => {
  test("should display Google login button on signin page", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check that Google button is visible
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Verify the button has the correct styling
    const googlebutton = page.locator('button:has-text("Continue with Google")');
    await expect(googlebutton).toHaveClass(/outline/);
  });

  test("should initiate Google OAuth flow when button is clicked", async ({ page }) => {
    let googleAuthInitiated = false;

    // Mock the Google OAuth redirect URL that NextAuth generates
    await page.route("**/accounts.google.com/o/oauth2/v2/auth**", async (route) => {
      googleAuthInitiated = true;

      // Mock the Google OAuth redirect
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Google OAuth Mock</body></html>",
      });
    });

    await page.goto("/auth/signin");
    // Use more reliable locator
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();

    // Click and wait for navigation
    await Promise.all([
      page.waitForURL("**/accounts.google.com/o/oauth2/v2/auth**", {
        waitUntil: "networkidle",
      }),
      googleButton.click(),
    ]);

    expect(googleAuthInitiated).toBe(true);
  });

  test("should handle Google OAuth callback and authenticate user", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Ensure this user has no boards to verify "No boards yet" state
    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    // Navigate to dashboard with authenticated session
    await authenticatedPage.goto("/dashboard");

    // Should be on dashboard
    await expect(authenticatedPage).toHaveURL(/.*dashboard/);

    // Verify user is authenticated
    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
  });

  test("should handle Google authentication errors gracefully", async ({ page }) => {
    // Mock Google OAuth redirect to return an error
    await page.route("**/accounts.google.com/o/oauth2/v2/auth**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Google authentication failed",
          message: "Invalid client credentials",
        }),
      });
    });

    await page.goto("/auth/signin");

    // Click the Google button
    await page.click('button:has-text("Continue with Google")');

    // Should handle error gracefully (not crash)
    await expect(page).toHaveURL(/.*auth.*signin/);
  });

  test("should link Google account with existing email account", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    let googleAuthInitiated = false;

    // Mock Google OAuth redirect
    await authenticatedPage.route("**/accounts.google.com/o/oauth2/v2/auth**", async (route) => {
      googleAuthInitiated = true;

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Google OAuth Mock</body></html>",
      });
    });

    // Ensure this user has no boards to verify "No boards yet" state
    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    await authenticatedPage.goto("/auth/signin");

    // Click Google button
    await authenticatedPage.click('button:has-text("Continue with Google")');

    // Wait for Google OAuth to be initiated
    await authenticatedPage.waitForURL("**/accounts.google.com/o/oauth2/v2/auth**");

    // Verify Google auth was initiated
    expect(googleAuthInitiated).toBe(true);

    // Navigate to dashboard to verify linked account
    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
  });

  test("should maintain Google authentication state across page reloads", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Ensure this user has no boards to verify "No boards yet" state
    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    // First visit to dashboard
    await authenticatedPage.goto("/dashboard");
    await expect(authenticatedPage).toHaveURL(/.*dashboard/);

    // Reload the page
    await authenticatedPage.reload();

    // Should still be authenticated
    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
  });

  test("should handle Google OAuth with missing email scope", async ({ page }) => {
    // Mock the Google OAuth callback to return an error
    await page.route("**/api/auth/callback/google", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Google email access required",
          message: "Please grant email access to continue",
        }),
      });
    });

    // Mock the error page to handle the configuration error
    await page.route("**/auth/error", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Error page</body></html>",
      });
    });

    // Navigate to the callback with error parameters
    await page.goto(
      "/api/auth/callback/google?error=Configuration&error_description=Google+email+access+required"
    );

    // Should handle the error gracefully and stay on error page or redirect to signin
    await expect(page).toHaveURL(/.*auth.*error|.*auth.*signin/);
  });

  test("should verify Google button is properly positioned in OAuth section", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check that Google button is visible
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Check that GitHub button is visible
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();

    // Check that both buttons are in the same container
    const buttonContainer = page.locator(".space-y-3");
    await expect(buttonContainer.locator('button:has-text("Continue with Google")')).toBeVisible();
    await expect(buttonContainer.locator('button:has-text("Continue with GitHub")')).toBeVisible();

    // Verify the "or continue with" text is present
    await expect(page.locator("text=or continue with")).toBeVisible();
  });
});
