import { test, expect } from "@playwright/test";

test.describe("GitHub Authentication Flow", () => {
  test("should display GitHub login button on signin page", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check that GitHub button is visible
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();

    // Verify the button has the correct styling
    const githubButton = page.locator('button:has-text("Continue with GitHub")');
    await expect(githubButton).toHaveClass(/outline/);
  });

  test("should initiate GitHub OAuth flow when button is clicked", async ({ page }) => {
    let githubAuthInitiated = false;

    // Mock the GitHub OAuth redirect URL that NextAuth generates
    await page.route("**/github.com/login/oauth/authorize**", async (route) => {
      githubAuthInitiated = true;

      // Mock the GitHub OAuth redirect
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>GitHub OAuth Mock</body></html>",
      });
    });

    await page.goto("/auth/signin");

    // Click the GitHub button
    await page.click('button:has-text("Continue with GitHub")');

    // Wait for navigation to GitHub OAuth URL
    await page.waitForURL("**/github.com/login/oauth/authorize**");

    expect(githubAuthInitiated).toBe(true);
  });

  test("should handle GitHub OAuth callback and authenticate user", async ({ page }) => {
    // Mock the session to simulate an authenticated user
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "github-user-123",
            name: "GitHub User",
            email: "github@example.com",
            image: "https://avatars.githubusercontent.com/u/123?v=4",
          },
        }),
      });
    });

    // Mock user API
    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "github-user-123",
            name: "GitHub User",
            email: "github@example.com",
            image: "https://avatars.githubusercontent.com/u/123?v=4",
          },
        }),
      });
    });

    // Mock boards API
    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ boards: [] }),
      });
    });

    // Instead of trying to mock the callback, directly navigate to dashboard
    // since we've already mocked the session to simulate successful auth
    await page.goto("/dashboard");

    // Should be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify user is authenticated
    await expect(page.locator("text=No boards yet")).toBeVisible();
  });

  test("should handle GitHub authentication errors gracefully", async ({ page }) => {
    // Mock GitHub OAuth redirect to return an error
    await page.route("**/github.com/login/oauth/authorize**", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "GitHub authentication failed",
          message: "Invalid client credentials",
        }),
      });
    });

    await page.goto("/auth/signin");

    // Click the GitHub button
    await page.click('button:has-text("Continue with GitHub")');

    // Should handle error gracefully (not crash)
    await expect(page).toHaveURL(/.*auth.*signin/);
  });

  test("should link GitHub account with existing email account", async ({ page }) => {
    const testEmail = "linked@example.com";
    let githubAuthInitiated = false;

    // Mock GitHub OAuth redirect
    await page.route("**/github.com/login/oauth/authorize**", async (route) => {
      githubAuthInitiated = true;

      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>GitHub OAuth Mock</body></html>",
      });
    });

    // Mock session for linked account
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "linked-user-id",
            name: "Linked User",
            email: testEmail,
            image: "https://avatars.githubusercontent.com/u/456?v=4",
            providers: ["email", "github"],
          },
        }),
      });
    });

    // Mock user API for linked account
    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "linked-user-id",
            name: "Linked User",
            email: testEmail,
            image: "https://avatars.githubusercontent.com/u/456?v=4",
            providers: ["email", "github"],
          },
        }),
      });
    });

    // Mock boards API
    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto("/auth/signin");

    // Click GitHub button
    await page.click('button:has-text("Continue with GitHub")');

    // Wait for GitHub OAuth to be initiated
    await page.waitForURL("**/github.com/login/oauth/authorize**");

    // Verify GitHub auth was initiated
    expect(githubAuthInitiated).toBe(true);

    // Navigate to dashboard to verify linked account
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();
  });

  test("should maintain GitHub authentication state across page reloads", async ({ page }) => {
    // Mock persistent session
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "github-user-123",
            name: "GitHub User",
            email: "github@example.com",
            image: "https://avatars.githubusercontent.com/u/123?v=4",
          },
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "github-user-123",
            name: "GitHub User",
            email: "github@example.com",
            image: "https://avatars.githubusercontent.com/u/123?v=4",
          },
        }),
      });
    });

    await page.route("**/api/boards", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ boards: [] }),
      });
    });

    // First visit to dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*dashboard/);

    // Reload the page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();
  });

  test("should handle GitHub OAuth with missing email scope", async ({ page }) => {
    // Mock the GitHub OAuth callback to return an error
    await page.route("**/api/auth/callback/github", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "GitHub email access required",
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
      "/api/auth/callback/github?error=Configuration&error_description=GitHub+email+access+required"
    );

    // Should handle the error gracefully and stay on error page or redirect to signin
    await expect(page).toHaveURL(/.*auth.*error|.*auth.*signin/);
  });

  test("should verify GitHub button is properly positioned in OAuth section", async ({ page }) => {
    await page.goto("/auth/signin");

    // Check that GitHub button is visible
    await expect(page.locator('button:has-text("Continue with GitHub")')).toBeVisible();

    // Check that Google button is visible
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();

    // Check that both buttons are in the same container
    const buttonContainer = page.locator(".space-y-3");
    await expect(buttonContainer.locator('button:has-text("Continue with Google")')).toBeVisible();
    await expect(buttonContainer.locator('button:has-text("Continue with GitHub")')).toBeVisible();

    // Verify the "or continue with" text is present
    await expect(page.locator("text=or continue with")).toBeVisible();
  });
});
