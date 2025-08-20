import { test, expect } from "../fixtures/test-helpers";

test.describe("should allow undoing multiple note", () => {
  test("should allow undoing multiple note deletions", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const boardName = testContext.getBoardName("Test Board");
    const board = await testPrisma.board.create({
      data: {
        name: boardName,
        description: testContext.prefix("Test board description"),
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });

    const note1 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const note2 = await testPrisma.note.create({
      data: {
        color: "#fef3c7",
        boardId: board.id,
        createdBy: testContext.userId,
      },
    });

    const deleteCalls: string[] = [];
    const restoreCalls: string[] = [];

    await authenticatedPage.route(`**/api/boards/${board.id}/notes/**`, async (route) => {
      const req = route.request();
      if (req.method() === "DELETE") {
        deleteCalls.push(req.url());
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else if (req.method() === "POST" && req.url().includes("/restore")) {
        restoreCalls.push(req.url());
        // Simulate slow network so the restore request is still pending when the page reloads
        await new Promise((r) => setTimeout(r, 200));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.goto(`/boards/${board.id}`);
    await authenticatedPage
      .getByRole("button", { name: `Delete Note ${note1.id}`, exact: true })
      .click();
    await authenticatedPage
      .getByRole("button", { name: `Delete Note ${note2.id}`, exact: true })
      .click();

    const undoButtons = authenticatedPage.getByRole("button", { name: "Undo" });
    await expect(undoButtons).toHaveCount(2);

    await undoButtons.first().click();
    await undoButtons.first().click();

    await authenticatedPage.reload({ waitUntil: "domcontentloaded" });

    await expect(
      authenticatedPage.getByRole("button", { name: `Delete Note ${note1.id}`, exact: true })
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole("button", { name: `Delete Note ${note2.id}`, exact: true })
    ).toBeVisible();

    await authenticatedPage.waitForTimeout(500);
    expect(deleteCalls).toHaveLength(0);
    expect(restoreCalls).toHaveLength(2);
  });
});
