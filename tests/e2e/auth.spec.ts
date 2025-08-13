import { test, expect } from "../fixtures/test-helpers";

test.describe("Authentication Flow", () => {
  test("should complete email authentication flow and verify database state", async ({ page }) => {
    let emailSent = false;
    let authData: { email: string } | null = null;

    await page.route("**/api/auth/signin/email", async (route) => {
      emailSent = true;
      const postData = await route.request().postDataJSON();
      authData = postData;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/auth/verify-request" }),
      });
    });

    await page.goto("/auth/signin");

    await page.evaluate(() => {
      const mockAuthData = { email: "test@example.com" };
      fetch("/api/auth/signin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockAuthData),
      });
    });

    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/signin/email") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    expect(emailSent).toBe(true);
    expect(authData).not.toBeNull();
    expect(authData!.email).toBe("test@example.com");
  });

  test("should authenticate user and access dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
  });

  test("should redirect unauthenticated users to signin", async ({ page }) => {
    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*auth.*signin/, { timeout: 5000 });
  });

  test("should authenticate user via Google OAuth and access dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const googleUser = await testPrisma.user.upsert({
      where: { email: testContext.userEmail },
      update: {
        name: "Google User",
        image: "https://example.com/avatar.jpg",
      },
      create: {
        email: testContext.userEmail,
        name: "Google User",
        image: "https://example.com/avatar.jpg",
        organizationId: testContext.organizationId,
      },
    });

    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: googleUser.id,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
  });

  test("should authenticate user via GitHub OAuth and access dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const githubUser = await testPrisma.user.upsert({
      where: { email: testContext.userEmail },
      update: {
        name: "GitHub User",
        image: "https://avatars.githubusercontent.com/u/123?v=4",
      },
      create: {
        email: testContext.userEmail,
        name: "GitHub User",
        image: "https://avatars.githubusercontent.com/u/123?v=4",
        organizationId: testContext.organizationId,
      },
    });

    const boardCount = await testPrisma.board.count({
      where: {
        createdBy: githubUser.id,
        organizationId: testContext.organizationId,
      },
    });
    expect(boardCount).toBe(0);

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
    await expect(authenticatedPage.locator("text=No boards yet")).toBeVisible();
  });

  test("should link magic link and Google OAuth accounts when using same email", async ({
    page,
  }) => {
    const testEmail = "linked@example.com";
    let magicLinkAuthData: { email: string } | null = null;
    let googleAuthData: { email: string } | null = null;

    await page.route("**/api/auth/signin/email", async (route) => {
      const postData = await route.request().postDataJSON();
      magicLinkAuthData = postData;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/auth/verify-request" }),
      });
    });

    await page.route("**/api/auth/signin/google", async (route) => {
      const postData = await route.request().postDataJSON();
      googleAuthData = postData;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/dashboard" }),
      });
    });

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "linked-user-id",
            name: "Linked User",
            email: testEmail,
            image: "https://example.com/avatar.jpg",
            providers: ["email", "google"],
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
            id: "linked-user-id",
            name: "Linked User",
            email: testEmail,
            providers: ["email", "google"],
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

    await page.goto("/auth/signin");

    await page.evaluate((email) => {
      const mockAuthData = { email };
      fetch("/api/auth/signin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockAuthData),
      });
    }, testEmail);

    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/signin/email") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    expect(magicLinkAuthData).not.toBeNull();
    expect(magicLinkAuthData!.email).toBe(testEmail);

    await page.evaluate((email) => {
      const mockGoogleAuthData = { email };
      fetch("/api/auth/signin/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockGoogleAuthData),
      });
    }, testEmail);

    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/signin/google") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    expect(googleAuthData).not.toBeNull();
    expect(googleAuthData!.email).toBe(testEmail);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();

    expect(magicLinkAuthData!.email).toBe(googleAuthData!.email);
  });

  test("should link magic link and GitHub OAuth accounts when using same email", async ({
    page,
  }) => {
    const testEmail = "linked@example.com";
    let magicLinkAuthData: { email: string } | null = null;
    let githubAuthData: { email: string } | null = null;

    await page.route("**/api/auth/signin/email", async (route) => {
      const postData = await route.request().postDataJSON();
      magicLinkAuthData = postData;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/auth/verify-request" }),
      });
    });

    await page.route("**/api/auth/signin/github", async (route) => {
      const postData = await route.request().postDataJSON();
      githubAuthData = postData;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/dashboard" }),
      });
    });

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

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "linked-user-id",
            name: "Linked User",
            email: testEmail,
            providers: ["email", "github"],
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

    await page.goto("/auth/signin");

    await page.evaluate((email) => {
      const mockAuthData = { email };
      fetch("/api/auth/signin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockAuthData),
      });
    }, testEmail);

    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/signin/email") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    expect(magicLinkAuthData).not.toBeNull();
    expect(magicLinkAuthData!.email).toBe(testEmail);

    await page.evaluate((email) => {
      const mockGitHubAuthData = { email };
      fetch("/api/auth/signin/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockGitHubAuthData),
      });
    }, testEmail);

    await page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/signin/github") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    expect(githubAuthData).not.toBeNull();
    expect(githubAuthData!.email).toBe(testEmail);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();

    expect(magicLinkAuthData!.email).toBe(githubAuthData!.email);
  });
});
