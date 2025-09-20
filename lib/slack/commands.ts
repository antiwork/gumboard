import { db } from "@/lib/db";
import { NOTE_COLORS } from "../constants";
import { WebClient } from "@slack/web-api";
import {
  addTask,
  deleteTask,
  editTask,
  listTask,
  markTask,
  unmarkTask,
} from "./command-handler/task-handler";
import { createBoard, listBoards } from "./command-handler/board-handler";
import { CommandData, SlackEvent, User } from "./types";


export async function executeCommand(
  intent: string,
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient
) {
  const isThreaded = event.type === "app_mention";

  switch (intent) {
    case "add": {
      await addTask(board, data, user, event, client, isThreaded);
      break;
    }

    case "edit": {
      await editTask(board, data, user, event, client, isThreaded);
      break;
    }

    case "delete": {
      await deleteTask(board, data, user, event, client, isThreaded);
      break;
    }

    case "list": {
      await listTask(board, data, user, event, client, isThreaded);
      break;
    }

    case "mark": {
      await markTask(board, data, user, event, client, isThreaded);
      break;
    }

    case "unmark": {
      await unmarkTask(board, data, user, event, client, isThreaded);
      break;
    }

    case "boards": {
      await listBoards(user, event, client, isThreaded);
      break;
    }

    case "create board": {
      await createBoard(data, user, event, client, isThreaded);
      break;
    }

    case "help": {
      const helpText = `
🤖 *Try Saying*

*Basic Commands:*
• \`add <task>\` → Add a new task
• \`list all\` → Show all tasks (numbered)
• \`list completed\` → Show completed tasks
• \`list pending\` → Show pending tasks

*Work with Numbers:*
• \`delete 3rd one\` → Delete task #3
• \`mark 1st as done\` → Mark task #1 complete
• \`edit 2nd to <new text>\` → Edit task #2

*Work with Names:*
• \`delete buy milk\` → Delete by task name
• \`mark buy milk as done\` → Mark by name
• \`edit buy milk to buy bread\` → Edit by name

*Board Commands:*
• \`boards\` → List all boards
• \`add <task> to <board>\` → Add to specific board
• \`list tasks in <board>\` → List tasks from board

*Other:*
• \`unmark 1st\` → Mark task as pending
• \`help\` → Show this help

💡 *Tip:* Use \`list all\` first to see numbered tasks, then reference by number!
            `;

      await sendMessage(client, event.channel, helpText.trim(), isThreaded ? event.ts : undefined);
      break;
    }

    default: {
      await sendMessage(
        client,
        event.channel,
        `🤔 Sorry ${isThreaded ? `<@${event.user}>` : ""}, I didn't understand that. Try \`help\` to see what I can do!`,
        isThreaded ? event.ts : undefined
      );
    }
  }
}

export async function sendMessage(
  client: WebClient,
  channel: string,
  text: string,
  thread_ts?: string
) {
  await client.chat.postMessage({
    channel,
    text,
    ...(thread_ts && { thread_ts }),
  });
}

export async function resolveBoard(boardName: string | undefined, organizationId: string) {
  if (!boardName) {
    // Find first board in organization - default
    return await db.board.findFirst({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  // Try exact match first
  let board = await db.board.findFirst({
    where: {
      name: boardName,
      organizationId,
    },
  });

  // If no exact match, try case-insensitive partial match
  if (!board) {
    board = await db.board.findFirst({
      where: {
        name: {
          contains: boardName,
          mode: "insensitive",
        },
        organizationId,
      },
    });
  }

  return board;
}

export async function resolveDefaultSlackNote(boardId: string, userId: string) {
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
