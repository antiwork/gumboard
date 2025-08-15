import { test, expect } from "../fixtures/test-helpers";

test.describe("Delete User Functionality", () => {
  test("should navigate to settings and display delete account option", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings");

    await expect(authenticatedPage.locator("text=Profile Settings")).toBeVisible();

    await expect(authenticatedPage.locator("text=Danger zone")).toBeVisible();

    const deleteButton = authenticatedPage.locator('button:has-text("Delete account")');
    await expect(deleteButton).toBeVisible();

    await expect(deleteButton.locator("svg")).toBeVisible();
  });

  test("should open delete confirmation dialog with proper warnings", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings");

    const deleteButton = authenticatedPage.locator('button:has-text("Delete account")');
    await deleteButton.click();

    await expect(authenticatedPage.locator("text=Delete account?")).toBeVisible();

    await expect(
      authenticatedPage.locator("text=This will permanently delete your account and related data")
    ).toBeVisible();

    await expect(
      authenticatedPage.locator("text=You will be signed out immediately")
    ).toBeVisible();
    await expect(
      authenticatedPage.locator("text=Your personal profile will be removed")
    ).toBeVisible();

    await expect(authenticatedPage.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(authenticatedPage.locator('button:has-text("Yes, delete")')).toBeVisible();
  });

  test("should cancel delete operation and close dialog", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings");

    const deleteButton = authenticatedPage.locator('button:has-text("Delete account")');
    await deleteButton.click();

    await expect(authenticatedPage.locator("text=Delete account?")).toBeVisible();

    const cancelButton = authenticatedPage.locator('button:has-text("Cancel")');
    await cancelButton.click();

    await expect(authenticatedPage.locator("text=Delete account?")).not.toBeVisible();

    const user = await testPrisma.user.findUnique({
      where: { id: testContext.userId },
    });
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testContext.userEmail);
  });

  test("should successfully delete user account and redirect to signin", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: "Board to be orphaned after user deletion",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        createdBy: testContext.userId,
        boardId: board.id,
      },
    });

    await testPrisma.checklistItem.create({
      data: {
        content: "Test item",
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await testPrisma.organizationInvite.create({
      data: {
        email: "invite@example.com",
        organizationId: testContext.organizationId,
        invitedBy: testContext.userId,
      },
    });

    await testPrisma.organizationSelfServeInvite.create({
      data: {
        name: "Test Self Serve Invite",
        token: "test-token-123",
        organizationId: testContext.organizationId,
        createdBy: testContext.userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const userBeforeDeletion = await testPrisma.user.findUnique({
      where: { id: testContext.userId },
    });
    expect(userBeforeDeletion).not.toBeNull();

    await authenticatedPage.goto("/settings");

    const deleteButton = authenticatedPage.locator('button:has-text("Delete account")');
    await deleteButton.click();

    const confirmButton = authenticatedPage.locator('button:has-text("Yes, delete")');

    const deleteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/user") && resp.request().method() === "DELETE" && resp.ok()
    );

    await confirmButton.click();
    await deleteResponse;

    // Should redirect to home page after successful deletion
    await expect(authenticatedPage).toHaveURL(/^\/$|.*localhost:3000\/$/, { timeout: 10000 });

    const userAfterDeletion = await testPrisma.user.findUnique({
      where: { id: testContext.userId },
    });
    expect(userAfterDeletion).toBeNull();

    const sessionAfterDeletion = await testPrisma.session.findFirst({
      where: { userId: testContext.userId },
    });
    expect(sessionAfterDeletion).toBeNull();

    // Verify organization invites created by user are deleted
    const invitesAfterDeletion = await testPrisma.organizationInvite.findMany({
      where: { invitedBy: testContext.userId },
    });
    expect(invitesAfterDeletion).toHaveLength(0);

    const selfServeInvitesAfterDeletion = await testPrisma.organizationSelfServeInvite.findMany({
      where: { createdBy: testContext.userId },
    });
    expect(selfServeInvitesAfterDeletion).toHaveLength(0);

    const boardAfterDeletion = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(boardAfterDeletion).not.toBeNull(); // Board should still exist

    const noteAfterDeletion = await testPrisma.note.findUnique({
      where: { id: note.id },
    });
    expect(noteAfterDeletion).toBeNull(); // Note should be cascade deleted
  });

  test("should show loading state during deletion", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.route("**/api/user", async (route) => {
      if (route.request().method() === "DELETE") {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Reduced from 3000 to 2000
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.goto("/settings");

    const deleteButton = authenticatedPage.locator('button:has-text("Delete account")');
    await deleteButton.click();

    const confirmButton = authenticatedPage.locator('button:has-text("Yes, delete")');

    await confirmButton.click();

    // Check loading state appears
    await expect(authenticatedPage.locator('button:has-text("Deleting...")')).toBeVisible({
      timeout: 1000,
    });

    const loadingButton = authenticatedPage.locator('button:has-text("Deleting...")');
    await expect(loadingButton).toBeDisabled();

    // Wait for the loading to complete - this should redirect
    // Due to the mock, we might not get the full deletion flow, so just verify loading state works
    // The redirect test is covered in the other test that does real deletion
    await authenticatedPage.waitForTimeout(3000); // Wait for mock response to complete
  });

  test("should handle delete API error gracefully", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.route("**/api/user", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.goto("/settings");

    const deleteButton = authenticatedPage.locator('button:has-text("Delete account")');
    await deleteButton.click();

    const confirmButton = authenticatedPage.locator('button:has-text("Yes, delete")');

    const errorResponsePromise = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/user") &&
        resp.request().method() === "DELETE" &&
        resp.status() === 500
    );

    await confirmButton.click();

    await errorResponsePromise;

    await authenticatedPage.waitForTimeout(1000);

    await expect(authenticatedPage).toHaveURL(/.*settings/);

    const userAfterFailedDeletion = await testPrisma.user.findUnique({
      where: { id: testContext.userId },
    });
    expect(userAfterFailedDeletion).not.toBeNull();

    await expect(authenticatedPage.locator("text=Profile Settings")).toBeVisible();

    await expect(authenticatedPage.locator('button:has-text("Delete account")')).toBeVisible();
  });

  test("should require authentication for delete operation", async ({
    page,
    testContext,
    testPrisma,
  }) => {
    const response = await page.request.delete("/api/user");
    expect(response.status()).toBe(401);

    const responseBody = await response.json();
    expect(responseBody.error).toBe("Unauthorized");

    const user = await testPrisma.user.findUnique({
      where: { id: testContext.userId },
    });
    expect(user).not.toBeNull();
  });

  test("should not allow user to delete themselves from organization members list", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings/organization");

    await expect(authenticatedPage.locator("text=Organization Settings")).toBeVisible();

    await expect(
      authenticatedPage.getByRole("heading", { name: "Team Members", exact: true })
    ).toBeVisible();

    const currentUserRow = authenticatedPage.locator(`text=${testContext.userEmail}`).locator("..");
    await expect(currentUserRow).toBeVisible();

    const deleteButtonInRow = currentUserRow.locator('button[title*="Remove"]');
    await expect(deleteButtonInRow).not.toBeVisible();
  });
});
