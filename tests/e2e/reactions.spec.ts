import { test, expect } from "../fixtures/test-helpers";
import { randomUUID } from "crypto";

test.describe("Reactions API", () => {
  let testNoteId: string;
  let testBoardId: string;

  test.beforeEach(async ({ testContext, testPrisma }) => {
    const testBoard = await testPrisma.board.create({
      data: {
        id: randomUUID(),
        name: "Test Board for Reactions",
        createdBy: testContext.userId,
        organizationId: testContext.organizationId,
      },
    });
    testBoardId = testBoard.id;

    const testNote = await testPrisma.note.create({
      data: {
        id: randomUUID(),
        color: "#fef3c7",
        boardId: testBoardId,
        createdBy: testContext.userId,
      },
    });
    testNoteId = testNote.id;

    await testPrisma.checklistItem.create({
      data: {
        id: randomUUID(),
        content: "Test note content for reactions",
        noteId: testNoteId,
        order: 0,
      },
    });
  });

  test.afterEach(async ({ testPrisma }) => {
    await testPrisma.reaction.deleteMany({
      where: { noteId: testNoteId },
    });

    await testPrisma.checklistItem.deleteMany({
      where: { noteId: testNoteId },
    });

    await testPrisma.note.delete({
      where: { id: testNoteId },
    });

    await testPrisma.board.delete({
      where: { id: testBoardId },
    });
  });

  test("should add a new reaction to a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const emoji = "👍";

    const response = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
      data: { emoji },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    if (responseData.success !== undefined) {
      expect(responseData.success).toBe(true);
      expect(responseData.action).toBe("added");
    }

    const reaction = await testPrisma.reaction.findFirst({
      where: {
        noteId: testNoteId,
        userId: testContext.userId,
        emoji,
      },
    });

    expect(reaction).not.toBeNull();
    expect(reaction!.emoji).toBe(emoji);
    expect(reaction!.userId).toBe(testContext.userId);
  });

  test("should remove existing reaction from a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const emoji = "❤️";

    await testPrisma.reaction.create({
      data: {
        id: randomUUID(),
        emoji,
        noteId: testNoteId,
        userId: testContext.userId,
      },
    });

    const response = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
      data: { emoji },
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();

    if (responseData.success !== undefined) {
      expect(responseData.success).toBe(true);
      expect(responseData.action).toBe("removed");
    }

    const reaction = await testPrisma.reaction.findFirst({
      where: {
        noteId: testNoteId,
        userId: testContext.userId,
        emoji,
      },
    });

    expect(reaction).toBeNull();
  });

  test("should get all reactions for a note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const reactions = [
      { emoji: "👍", userId: testContext.userId },
      { emoji: "❤️", userId: testContext.userId },
      { emoji: "😄", userId: testContext.userId },
    ];

    for (const reactionData of reactions) {
      await testPrisma.reaction.create({
        data: {
          id: randomUUID(),
          emoji: reactionData.emoji,
          noteId: testNoteId,
          userId: reactionData.userId,
        },
      });
    }

    const response = await authenticatedPage.request.get(`/api/reactions/${testNoteId}`);

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(Array.isArray(responseData)).toBe(true);
    expect(responseData.length).toBe(3);

    const emojis = responseData.map((r: any) => r.emoji);
    expect(emojis).toContain("👍");
    expect(emojis).toContain("❤️");
    expect(emojis).toContain("😄");
  });

  test("should return empty array for note with no reactions", async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.get(`/api/reactions/${testNoteId}`);

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(Array.isArray(responseData)).toBe(true);
    expect(responseData.length).toBe(0);
  });

  test("should require authentication for adding reactions", async ({ page }) => {
    const response = await page.request.post(`/api/reactions/${testNoteId}`, {
      data: { emoji: "👍" },
    });

    expect(response.status()).toBe(401);
  });

  test("should handle unauthenticated GET requests", async ({ page }) => {
    const response = await page.request.get(`/api/reactions/${testNoteId}`);

    const expectedStatus = 200;
    expect(response.status()).toBe(expectedStatus);
  });

  test("should return 400 for invalid emoji", async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
      data: { emoji: "" },
    });

    expect(response.status()).toBe(400);
  });

  test("should return 400 for missing emoji", async ({ authenticatedPage }) => {
    const response = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("should handle non-existent note gracefully", async ({ authenticatedPage }) => {
    const fakeNoteId = randomUUID();

    const response = await authenticatedPage.request.post(`/api/reactions/${fakeNoteId}`, {
      data: { emoji: "👍" },
    });
    expect([404, 500]).toContain(response.status());
  });

  test("should handle invalid note ID format gracefully", async ({ authenticatedPage }) => {
    const invalidNoteId = "invalid-uuid";

    const response = await authenticatedPage.request.post(`/api/reactions/${invalidNoteId}`, {
      data: { emoji: "👍" },
    });

    expect([400, 500]).toContain(response.status());
  });

  test("should allow multiple users to react to same note", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const anotherUser = await testPrisma.user.create({
      data: {
        id: randomUUID(),
        email: "another@example.com",
        name: "Another User",
        organizationId: testContext.organizationId,
      },
    });

    try {
      await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
        data: { emoji: "👍" },
      });

      await testPrisma.reaction.create({
        data: {
          id: randomUUID(),
          emoji: "👍",
          noteId: testNoteId,
          userId: anotherUser.id,
        },
      });

      const response = await authenticatedPage.request.get(`/api/reactions/${testNoteId}`);

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.length).toBe(2);

      const userIds = responseData.map((r: any) => r.user?.id || r.userId);
      expect(userIds).toContain(testContext.userId);
      expect(userIds).toContain(anotherUser.id);
    } finally {
      await testPrisma.user.delete({
        where: { id: anotherUser.id },
      });
    }
  });

  test("should allow same user to add different emojis", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const emojis = ["👍", "❤️", "😄"];

    for (const emoji of emojis) {
      const response = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
        data: { emoji },
      });
      expect(response.status()).toBe(200);
    }

    const reactions = await testPrisma.reaction.findMany({
      where: {
        noteId: testNoteId,
        userId: testContext.userId,
      },
    });

    expect(reactions.length).toBe(3);

    const reactionEmojis = reactions.map((r) => r.emoji);
    emojis.forEach((emoji) => {
      expect(reactionEmojis).toContain(emoji);
    });
  });

  test("should toggle reactions (add then remove)", async ({
    authenticatedPage,
    testContext,
    testPrisma,
  }) => {
    const emoji = "🚀";

    const response1 = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
      data: { emoji },
    });
    expect(response1.status()).toBe(200);

    let reaction = await testPrisma.reaction.findFirst({
      where: {
        noteId: testNoteId,
        userId: testContext.userId,
        emoji,
      },
    });
    expect(reaction).not.toBeNull();

    const response2 = await authenticatedPage.request.post(`/api/reactions/${testNoteId}`, {
      data: { emoji },
    });
    expect(response2.status()).toBe(200);

    reaction = await testPrisma.reaction.findFirst({
      where: {
        noteId: testNoteId,
        userId: testContext.userId,
        emoji,
      },
    });
    expect(reaction).toBeNull();
  });
});
