import { db } from "@/lib/db";

/**
 * Updates the lastActivityAt timestamp for a board when notes or checklist items are modified
 */
export async function updateBoardActivity(boardId: string): Promise<void> {
  try {
    await db.board.update({
      where: { id: boardId },
      data: { lastActivityAt: new Date() },
    });
  } catch (error) {
    // Log error but don't throw - activity tracking shouldn't break main functionality
    console.error("Failed to update board activity:", error);
  }
}
