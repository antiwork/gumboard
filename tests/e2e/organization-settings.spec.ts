import { test, expect } from "../fixtures/test-helpers";

test.describe("Organization Settings", () => {
  test.beforeEach(async ({ testPrisma, testContext }) => {
    // Make the test user an admin
    await testPrisma.user.update({
      where: { id: testContext.userId },
      data: { isAdmin: true },
    });
  });

  test("should validate Slack webhook URL and show error for invalid URL", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Update organization to have an existing name
    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        name: "Test Organization",
        slackWebhookUrl: null,
      },
    });

    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // Test invalid Slack webhook URL (doesn't contain "slack")
    const slackWebhookInput = authenticatedPage.locator("#slackWebhookUrl");
    await slackWebhookInput.fill("https://hooks.example.com/services/invalid/webhook/url");

    // Click save button for Slack integration
    const slackSaveButton = authenticatedPage.locator('button:has-text("Save changes")').nth(1);
    await slackSaveButton.click();

    // Expect error dialog to appear
    await expect(authenticatedPage.locator("text=Invalid Slack Webhook URL")).toBeVisible();
    await expect(
      authenticatedPage.locator("text=Please enter a valid Slack Webhook URL")
    ).toBeVisible();

    // Close error dialog
    await authenticatedPage.locator('button:has-text("OK")').click();

    // Verify the organization wasn't updated in the database
    const org = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });
    expect(org?.slackWebhookUrl).toBeNull();
  });

  test("should accept valid Slack webhook URL and save successfully", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Update organization to have an existing name
    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        name: "Test Organization",
        slackWebhookUrl: null,
      },
    });

    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // Test valid Slack webhook URL (contains "slack")
    const validSlackUrl =
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";
    const slackWebhookInput = authenticatedPage.locator("#slackWebhookUrl");
    await slackWebhookInput.fill(validSlackUrl);

    // Click save button for Slack integration
    const slackSaveButton = authenticatedPage.locator('button:has-text("Save changes")').nth(1);

    // Wait for the save request to complete
    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/organization") && resp.request().method() === "PUT" && resp.ok()
    );

    await slackSaveButton.click();
    await saveResponse;

    // Verify the organization was updated in the database
    const org = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });
    expect(org?.slackWebhookUrl).toBe(validSlackUrl);

    // Verify the save button becomes disabled after successful save
    await expect(slackSaveButton).toBeDisabled();
  });

  test("should allow clearing Slack webhook URL", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Update organization to have an existing Slack webhook URL
    const existingSlackUrl = "https://hooks.slack.com/services/existing/webhook/url";
    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        name: "Test Organization",
        slackWebhookUrl: existingSlackUrl,
      },
    });

    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // Verify existing URL is loaded
    const slackWebhookInput = authenticatedPage.locator("#slackWebhookUrl");
    await expect(slackWebhookInput).toHaveValue(existingSlackUrl);

    // Clear the Slack webhook URL
    await slackWebhookInput.fill("");

    // Click save button for Slack integration
    const slackSaveButton = authenticatedPage.locator('button:has-text("Save changes")').nth(1);

    // Wait for the save request to complete
    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/organization") && resp.request().method() === "PUT" && resp.ok()
    );

    await slackSaveButton.click();
    await saveResponse;

    // Verify the organization was updated in the database
    const org = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });
    expect(org?.slackWebhookUrl).toBeNull();
  });

  test("should not allow non-admin users to modify Slack webhook URL", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Make the test user NOT an admin
    await testPrisma.user.update({
      where: { id: testContext.userId },
      data: { isAdmin: false },
    });

    // Update organization to have an existing name
    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        name: "Test Organization",
        slackWebhookUrl: null,
      },
    });

    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // Verify Slack webhook input is disabled for non-admin users
    const slackWebhookInput = authenticatedPage.locator("#slackWebhookUrl");
    await expect(slackWebhookInput).toBeDisabled();

    // Verify save button is disabled for non-admin users
    const slackSaveButton = authenticatedPage.locator('button:has-text("Save changes")').nth(1);
    await expect(slackSaveButton).toBeDisabled();

    // Verify tooltip shows admin-only message
    await expect(slackSaveButton).toHaveAttribute(
      "title",
      "Only admins can update organization settings"
    );
  });
});
