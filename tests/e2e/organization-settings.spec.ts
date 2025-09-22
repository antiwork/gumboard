import { test, expect } from "../fixtures/test-helpers";

test.describe("Organization Settings", () => {
  test.beforeEach(async ({ testPrisma, testContext }) => {
    // Make the test user an admin
    await testPrisma.user.update({
      where: { id: testContext.userId },
      data: { isAdmin: true },
    });
  });
  test("should not allow non-admin users to click on connect slack button", async ({
    testPrisma,
    testContext,
    authenticatedPage,
  }) => {
    // Make the test user NOT an admin
    await testPrisma.user.update({
      where: { id: testContext.userId },
      data: { isAdmin: false },
    });

    await authenticatedPage.goto("/settings/organization");

    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();
    const connectSlackButton = authenticatedPage.locator("button:has-text('Connect Slack')");
    await expect(connectSlackButton).toBeVisible();
    await expect(connectSlackButton).toBeDisabled();
  });

  test("should copy invite link and show visual feedback", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const invite = await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: "Test Invite",
        token: "test-token-123",
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        isActive: true,
      },
    });

    await authenticatedPage.goto("/settings/organization");

    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();
    await expect(authenticatedPage.locator("text=Self-Serve Invite Links")).toBeVisible();

    const copyButton = authenticatedPage.locator(`[title="Copy invite link"]`).first();
    await expect(copyButton.locator('svg[data-testid="copy-icon"]')).toBeVisible();

    await authenticatedPage.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    await copyButton.click();
    await expect(authenticatedPage.locator("text=Invite link copied to clipboard!")).toBeVisible();

    const clipboardContent = await authenticatedPage.evaluate(async () => {
      return await navigator.clipboard.readText();
    });
    const baseUrl = new URL(authenticatedPage.url()).origin;
    const expectedInviteLink = `${baseUrl}/join/test-token-123`;
    expect(clipboardContent).toBe(expectedInviteLink);

    await testPrisma.organizationSelfServeInvite.delete({
      where: { id: invite.id },
    });
  });
});
