import { test, expect } from "../fixtures/test-helpers";

test.describe("Dashboard Board Toolbar", () => {
  test("should sort boards by title alphabetically", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardNames = ["Zebra Board", "Alpha Board", "Beta Board"];

    for (const name of boardNames) {
      await testPrisma.board.create({
        data: {
          name: testContext.getBoardName(name),
          description: "Test board",
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
    }

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage.locator('[data-testid="board-card"]').first()).toBeVisible();

    await authenticatedPage.locator('[role="combobox"]').first().click();
    await authenticatedPage.locator('[role="option"]', { hasText: "Alphabetical (A–Z)" }).click();

    const boardTitles = await authenticatedPage
      .locator('[data-testid="board-card"] [data-slot="card-title"]')
      .allTextContents();
    const expectedOrder = [
      testContext.getBoardName("Alpha Board"),
      testContext.getBoardName("Beta Board"),
      testContext.getBoardName("Zebra Board"),
    ];

    for (let i = 0; i < expectedOrder.length; i++) {
      expect(boardTitles[i]).toBe(expectedOrder[i]);
    }
  });

  test("should sort boards by notes count", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const board1 = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Board One"),
        description: "Test board with 1 note",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const board2 = await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Board Two"),
        description: "Test board with 3 notes",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board1.id,
        createdBy: testContext.userId,
      },
    });

    for (let i = 0; i < 3; i++) {
      await testPrisma.note.create({
        data: {
          color: "#fef3c7",
          boardId: board2.id,
          createdBy: testContext.userId,
        },
      });
    }

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage.locator('[data-testid="board-card"]').first()).toBeVisible();

    await authenticatedPage.locator('[role="combobox"]').first().click();
    await authenticatedPage.locator('[role="option"]', { hasText: "Notes (most)" }).click();

    const firstBoardTitle = await authenticatedPage
      .locator('[data-testid="board-card"] [data-slot="card-title"]')
      .first()
      .textContent();
    expect(firstBoardTitle).toBe(testContext.getBoardName("Board Two"));
  });

  test("should filter boards by tags", async ({ authenticatedPage, testContext, testPrisma }) => {
    await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Project Board"),
        description: "Test board with project tag",
        tags: ["project", "work"],
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Personal Board"),
        description: "Test board with personal tag",
        tags: ["personal", "home"],
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Mixed Board"),
        description: "Test board with mixed tags",
        tags: ["project", "personal"],
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage.locator('[data-testid="board-card"]').first()).toBeVisible();

    await expect(authenticatedPage.locator('[data-testid="board-card"]')).toHaveCount(3);

    await authenticatedPage.locator("button", { hasText: "All tags" }).click();

    await authenticatedPage.locator("label", { hasText: "project" }).click();

    await authenticatedPage.locator("body").click();

    await expect(authenticatedPage.locator('[data-testid="board-card"]')).toHaveCount(2);

    await expect(
      authenticatedPage.locator('[data-slot="card-title"]', {
        hasText: testContext.getBoardName("Project Board"),
      })
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-slot="card-title"]', {
        hasText: testContext.getBoardName("Mixed Board"),
      })
    ).toBeVisible();
    await expect(
      authenticatedPage.locator('[data-slot="card-title"]', {
        hasText: testContext.getBoardName("Personal Board"),
      })
    ).not.toBeVisible();
  });

  test("should create board with tags", async ({ authenticatedPage, testContext, testPrisma }) => {
    await authenticatedPage.goto("/dashboard");

    const boardName = testContext.getBoardName("Tagged Board");
    const boardDescription = "Board with tags";
    const tags = "urgent, project, frontend";

    await authenticatedPage.click('button:has-text("Add Board")');
    await authenticatedPage.fill('input[placeholder*="board name"]', boardName);
    await authenticatedPage.fill('input[placeholder*="board description"]', boardDescription);
    await authenticatedPage.fill('input[placeholder*="tags"]', tags);

    const responsePromise = authenticatedPage.waitForResponse(
      (resp) => resp.url().includes("/api/boards") && resp.status() === 201
    );

    await authenticatedPage.click('button:has-text("Create Board")');
    await responsePromise;

    const board = await testPrisma.board.findFirst({
      where: {
        name: boardName,
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    expect(board).toBeTruthy();
    expect(board?.tags).toEqual(["urgent", "project", "frontend"]);
  });

  test("should show result count and clear filters", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    for (let i = 0; i < 5; i++) {
      await testPrisma.board.create({
        data: {
          name: testContext.getBoardName(`Board ${i + 1}`),
          description: "Test board",
          tags: i < 2 ? ["important"] : ["regular"],
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });
    }

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage.locator('[data-testid="board-card"]').first()).toBeVisible();

    await expect(authenticatedPage.getByText("5 boards")).toBeVisible();

    await authenticatedPage.locator("button", { hasText: "All tags" }).click();
    await authenticatedPage.locator("label", { hasText: "important" }).click();
    await authenticatedPage.locator("body").click();

    await expect(authenticatedPage.getByText("2 of 5 boards")).toBeVisible();

    await expect(authenticatedPage.locator("button", { hasText: "Clear filters" })).toBeVisible();

    await authenticatedPage.locator("button", { hasText: "Clear filters" }).click();

    await expect(authenticatedPage.getByText("5 boards")).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="board-card"]')).toHaveCount(5);
  });

  test("should persist sort and filter state in URL", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    await testPrisma.board.create({
      data: {
        name: testContext.getBoardName("Test Board"),
        description: "Test board",
        tags: ["work"],
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    await authenticatedPage.goto("/dashboard");

    await expect(authenticatedPage.locator('[data-testid="board-card"]').first()).toBeVisible();

    await authenticatedPage.locator('[role="combobox"]').first().click();
    await authenticatedPage.locator('[role="option"]', { hasText: "Alphabetical (A–Z)" }).click();

    await authenticatedPage.locator("button", { hasText: "All tags" }).click();
    await authenticatedPage.locator("label", { hasText: "work" }).click();
    await authenticatedPage.locator("body").click();

    expect(authenticatedPage.url()).toContain("sort=title");
    expect(authenticatedPage.url()).toContain("tags=work");

    await authenticatedPage.reload();

    await expect(authenticatedPage.locator('[role="combobox"]').first()).toContainText(
      "Alphabetical (A–Z)"
    );
    await expect(authenticatedPage.getByText("1 boards")).toBeVisible();
  });
});
