import { test, expect } from "../fixtures/test-helpers";

test.describe("Board Colors", () => {
  test("should create a board with a color from dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await authenticatedPage.goto("/dashboard");
    const boardName = testContext.getBoardName("Colored Test Board");
    const boardDescription = "Test board with color";

    await authenticatedPage.click('button:has-text("Add Board")');

    await authenticatedPage.fill('input[placeholder*="board name"]', boardName);
    await authenticatedPage.fill('input[placeholder*="board description"]', boardDescription);

    await authenticatedPage.click('[data-testid="color-picker-trigger"]');
    await authenticatedPage.click('[data-testid="color-option-0"]');

    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes("/api/boards") && resp.status() === 201
    );

    await authenticatedPage.click('button:has-text("Create Board")');
    await responsePromise;

    await expect(
      authenticatedPage.locator(`[data-slot="card-title"]:has-text("${boardName}")`)
    ).toBeVisible();

    const board = await testPrisma.board.findFirst({
      where: {
        name: boardName,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    expect(board).toBeTruthy();
    expect(board?.name).toBe(boardName);
    expect(board?.description).toBe(boardDescription);
    expect(board?.color).toBeTruthy(); // Should have a color value
    expect(board?.createdBy).toBe(testContext.userId);
  });

  test("should edit board color through board settings", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with initial color
    const initialColor = "#ef4444"; // red
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Color Edit Test"),
        description: testContext.prefix("Board for color editing"),
        color: initialColor,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Open board settings
    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    // Verify current color is displayed
    await expect(authenticatedPage.locator("text=Board settings")).toBeVisible();

    // Change the color (select a different color)
    await authenticatedPage.click('[data-testid="color-picker-trigger"]');
    await authenticatedPage.click('[data-testid="color-option-2"]'); // Different color

    // Save settings
    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await authenticatedPage.click('button:has-text("Save settings")');
    await saveResponse;

    // Verify in database that color changed
    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(updatedBoard?.color).not.toBe(initialColor);
    expect(updatedBoard?.color).toBeTruthy();

    // Verify settings dialog closed
    await expect(authenticatedPage.locator("text=Board settings")).not.toBeVisible();
  });

  test("should clear board color", async ({ authenticatedPage, testContext, testPrisma }) => {
    // Create a board with a color
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Color Clear Test"),
        description: testContext.prefix("Board for color clearing"),
        color: "#10b981", // green
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Open board settings
    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    // Clear the color
    await authenticatedPage.click('[data-testid="color-picker-trigger"]');
    await authenticatedPage.click('[data-testid="color-clear"]');

    // Save settings
    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await authenticatedPage.click('button:has-text("Save settings")');
    await saveResponse;

    // Verify in database that color is cleared
    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(updatedBoard?.color).toBe("");

    // Verify settings dialog closed
    await expect(authenticatedPage.locator("text=Board settings")).not.toBeVisible();
  });

  test("should display board color on dashboard", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create boards with different colors
    const redBoard = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Red Board"),
        description: testContext.prefix("Red colored board"),
        color: "#ef4444",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const blueBoard = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Blue Board"),
        description: testContext.prefix("Blue colored board"),
        color: "#3b82f6",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const noColorBoard = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("No Color Board"),
        description: testContext.prefix("Board without color"),
        color: "",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    await expect(
      authenticatedPage.locator(`[data-slot="card-title"]:has-text("${redBoard.name}")`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`[data-slot="card-title"]:has-text("${blueBoard.name}")`)
    ).toBeVisible();
    await expect(
      authenticatedPage.locator(`[data-slot="card-title"]:has-text("${noColorBoard.name}")`)
    ).toBeVisible();
  });

  test("should preserve board color during other board updates", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    // Create a board with color
    const originalColor = "#8b5cf6"; // purple
    const board = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Color Preserve Test"),
        description: testContext.prefix("Board for color preservation"),
        color: originalColor,
        sendSlackUpdates: true,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto(`/boards/${board.id}`);

    // Open board settings
    await authenticatedPage.click(`button:has(div:has-text("${board.name}"))`);
    await authenticatedPage.click('button:has-text("Board settings")');

    // Update other settings but leave color unchanged
    await authenticatedPage.fill(
      'input[value*="Color Preserve Test"]',
      testContext.getBoardName("Updated Name")
    );

    // Toggle Slack updates
    const slackCheckbox = authenticatedPage.locator("#sendSlackUpdates");
    await slackCheckbox.uncheck();

    // Save settings
    const saveResponse = authenticatedPage.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/boards/${board.id}`) &&
        resp.request().method() === "PUT" &&
        resp.ok()
    );

    await authenticatedPage.click('button:has-text("Save settings")');
    await saveResponse;

    // Verify in database that color is preserved
    const updatedBoard = await testPrisma.board.findUnique({
      where: { id: board.id },
    });
    expect(updatedBoard?.color).toBe(originalColor); // Color should be unchanged
    expect(updatedBoard?.name).toContain("Updated Name");
    expect(updatedBoard?.sendSlackUpdates).toBe(false);
  });
});
