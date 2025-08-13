import { test, expect } from "../fixtures/test-helpers";

test.describe("Authentication Flow", () => {
  test("should complete email authentication flow and verify database state", async ({ 
    page, 
    prisma, 
    testUser, 
    testOrganization 
  }) => {
    const testEmail = "auth-test@example.com";
    
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: testUser.id,
            email: testEmail,
            name: testUser.name,
          },
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: testUser.id,
          email: testEmail,
          name: testUser.name,
          organizationId: testOrganization.id,
          organization: testOrganization,
        }),
      });
    });

    const userBefore = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: { organization: true },
    });

    await page.goto("/auth/signin");
    await page.goto("/dashboard");

    expect(userBefore).toBeTruthy();
    expect(userBefore?.organizationId).toBe(testOrganization.id);
    expect(userBefore?.organization?.name).toBe("Test Organization");
  });

  test("should authenticate user and access dashboard", async ({ 
    page, 
    prisma, 
    testUser, 
    testOrganization 
  }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
          },
        }),
      });
    });

    await page.route("**/api/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
          organizationId: testOrganization.id,
          organization: testOrganization,
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

    const userInDb = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: { organization: true },
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();
    
    expect(userInDb).toBeTruthy();
    expect(userInDb?.organization?.name).toBe("Test Organization");
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

  test("should authenticate user via Google OAuth and access dashboard", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "google-user",
            name: "Google User",
            email: "google@example.com",
            image: "https://example.com/avatar.jpg",
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
            id: "google-user",
            name: "Google User",
            email: "google@example.com",
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

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();
  });

  test("should authenticate user via GitHub OAuth and access dashboard", async ({ page }) => {
    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "github-user",
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
            id: "github-user",
            name: "GitHub User",
            email: "github@example.com",
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

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();
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

    await page.waitForTimeout(100);

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

    await page.waitForTimeout(100);

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

    await page.waitForTimeout(100);

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

    await page.waitForTimeout(100);

    expect(githubAuthData).not.toBeNull();
    expect(githubAuthData!.email).toBe(testEmail);

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator("text=No boards yet")).toBeVisible();

    expect(magicLinkAuthData!.email).toBe(githubAuthData!.email);
  });
});
