import { PrismaClient } from "@prisma/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "production" ? ["warn", "error"] : ["query", "warn", "error"],
  });

export const db = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);
        if (!result) return result;

        if (
          ["Note", "ChecklistItem"].includes(model) &&
          ["create", "update", "delete"].includes(operation)
        ) {
          const boardId =
            model === "Note"
              ? (result as { boardId?: string }).boardId
              : (args as { where?: { noteId?: string } }).where?.noteId;

          if (boardId) {
            await prisma.board.update({
              where: { id: boardId },
              data: { updatedAt: new Date() },
            });
          }
        }

        return result;
      },
    },
  },
});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
