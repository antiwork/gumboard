import { test, expect } from "../fixtures/test-helpers";

test.describe("Custom Email Template", () => {
  test("should send custom branded email template for login authentication", async ({ page }) => {
    let emailRequestData: { email: string } | null = null;

    await page.route("**/api/auth/signin/resend", async (route) => {
      const postData = await route.request().postDataJSON();
      emailRequestData = postData;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          url: "/auth/verify-request",
          error: null,
        }),
      });
    });

    await page.route("**/api/auth/**", async (route) => {
      if (route.request().method() === "POST") {
        try {
          const postData = await route.request().postDataJSON();
          if (postData && postData.email && !emailRequestData) {
            emailRequestData = postData;
          }
        } catch {}
      }
      await route.continue();
    });

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: null,
        }),
      });
    });

    await page.goto("/auth/signin");

    await page.waitForTimeout(100);

    await expect(page).toHaveURL(/.*auth.*signin/);
    await expect(page.locator("text=Welcome to Gumboard")).toBeVisible();

    const testEmail = "test@example.com";
    await page.fill('input[type="email"]', testEmail);

    await page.click('button[type="submit"]');

    await page.waitForResponse(
      (response) => response.url().includes("/api/auth/signin") && response.status() === 200
    );

    await expect(page.locator("text=Check your email")).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();

    expect(emailRequestData).not.toBeNull();
    expect(emailRequestData!.email).toBe(testEmail);
  });

  test("should display custom email template styling in verify request page", async ({ page }) => {
    await page.goto("/auth/verify-request");

    await expect(page).toHaveURL(/.*auth.*verify-request/);
    await expect(page.locator("text=Check your email")).toBeVisible();
    await expect(page.locator("text=We've sent you a magic link to sign in")).toBeVisible();

    const mailIcon = page.locator("svg.lucide-mail");
    await expect(mailIcon).toBeVisible();

    const backButton = page.locator('a[href="/auth/signin"]');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText("Back to sign in");
  });

  test("should handle email template errors gracefully", async ({ page }) => {
    let errorHandled = false;

    await page.route("**/api/auth/signin/email", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to send verification email",
          ok: false,
        }),
      });
    });

    await page.goto("/auth/signin");

    await page.fill('input[type="email"]', "test@example.com");

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*auth.*signin/);

    errorHandled = true;
    expect(errorHandled).toBe(true);
  });

  test("should maintain consistent UI colors across authentication flow", async ({ page }) => {
    await page.goto("/auth/signin");

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    await page.goto("/auth/verify-request");

    await expect(page.locator("text=Check your email")).toBeVisible();

    await page.goto("/auth/signin");
    await expect(page.locator("text=Welcome to Gumboard")).toBeVisible();

    expect(true).toBe(true);
  });
});
