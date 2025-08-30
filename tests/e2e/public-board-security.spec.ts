import { test, expect } from "../fixtures/test-helpers";

test.describe("Public Board Security", () => {
  test.describe("Data Leakage Prevention", () => {
    test("should not expose sensitive organization member data in public board API", async ({
      page,
      testPrisma,
      testContext,
    }) => {
      // Create a public board with notes
      const board = await testPrisma.board.create({
        data: {
          name: testContext.getBoardName("Public Security Test Board"),
          description: testContext.prefix("Testing data leakage prevention"),
          isPublic: true,
          sendSlackUpdates: false,
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Create a note with content
      await testPrisma.note.create({
        data: {
          boardId: board.id,
          createdBy: testContext.userId,
          color: "#yellow",
          checklistItems: {
            create: [
              {
                content: testContext.prefix("Public note content"),
                checked: false,
                order: 0,
              },
            ],
          },
        },
      });

      // Test API endpoint directly (simulating unauthenticated access)
      const apiResponse = await page.request.get(`/api/boards/${board.id}`);
      expect(apiResponse.status()).toBe(200);

      const apiData = await apiResponse.json();

      // Verify board data is returned
      expect(apiData.board.id).toBe(board.id);
      expect(apiData.board.name).toBe(board.name);
      expect(apiData.board.isPublic).toBe(true);

      // CRITICAL: Verify organization data is sanitized (no sensitive member info)
      expect(apiData.board.organization).toBeDefined();
      expect(apiData.board.organization.id).toBeDefined();
      expect(apiData.board.organization.name).toBeDefined();

      // SECURITY CHECK: Ensure no sensitive organization data is leaked
      expect(apiData.board.organization.members).toBeUndefined();
      expect(apiData.board.organization.slackWebhookUrl).toBeUndefined();
      expect(apiData.board.organization.createdAt).toBeUndefined();
      expect(apiData.board.organization.updatedAt).toBeUndefined();
    });

    test("should not expose private board data when accessed via public API", async ({
      page,
      testPrisma,
      testContext,
    }) => {
      // Create a PRIVATE board
      const privateBoard = await testPrisma.board.create({
        data: {
          name: testContext.getBoardName("Private Security Test Board"),
          description: testContext.prefix("This should not be accessible publicly"),
          isPublic: false, // PRIVATE
          sendSlackUpdates: false,
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Create sensitive note content
      await testPrisma.note.create({
        data: {
          boardId: privateBoard.id,
          createdBy: testContext.userId,
          color: "#red",
          checklistItems: {
            create: [
              {
                content: testContext.prefix("SENSITIVE: Company secrets here"),
                checked: false,
                order: 0,
              },
            ],
          },
        },
      });

      // Test API endpoint directly (unauthenticated access to private board)
      const apiResponse = await page.request.get(`/api/boards/${privateBoard.id}`);

      // SECURITY CHECK: Should return 401 Unauthorized for private board
      expect(apiResponse.status()).toBe(401);

      const errorData = await apiResponse.json();
      expect(errorData.error).toBe("Unauthorized");

      // Verify no board data is leaked in error response
      expect(errorData.board).toBeUndefined();
      expect(errorData.name).toBeUndefined();
      expect(errorData.organization).toBeUndefined();
    });

    test("should not allow cross-organization access to public boards", async ({
      page,
      testPrisma,
      testContext,
    }) => {
      // Create another organization
      const otherOrg = await testPrisma.organization.create({
        data: {
          name: testContext.prefix("Other Organization"),
        },
      });

      // Create another user in different organization
      const otherUser = await testPrisma.user.create({
        data: {
          email: testContext.prefix("other@example.com"),
          name: "Other User",
          organizationId: otherOrg.id,
          isAdmin: true,
        },
      });

      // Create a public board in the OTHER organization
      const otherOrgBoard = await testPrisma.board.create({
        data: {
          name: testContext.getBoardName("Other Org Public Board"),
          description: testContext.prefix("Public board from different org"),
          isPublic: true,
          sendSlackUpdates: false,
          createdBy: otherUser.id,
          organizationId: otherOrg.id,
        },
      });

      // Test accessing other org's public board via API
      const apiResponse = await page.request.get(`/api/boards/${otherOrgBoard.id}`);
      expect(apiResponse.status()).toBe(200);

      const apiData = await apiResponse.json();

      // Should be accessible since it's public
      expect(apiData.board.id).toBe(otherOrgBoard.id);
      expect(apiData.board.isPublic).toBe(true);

      // But organization data should be sanitized
      expect(apiData.board.organization.id).toBe(otherOrg.id);
      expect(apiData.board.organization.name).toBeDefined();

      // SECURITY CHECK: No sensitive org data from other organization
      expect(apiData.board.organization.members).toBeUndefined();
      expect(apiData.board.organization.slackWebhookUrl).toBeUndefined();
    });
  });

  test.describe("Authentication Bypass Prevention", () => {
    test("should require authentication for private board notes API", async ({
      page,
      testPrisma,
      testContext,
    }) => {
      // Create a private board
      const privateBoard = await testPrisma.board.create({
        data: {
          name: testContext.getBoardName("Private Notes Test Board"),
          description: testContext.prefix("Private board with sensitive notes"),
          isPublic: false,
          sendSlackUpdates: false,
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Try to access notes API without authentication
      const notesResponse = await page.request.get(`/api/boards/${privateBoard.id}/notes`);

      // SECURITY CHECK: Should require authentication
      expect(notesResponse.status()).toBe(401);

      const errorData = await notesResponse.json();
      expect(errorData.error).toBe("Unauthorized");
    });

    test("should prevent note creation on private boards via public access", async ({
      page,
      testPrisma,
      testContext,
    }) => {
      // Create a private board
      const privateBoard = await testPrisma.board.create({
        data: {
          name: testContext.getBoardName("Private Creation Test Board"),
          description: testContext.prefix("Should not allow public note creation"),
          isPublic: false,
          sendSlackUpdates: false,
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Try to create a note without authentication
      const createResponse = await page.request.post(`/api/boards/${privateBoard.id}/notes`, {
        data: {
          color: "#blue",
          checklistItems: [
            {
              content: "Malicious note attempt",
              checked: false,
              order: 0,
            },
          ],
        },
      });

      // SECURITY CHECK: Should be blocked
      expect(createResponse.status()).toBe(401);

      const errorData = await createResponse.json();
      expect(errorData.error).toBe("Unauthorized");
    });
  });

  test.describe("Public Board Content Security", () => {
    test("should only show public notes on public board page", async ({
      page,
      testPrisma,
      testContext,
    }) => {
      // Create a public board
      const publicBoard = await testPrisma.board.create({
        data: {
          name: testContext.getBoardName("Public Content Test Board"),
          description: testContext.prefix("Testing public content visibility"),
          isPublic: true,
          sendSlackUpdates: false,
          createdBy: testContext.userId,
          organizationId: testContext.organizationId,
        },
      });

      // Create a public note
      await testPrisma.note.create({
        data: {
          boardId: publicBoard.id,
          createdBy: testContext.userId,
          color: "#green",
          checklistItems: {
            create: [
              {
                content: testContext.prefix("Public note - should be visible"),
                checked: false,
                order: 0,
              },
            ],
          },
        },
      });

      // Visit the public board page
      await page.goto(`/public/boards/${publicBoard.id}`);

      // Verify public content is visible
      await expect(page.locator(`text=${publicBoard.name}`)).toBeVisible();
      await expect(page.locator("text=Public note - should be visible")).toBeVisible();

      // Verify no sensitive UI elements are shown
      await expect(page.locator('button:has-text("Add Note")')).not.toBeVisible();
      await expect(page.locator('[aria-label="Delete note"]')).not.toBeVisible();
      await expect(page.locator('[aria-label="Archive note"]')).not.toBeVisible();
    });
  });
});
