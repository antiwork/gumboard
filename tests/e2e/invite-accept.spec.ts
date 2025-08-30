import { test as base, expect } from "../fixtures/test-helpers";

// Extend base test with inviteToken fixture that seeds an invite before each scenario
const test = base.extend<{ inviteToken: string }>({
  inviteToken: async ({ testContext, testPrisma }, use) => {
    // Create a separate organization and user to send the invite
    const inviterOrgId = testContext.prefix("invite-org");
    const inviterUserId = testContext.prefix("invite-user");

    await testPrisma.organization.create({
      data: {
        id: inviterOrgId,
        name: `Invite Org ${testContext.testId}`,
      },
    });

    await testPrisma.user.create({
      data: {
        id: inviterUserId,
        email: `inviter-${testContext.testId}@example.com`,
        name: "Inviter User",
        organizationId: inviterOrgId,
      },
    });

    const invite = await testPrisma.organizationInvite.create({
      data: {
        email: testContext.userEmail,
        organizationId: inviterOrgId,
        invitedBy: inviterUserId,
      },
    });

    await use(invite.id);
  },
});

test.describe("Invite Acceptance", () => {
  test("accepting a valid invite redirects to dashboard", async ({
    authenticatedPage,
    inviteToken,
  }) => {
    await authenticatedPage.goto(`/invite/accept?token=${inviteToken}`);
    const acceptButton = authenticatedPage.locator('button:has-text("Accept Invitation")');

    await Promise.all([authenticatedPage.waitForURL(/.*dashboard/), acceptButton.click()]);

    await expect(authenticatedPage).toHaveURL(/.*dashboard/);
  });

  test("declining marks invite declined", async ({
    authenticatedPage,
    inviteToken,
    testPrisma,
  }) => {
    await authenticatedPage.goto(`/invite/accept?token=${inviteToken}`);
    const declineButton = authenticatedPage.locator('button:has-text("Decline Invitation")');

    await Promise.all([authenticatedPage.waitForURL(/.*dashboard/), declineButton.click()]);

    const invite = await testPrisma.organizationInvite.findUnique({ where: { id: inviteToken } });
    expect(invite?.status).toBe("DECLINED");
  });

  test("invalid or expired tokens show error card", async ({ authenticatedPage, inviteToken }) => {
    // inviteToken fixture seeds the database even though we use an invalid token in the URL
    await authenticatedPage.goto(`/invite/accept?token=invalid-token`);
    await expect(authenticatedPage.locator("text=Invalid Invitation")).toBeVisible();
  });
});
