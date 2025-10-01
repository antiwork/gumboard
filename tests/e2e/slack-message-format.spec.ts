import { test, expect } from "../fixtures/test-helpers";

test.describe("Slack Message Formatting", () => {
  test("should include clickable board link when creating a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: testContext.prefix("A test board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const org = await testPrisma.organization.findUnique({
      where: { id: testContext.organizationId },
    });

    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        slackWebhookUrl: "https://hooks.slack.com/services/TEST/WEBHOOK/URL",
      },
    });

    let slackPayload: any = null;
    await authenticatedPage.route("https://hooks.slack.com/**", async (route) => {
      const request = route.request();
      slackPayload = JSON.parse(request.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      });
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    await authenticatedPage.click('button:has-text("Add Note")');

    await authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}/notes`) &&
        resp.request().method() === "POST" &&
        resp.status() === 201
    );

    await authenticatedPage.waitForTimeout(1000);

    expect(slackPayload).not.toBeNull();
    expect(slackPayload.text).toBeDefined();

    const expectedLinkPattern = new RegExp(
      `<http://localhost:3000/boards/${board.id}\\|${board.name}>`
    );
    expect(slackPayload.text).toMatch(expectedLinkPattern);
  });

  test("should include clickable board link when completing a todo item", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Todo Board"),
        description: testContext.prefix("A todo board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        slackWebhookUrl: "https://hooks.slack.com/services/TEST/WEBHOOK/URL",
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fff2a8",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const checklistItem = await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Test todo item"),
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    let slackPayload: any = null;
    await authenticatedPage.route("https://hooks.slack.com/**", async (route) => {
      const request = route.request();
      slackPayload = JSON.parse(request.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      });
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const checkbox = authenticatedPage
      .getByTestId(checklistItem.id)
      .locator('input[type="checkbox"]');
    await checkbox.check();

    await authenticatedPage.waitForTimeout(1000);

    expect(slackPayload).not.toBeNull();
    expect(slackPayload.text).toBeDefined();

    const expectedLinkPattern = new RegExp(
      `<http://localhost:3000/boards/${board.id}\\|${board.name}>`
    );
    expect(slackPayload.text).toMatch(expectedLinkPattern);
    expect(slackPayload.text).toContain(":white_check_mark:");
  });

  test("should include clickable board link when archiving a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Archive Board"),
        description: testContext.prefix("An archive board"),
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.organization.update({
      where: { id: testContext.organizationId },
      data: {
        slackWebhookUrl: "https://hooks.slack.com/services/TEST/WEBHOOK/URL",
      },
    });

    const note = await testPrisma.note.create({
      data: {
        color: "#fff2a8",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const checklistItem = await testPrisma.checklistItem.create({
      data: {
        content: testContext.prefix("Note to archive"),
        checked: false,
        order: 0,
        noteId: note.id,
      },
    });

    await testPrisma.note.update({
      where: { id: note.id },
      data: {
        slackMessageId: "test-message-id",
      },
    });

    let slackPayload: any = null;
    await authenticatedPage.route("https://hooks.slack.com/**", async (route) => {
      const request = route.request();
      slackPayload = JSON.parse(request.postData() || "{}");
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "ok",
      });
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    const noteElement = authenticatedPage.getByTestId(note.id);
    await noteElement.hover();

    const archiveButton = noteElement.getByRole("button", { name: "Archive" });
    await archiveButton.click();

    await authenticatedPage.waitForTimeout(1000);

    expect(slackPayload).not.toBeNull();
    expect(slackPayload.text).toBeDefined();

    const expectedLinkPattern = new RegExp(
      `<http://localhost:3000/boards/${board.id}\\|${board.name}>`
    );
    expect(slackPayload.text).toMatch(expectedLinkPattern);
    expect(slackPayload.text).toContain(":white_check_mark:");
  });
});
