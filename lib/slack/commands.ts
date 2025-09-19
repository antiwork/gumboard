import { db } from "@/lib/db";
// import { client } from "../handler";
import { NOTE_COLORS } from "../constants";
import { WebClient } from "@slack/web-api";

export async function executeCommand(
  intent: string,
  board: string | undefined,
  data: any,
  user: any,
  event: any,
  client: WebClient
) {
  const isThreaded = event.type === "app_mention";

  switch (intent) {
    case "add": {
      if (!user.organizationId) {
        await sendMessage(
          client,
          event.channel,
          `❌ You need to be part of an organization.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const boardRecord = await resolveBoard(board, user.organizationId);
      if (!boardRecord) {
        await sendMessage(
          client,
          event.channel,
          `❌ Board not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const note = await resolveDefaultSlackNote(boardRecord.id, user.id);

      // Create first checklist item with the note content
      await db.checklistItem.create({
        data: {
          content: data.task,
          noteId: note.id,
          order: 0,
        },
      });

      await sendMessage(
        client,
        event.channel,
        `📝 Added task to board *${boardRecord.name}*`,
        isThreaded ? event.ts : undefined
      );
      break;
    }

    case "edit": {
      // Find the checklist item to edit

      if (!user.organizationId) {
        await sendMessage(
          client,
          event.channel,
          `❌ You need to be part of an organization.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const boardRecord = await resolveBoard(board, user.organizationId);
      if (!boardRecord) {
        await sendMessage(
          client,
          event.channel,
          `❌ Board not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const note = await resolveDefaultSlackNote(boardRecord.id, user.id);

      const item = await db.checklistItem.findFirst({
        where: {
          noteId: note.id,
          content: data.task,
        },
      });

      if (!item) {
        await sendMessage(
          client,
          event.channel,
          `❌ task not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const updatedItem = await db.checklistItem.update({
        where: { id: item.id },
        data: { content: data.newTask },
      });

      await sendMessage(
        client,
        event.channel,
        `✏️ Updated task content to *${updatedItem.content}*`,
        isThreaded ? event.ts : undefined
      );
      break;
    }

    case "delete": {
      // Delete the entire note (which will cascade delete checklist items)
      if (!user.organizationId) {
        await sendMessage(
          client,
          event.channel,
          `❌ You need to be part of an organization.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const boardRecord = await resolveBoard(board, user.organizationId);
      if (!boardRecord) {
        await sendMessage(
          client,
          event.channel,
          `❌ Board not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const note = await resolveDefaultSlackNote(boardRecord.id, user.id);

      const item = await db.checklistItem.findFirst({
        where: {
          noteId: note.id,
          content: data.task,
        },
      });

      if (!item) {
        await sendMessage(
          client,
          event.channel,
          `❌ Note not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const deletedItem = await db.checklistItem.delete({
        where: {
          id: item.id,
        },
      });

      await sendMessage(
        client,
        event.channel,
        `🗑️ Deleted task`,
        isThreaded ? event.ts : undefined
      );
      break;
    }

    case "list": {
      if (!user.organizationId) {
        await sendMessage(
          client,
          event.channel,
          `❌ You need to be part of an organization.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const boardRecord = await resolveBoard(board, user.organizationId);
      if (!boardRecord) {
        await sendMessage(
          client,
          event.channel,
          `❌ Board not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const note = await resolveDefaultSlackNote(boardRecord.id, user.id);
      let item;
      if (data.filters === "completed") {
        item = await db.checklistItem.findMany({
          where: {
            noteId: note.id,
            checked: true,
          },
        });
      } else if (data.filters === "pending") {
        item = await db.checklistItem.findMany({
          where: {
            noteId: note.id,
            checked: false,
          },
        });
      } else {
        item = await db.checklistItem.findMany({
          where: {
            noteId: note.id,
          },
        });
      }

      if (!item) {
        await sendMessage(
          client,
          event.channel,
          `❌ Note not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const text =
        item.length === 0
          ? "No tasks found."
          : item
              .map((n) =>
                !n.checked ? `○ ${n.content || "Empty task"}` : `● ${n.content || "Empty task"}`
              )
              .join("\n");

      await sendMessage(
        client,
        event.channel,
        `📒 Tasks in *${boardRecord.name}*:\n${text}`,
        isThreaded ? event.ts : undefined
      );
      break;
    }

    case "mark": {
      if (!user.organizationId) {
        await sendMessage(
          client,
          event.channel,
          `❌ You need to be part of an organization.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const boardRecord = await resolveBoard(board, user.organizationId);
      if (!boardRecord) {
        await sendMessage(
          client,
          event.channel,
          `❌ Board not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const note = await resolveDefaultSlackNote(boardRecord.id, user.id);

      const item = await db.checklistItem.findFirst({
        where: {
          noteId: note.id,
          content: data.task,
        },
      });

      if (!item) {
        await sendMessage(
          client,
          event.channel,
          `❌ Note not found.`,
          isThreaded ? event.ts : undefined
        );
        return;
      }

      const updatedItem = await db.checklistItem.update({
        where: { id: item.id },
        data: { checked: true },
      });

      await sendMessage(
        client,
        event.channel,
        `✅ Marked task *${updatedItem.content}* as completed`,
        isThreaded ? event.ts : undefined
      );
      break;
    }

    case "help": {
      const helpText = `
                  Here are the things you can ask me to do:

                  • *Add a task* → "add buy milk"
                  • *Edit a task* → "edit buy milk to buy bread"
                  • *Mark as done* → "mark buy milk as done"
                  • *Delete a task* → "delete buy milk"
                  • *List all tasks* → "list all"
                  • *List completed tasks* → "list completed"
                  • *List boards* → "list boards"
                  • *Add task to specific board* → "add buy fruits to Growth board"

                  ℹ️ I'll always use your org's default Slack board and your personal default note unless you specify another board.
            `;

      await sendMessage(client, event.channel, helpText.trim(), isThreaded ? event.ts : undefined);
      break;
    }

    default: {
      await sendMessage(
        client,
        event.channel,
        `🤔 Sorry ${isThreaded ? `<@${event.user}>` : ""}, I didn't understand that.`,
        isThreaded ? event.ts : undefined
      );
    }
  }
}

async function sendMessage(client: WebClient, channel: string, text: string, thread_ts?: string) {
  await client.chat.postMessage({
    channel,
    text,
    ...(thread_ts && { thread_ts }),
  });
}

async function resolveBoard(boardName: string | undefined, organizationId: string) {
  if (!boardName) {
    // Find first board in organization - default
    return await db.board.findFirst({
      where: { organizationId },
    });
  }
  return await db.board.findFirst({
    where: {
      name: boardName,
      organizationId,
    },
  });
}

async function resolveNoteByContent(boardId: string, noteContent: string) {
  // Find note by looking for a checklist item with matching content
  const item = await db.checklistItem.findFirst({
    where: {
      content: {
        contains: noteContent,
        mode: "insensitive",
      },
      note: {
        boardId: boardId,
        deletedAt: null,
      },
    },
    include: {
      note: true,
    },
  });

  return item?.note || null;
}

async function resolveDefaultSlackNote(boardId: string, userId: string) {
  const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
  let note = await db.note.findFirst({
    where: { boardId, createdBy: userId, isSlackDefault: true, deletedAt: null },
  });

  if (!note) {
    note = await db.note.create({
      data: {
        boardId,
        createdBy: userId,
        color: randomColor,
        isSlackDefault: true,
      },
    });
  }

  return note;
}
