import { test, expect } from "../fixtures/test-helpers";

test.describe("Join Organization", () => {
  test("should show invalid invitation error for non-existent token", async ({ page }) => {
    await page.goto("/join/non-existent-token");
    await expect(page.locator("text=Invalid Invitation")).toBeVisible();
    await expect(
      page.locator("text=This invitation link is invalid or has expired.")
    ).toBeVisible();
  });

  test("should show expired invitation error", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const expiredInvite = await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: `Expired Invite ${testContext.testId}`,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        isActive: true,
        usageLimit: 5,
        usageCount: 0,
        token: `expired_token_${testContext.testId}`,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
      },
    });

    await authenticatedPage.goto(`/join/${expiredInvite.token}`);
    await expect(authenticatedPage.locator("text=This invitation expired on")).toBeVisible();
  });

  test("should show usage limit reached error", async ({ page, testContext, testPrisma }) => {
    const limitReachedInvite = await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: `Limit Reached Invite ${testContext.testId}`,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        isActive: true,
        usageLimit: 2,
        usageCount: 2, // Limit reached
        token: `limit_reached_token_${testContext.testId}`,
      },
    });

    await page.goto(`/join/${limitReachedInvite.token}`);

    await expect(page.locator("text=Invitation Limit Reached")).toBeVisible();
    await expect(
      page.locator("text=This invitation has reached its maximum usage limit of 2 uses.")
    ).toBeVisible();
  });

  test("should show join form for unauthenticated users", async ({
    page,
    testContext,
    testPrisma,
  }) => {
    const validInvite = await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: `Valid Invite ${testContext.testId}`,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        isActive: true,
        usageLimit: 5,
        usageCount: 0,
        token: `valid_token_${testContext.testId}`,
      },
    });

    // Get organization name for the test
    const organization = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });

    await page.goto(`/join/${validInvite.token}`);

    // Should show the join form
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator("text=Already have an account?")).toBeVisible();
  });

  test("should show join confirmation for authenticated users not in organization", async ({
    page,
    testContext,
    testPrisma,
  }) => {
    // Create a different organization for the invite
    const org = await testPrisma.organization.create({
      data: {
        id: `new_org_${testContext.testId}`,
        name: `Org ${testContext.testId}`,
      },
    });

    const user = await testPrisma.user.create({
      data: {
        id: `user_${testContext.testId}`,
        email: `user_${testContext.testId}@example.com`,
      },
    });

    // Create session for this user
    const sessionToken = `session_${testContext.testId}`;
    await testPrisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const validInvite = await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: `Org Invite ${testContext.testId}`,
        organizationId: org.id,
        createdBy: testContext.userId,
        isActive: true,
        usageLimit: 5,
        usageCount: 0,
        token: `org_token_${testContext.testId}`,
      },
    });

    // Set the session cookie
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto(`/join/${validInvite.token}`);

    // Should show join confirmation (since user is authenticated but not in the target org)
    await expect(page.locator(`text=Join ${org.name} on Gumboard!`)).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("should show already in organization error for authenticated users", async ({
    page,
    testContext,
    testPrisma,
  }) => {
    // Create user in a different organization
    const otherOrg = await testPrisma.organization.create({
      data: {
        id: `other_org_${testContext.testId}`,
        name: `Other Org ${testContext.testId}`,
      },
    });

    const user = await testPrisma.user.create({
      data: {
        id: `user_in_other_org_${testContext.testId}`,
        email: `user_in_other_org_${testContext.testId}@example.com`,
        organizationId: otherOrg.id,
      },
    });

    // Create session for this user
    const sessionToken = `session_${testContext.testId}_other_org`;
    await testPrisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create invite for the test organization (different from user's org)
    const validInvite = await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: `Test Org Invite ${testContext.testId}`,
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        isActive: true,
        usageLimit: 5,
        usageCount: 0,
        token: `test_org_token_${testContext.testId}`,
      },
    });

    // Set the session cookie
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto(`/join/${validInvite.token}`);

    // Should show already in organization error
    await expect(page.locator("text=Already in Organization")).toBeVisible();
    await expect(page.locator(`text=You are already a member of ${otherOrg.name}`)).toBeVisible();
  });
});
