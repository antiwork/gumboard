import { test, expect } from "../fixtures/test-helpers";

test.describe("Profile settings", () => {
  test("should display current user information", async ({ authenticatedPage, testContext }) => {
    await authenticatedPage.goto("/settings");

    const expectedName = `Test User ${testContext.testId}`;
    await expect(authenticatedPage.locator("#name")).toHaveValue(expectedName);
    const emailField = authenticatedPage.locator("#email");
    await expect(emailField).toHaveValue(testContext.userEmail);
    await expect(emailField).toBeDisabled();

    const saveButton = authenticatedPage.locator('button:has-text("Save Changes")');
    await expect(saveButton).toBeDisabled();
  });

  test("should keep save button disabled when name is empty", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/settings");

    const nameInput = authenticatedPage.locator("#name");
    await nameInput.fill("");

    const saveButton = authenticatedPage.locator('button:has-text("Save Changes")');
    await expect(saveButton).toBeDisabled();
  });

  test("should enable save button when name changes and disable when reverted", async ({
    authenticatedPage,
    testContext,
  }) => {
    await authenticatedPage.goto("/settings");

    const nameInput = authenticatedPage.locator("#name");
    const saveButton = authenticatedPage.locator('button:has-text("Save Changes")');

    await nameInput.fill(`Another Name ${testContext.testId}`);
    await expect(saveButton).toBeEnabled();

    await nameInput.fill(`Test User ${testContext.testId}`);
    await expect(saveButton).toBeDisabled();
  });

  test("should keep save button disabled when name only adds whitespace", async ({
    authenticatedPage,
    testContext,
  }) => {
    await authenticatedPage.goto("/settings");

    const nameInput = authenticatedPage.locator("#name");
    await nameInput.fill(`  Test User ${testContext.testId}  `);

    const saveButton = authenticatedPage.locator('button:has-text("Save Changes")');
    await expect(saveButton).toBeDisabled();
  });

  test("should update user name and disable save button after saving", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/settings");

    const newName = `Updated User ${testContext.testId}`;

    const nameInput = authenticatedPage.locator("#name");
    await nameInput.fill(newName);

    const saveButton = authenticatedPage.locator('button:has-text("Save Changes")');
    await expect(saveButton).toBeEnabled();

    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/user/profile") && resp.request().method() === "PUT" && resp.ok()
    );

    await saveButton.click();
    await saveResponse;

    await expect(saveButton).toBeDisabled();

    const user = await testPrisma.user.findUnique({
      where: { id: testContext.userId },
    });
    expect(user?.name).toBe(newName);
  });
});
