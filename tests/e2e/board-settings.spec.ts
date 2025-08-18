import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Settings", () => {
  test("should open board settings dialog and display current settings", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with Slack updates enabled
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    await expect(authenticatedPage.locator("text=Board settings")).toBeVisible();
    await expect(
      authenticatedPage.locator(`text=Configure settings for "${board.name}" board.`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('label:has-text("Send updates to Slack")')
    ).toBeVisible();

    const checkbox = authenticatedPage.locator("#sendSlackUpdates");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test("should toggle Slack updates setting and save changes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with Slack updates enabled
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    const checkbox = authenticatedPage.locator("#sendSlackUpdates");
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await authenticatedPage.click('button:has-text("Save settings")');

    const saveSettingsResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );
    await saveSettingsResponse;

    // Verify in database
    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(updatedBoard?.sendSlackUpdates).toBe(false);

    await expect(authenticatedPage.locator("text=Board settings")).not.toBeVisible();
  });

  test("should respect Slack updates setting when creating notes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with Slack updates disabled
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        sendSlackUpdates: false,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    // Mock Slack webhook to detect if notifications are sent
    let slackNotificationSent = false;
    await authenticatedPage.route("https://hooks.slack.com/**", async (route) => {
      slackNotificationSent = true;
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      });
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click('button:has-text("Add Note")');
    const createNoteResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );
    await createNoteResponse;

    // Verify note was created in database
    const notes = await testPrisma.note.findMany({
      where: { boardId: board.id },
    });
    expect(notes).toHaveLength(1);

    // Verify no Slack notification was sent (since sendSlackUpdates is false)
    expect(slackNotificationSent).toBe(false);
  });

  test("should display correct board settings state", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with Slack updates enabled
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Demo Board"),
        description: testContext.prefix("A demo board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    await expect(authenticatedPage.locator("text=Board settings")).toBeVisible();
    await expect(
      authenticatedPage.locator('label:has-text("Send updates to Slack")')
    ).toBeVisible();

    const checkbox = authenticatedPage.locator("#sendSlackUpdates");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test("should cancel board settings changes", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with Slack updates enabled
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    const checkbox = authenticatedPage.locator("#sendSlackUpdates");
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await authenticatedPage.click('button:has-text("Cancel")');

    await expect(authenticatedPage.locator("text=Board settings")).not.toBeVisible();

    // Verify settings were not saved in database
    const unchangedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(unchangedBoard?.sendSlackUpdates).toBe(true);

    // Reopen settings to verify UI reflects unchanged state
    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    await expect(checkbox).toBeChecked();
  });

  test("renders a public board for unauthenticated user", async ({
    page,
    testPrisma,
    testContext,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Public Board"),
        description: testContext.prefix("A public board"),
        isPublic: true,
        sendSlackUpdates: false,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await page.goto(`/public/boards/${board.id}`);

    await expect(page.locator(`text=${board.name}`)).toBeVisible();
    await expect(page.locator("text=Public").first()).toBeVisible();
    await expect(page.locator("text=No notes found")).toBeVisible();
  });

  test("shows not found for private board on public route", async ({
    authenticatedPage,
    testPrisma,
    testContext,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Private Board"),
        description: testContext.prefix("A private board"),
        isPublic: false,
        sendSlackUpdates: false,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/public/boards/${board.id}`);

    await expect(authenticatedPage.locator("text=Board not found")).toBeVisible();
    await expect(
      authenticatedPage.locator("text=This board doesn't exist or is not publicly accessible.")
    ).toBeVisible();
  });
});
