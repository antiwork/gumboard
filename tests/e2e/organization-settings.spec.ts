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

    // Expect error message to appear
    await expect(authenticatedPage.locator("text=Invalid Slack webhook URL")).toBeVisible();

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

  test("should validate organization name and show error for invalid name", async ({
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

    // locate organization name input
    const organizationNameInput = authenticatedPage.locator("#organizationName");
    await organizationNameInput.fill("");

    // Click save button for organization name
    const organizationSaveButton = authenticatedPage
      .locator('button:has-text("Save changes")')
      .nth(1);
    await organizationSaveButton.click();

    // Expect error message to appear
    await expect(authenticatedPage.locator("text=Organization name is required")).toBeVisible();

    // Verify the organization wasn't updated in the database
    const organizationName = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });

    expect(organizationName?.name).toBe("Test Organization");
  });

  test("should allow admin to update the organization name", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const existingOrganizationName = testContext.prefix("Test Organization");
    testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        name: existingOrganizationName,
        slackWebhookUrl: null,
      },
    });

    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // Verify existing URL is loaded
    const organizationNameInput = authenticatedPage.locator("#organizationName");

    // Update the organization name
    const updatedOrganizationName = testContext.prefix("Updated Test Organization");
    await organizationNameInput.fill(updatedOrganizationName);

    // Click save button for organization name
    const organizationSaveButton = authenticatedPage
      .locator('button:has-text("Save changes")')
      .nth(1);

    // Wait for the save request to complete
    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/organization") && resp.request().method() === "PUT" && resp.ok()
    );

    await organizationSaveButton.click();
    await saveResponse;

    // Verify the organization was updated in the database
    const org = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });
    expect(org?.name).toBe(updatedOrganizationName);
  });

  test("should validate the invite team members form and show error for invalid email", async ({
    authenticatedPage,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

     // verify invite input
    const inviteTeamMembersInput = authenticatedPage.locator("#invite-team-members");
    await inviteTeamMembersInput.fill("invalid-email");

    // Click save button for invite team member
    const inviteTeamMemberButton = authenticatedPage.locator("#invite-member");
    await inviteTeamMemberButton.click();

    await expect(authenticatedPage.locator("text=Invalid email address")).toBeVisible();

    const invite = await testPrisma.organizationInvite.findFirst({
      where: {
        email: "invalid-email",
      },
    });

    expect(invite).toBeNull();
  });

  test("should allow sending invites", async ({ authenticatedPage, testPrisma }) => {
    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // verify invite input
    const inviteTeamMembersInput = authenticatedPage.locator("#invite-team-members");
    await inviteTeamMembersInput.fill("test@example.com");

    // Click save button for invite team member
    const inviteTeamMemberButton = authenticatedPage.locator("#invite-member");

    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/organization/invite") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    await inviteTeamMemberButton.click();
    await saveResponse;

    const invite = await testPrisma.organizationInvite.findFirst({
      where: {
        email: "test@example.com",
      },
    });

    expect(invite).not.toBeNull();

    await expect(authenticatedPage.locator("text=Invite sent successfully")).toBeVisible();
    await expect(authenticatedPage.locator("text=test@example.com")).toBeVisible();
  });

  test("should allow cancelling pending invites", async ({ authenticatedPage, testPrisma }) => {
    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    // locate invite team members input
    const inviteTeamMembersInput = authenticatedPage.locator("#invite-team-members");
    await inviteTeamMembersInput.fill("test@example.com");

    // Click save button to send invite
    const inviteTeamMemberButton = authenticatedPage.locator("#invite-member");

    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/organization/invite") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    await inviteTeamMemberButton.click();
    await saveResponse;

    const invite = await testPrisma.organizationInvite.findFirst({
      where: {
        email: "test@example.com",
      },
    });

    expect(invite).not.toBeNull();

    await expect(authenticatedPage.locator("text=Invite sent successfully")).toBeVisible();

    const pendingInvite = authenticatedPage.locator("text=test@example.com");
    await expect(pendingInvite).toBeVisible();

    const cancelInviteButton = authenticatedPage.locator("#cancel-invite");
    await cancelInviteButton.click();

    await expect(pendingInvite).not.toBeVisible();
  });

  test("should validate self serve invite link inputs", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/settings/organization");

    // Wait for page to load
    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();
    const selfServeInviteButton = authenticatedPage.locator("#create-self-serve-invite");
    await expect(selfServeInviteButton).toBeVisible();
    await selfServeInviteButton.click();

    await expect(authenticatedPage.locator("text=Invite name is required")).toBeVisible();
  });

  test("should allow to create self serve invite links", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings/organization");

    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();
    const selfServeInviteNameInput = authenticatedPage.locator("#self-serve-invite-name-input");
    const selfServeInviteExpiresInput = authenticatedPage.locator(
      "#self-serve-invite-expires-input"
    );
    const selfServeInviteUsageLimitInput = authenticatedPage.locator(
      "#self-serve-invite-usage-limit-input"
    );
    await expect(selfServeInviteNameInput).toBeVisible();
    await expect(selfServeInviteExpiresInput).toBeVisible();
    await expect(selfServeInviteUsageLimitInput).toBeVisible();

    const inviteName = testContext.prefix("Test Invite");
    await selfServeInviteNameInput.fill(inviteName);

    await selfServeInviteExpiresInput.fill(new Date().toISOString().split("T")[0]);
    await selfServeInviteUsageLimitInput.fill("10");

    const selfServeInviteButton = authenticatedPage.locator("#create-self-serve-invite");
    await expect(selfServeInviteButton).toBeVisible();

    const selfServeInviteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/organization/self-serve-invites") &&
        resp.request().method() === "POST" &&
        resp.ok()
    );

    await selfServeInviteButton.click();
    await selfServeInviteResponse;

    await expect(authenticatedPage.locator("text=Active Invite Links")).toBeVisible();
    await expect(authenticatedPage.locator("text=Test Invite")).toBeVisible();

    const invite = await testPrisma.organizationSelfServeInvite.findFirst({
      where: {
        name: inviteName,
      },
    });
    expect(invite).not.toBeNull();
  });
});
