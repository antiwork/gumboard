import { test, expect } from "../fixtures/test-helpers";

test.describe("Slack Message Formatting", () => {
  test("should include clickable board link in Slack notification", async ({
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

    const textarea = authenticatedPage.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 10000 });

    const testContent = testContext.prefix("Test note content");
    await textarea.fill(testContent);
    await textarea.press("Tab");

    await authenticatedPage.waitForTimeout(1500);

    expect(slackPayload).not.toBeNull();
    expect(slackPayload.text).toBeDefined();

    const expectedLinkPattern = new RegExp(
      `<http://localhost:3000/boards/${board.id}\\|${board.name}>`
    );
    expect(slackPayload.text).toMatch(expectedLinkPattern);
    expect(slackPayload.text).toContain(testContent);
  });
});
