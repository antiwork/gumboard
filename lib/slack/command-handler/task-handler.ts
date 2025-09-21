import { db } from "@/lib/db";
import { resolveBoard, resolveDefaultSlackNote, sendMessage } from "../commands";
import { WebClient } from "@slack/web-api";
import { CommandData, SlackEvent, User } from "../types";

export async function addTask(
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient,
  isThreaded: boolean
) {
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

  // Get the current highest order to append new task
  const lastItem = await db.checklistItem.findFirst({
    where: { noteId: note.id },
    orderBy: { order: "desc" },
  });
  const nextOrder = lastItem ? lastItem.order + 1 : 0;

  // Create first checklist item with the note content
  await db.checklistItem.create({
    data: {
      content: data.task || "",
      noteId: note.id,
      order: nextOrder,
    },
  });

  await sendMessage(
    client,
    event.channel,
    `📝 Added task "${data.task}" to board *${boardRecord.name}*`,
    isThreaded ? event.ts : undefined
  );
}

export async function editTask(
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient,
  isThreaded: boolean
) {
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

  // Handle position-based editing (e.g., "edit 2nd task to buy bread")
  if (data.position) {
    const position = (typeof data.position === "number" ? data.position : parseInt(data.position, 10)) - 1; // Convert to 0-based index
    const items = await db.checklistItem.findMany({
      where: { noteId: note.id },
      orderBy: { order: "asc" },
    });

    if (position < 0 || position >= items.length) {
      await sendMessage(
        client,
        event.channel,
        `❌ Task #${data.position} not found. You have ${items.length} tasks.`,
        isThreaded ? event.ts : undefined
      );
      return;
    }

    item = items[position];
  }
  // Handle name-based editing (e.g., "edit buy milk to buy bread")
  else if (data.task) {
    item = await db.checklistItem.findFirst({
      where: {
        noteId: note.id,
        content: data.task,
      },
    });
  } else {
    await sendMessage(
      client,
      event.channel,
      `❌ Please specify which task to edit (by name or number).`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  if (!item) {
    await sendMessage(
      client,
      event.channel,
      `❌ Task not found.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  const updatedItem = await db.checklistItem.update({
    where: { id: item.id },
    data: { content: data.newTask || "" },
  });

  const taskRef = data.position ? `task #${data.position}` : `"${data.task}"`;
  await sendMessage(
    client,
    event.channel,
    `✏️ Updated ${taskRef} to "${updatedItem.content}"`,
    isThreaded ? event.ts : undefined
  );
}

export async function deleteTask(
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient,
  isThreaded: boolean
) {
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

  // Handle position-based deletion (e.g., "delete 3rd one")
  if (data.position) {
   const position = (typeof data.position === "number" ? data.position : parseInt(data.position, 10)) - 1; // Convert to 0-based index
    const items = await db.checklistItem.findMany({
      where: { noteId: note.id },
      orderBy: { order: "asc" },
    });

    if (position < 0 || position >= items.length) {
      await sendMessage(
        client,
        event.channel,
        `❌ Task #${data.position} not found. You have ${items.length} tasks.`,
        isThreaded ? event.ts : undefined
      );
      return;
    }

    item = items[position];
  }
  // Handle name-based deletion (e.g., "delete buy milk")
  else if (data.task) {
    item = await db.checklistItem.findFirst({
      where: {
        noteId: note.id,
        content: data.task,
      },
    });
  } else {
    await sendMessage(
      client,
      event.channel,
      `❌ Please specify which task to delete (by name or number).`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  if (!item) {
    await sendMessage(
      client,
      event.channel,
      `❌ Task not found.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  const taskContent = item.content;
  await db.checklistItem.delete({
    where: { id: item.id },
  });

  const taskRef = data.position ? `task #${data.position}` : `"${taskContent}"`;
  await sendMessage(
    client,
    event.channel,
    `🗑️ Deleted ${taskRef}`,
    isThreaded ? event.ts : undefined
  );
}

export async function listTask(
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient,
  isThreaded: boolean
) {
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
  let items;

  if (data.filters === "completed") {
    items = await db.checklistItem.findMany({
      where: { noteId: note.id, checked: true },
      orderBy: { order: "asc" },
    });
  } else if (data.filters === "pending") {
    items = await db.checklistItem.findMany({
      where: { noteId: note.id, checked: false },
      orderBy: { order: "asc" },
    });
  } else {
    items = await db.checklistItem.findMany({
      where: { noteId: note.id },
      orderBy: { order: "asc" },
    });
  }

  if (items.length === 0) {
    const filterText =
      data.filters === "completed" ? "completed " : data.filters === "pending" ? "pending " : "";
    await sendMessage(
      client,
      event.channel,
      `📝 No ${filterText}tasks found in *${boardRecord.name}*.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  // Format with numbers for easy reference
  const text = items
    .map((item) => {
      const status = item.checked ? "☑" : "☐";
      return `${status} ${item.content || "Empty task"}`;
    })
    .join("\n");

  const filterText =
    data.filters === "completed" ? " (Completed)" : data.filters === "pending" ? " (Pending)" : "";
  await sendMessage(
    client,
    event.channel,
    `☰ Tasks in *${boardRecord.name}*${filterText}:\n${text}`,
    isThreaded ? event.ts : undefined
  );
}

export async function markTask(
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient,
  isThreaded: boolean
) {
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

  // Handle position-based marking (e.g., "mark 1st as done")
  if (data.position) {
    const position = (typeof data.position === "number" ? data.position : parseInt(data.position, 10)) - 1;

    const items = await db.checklistItem.findMany({
      where: { noteId: note.id },
      orderBy: { order: "asc" },
    });

    if (position < 0 || position >= items.length) {
      await sendMessage(
        client,
        event.channel,
        `❌ Task #${data.position} not found. You have ${items.length} tasks.`,
        isThreaded ? event.ts : undefined
      );
      return;
    }

    item = items[position];
  }
  // Handle name-based marking
  else if (data.task) {
    item = await db.checklistItem.findFirst({
      where: {
        noteId: note.id,
        content: data.task,
      },
    });
  } else {
    await sendMessage(
      client,
      event.channel,
      `❌ Please specify which task to mark (by name or number).`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  if (!item) {
    await sendMessage(
      client,
      event.channel,
      `❌ Task not found.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  if (item.checked) {
    await sendMessage(
      client,
      event.channel,
      `ℹ️ Task is already completed.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  const updatedItem = await db.checklistItem.update({
    where: { id: item.id },
    data: { checked: true },
  });

  const taskRef = data.position ? `task #${data.position}` : `"${updatedItem.content}"`;
  await sendMessage(
    client,
    event.channel,
    `✅ Marked ${taskRef} as completed`,
    isThreaded ? event.ts : undefined
  );
}

export async function unmarkTask(
  board: string | undefined,
  data: CommandData,
  user: User,
  event: SlackEvent,
  client: WebClient,
  isThreaded: boolean
) {
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

  // Handle position-based unmarking
  if (data.position) {
  const position = (typeof data.position === "number" ? data.position : parseInt(data.position, 10)) - 1;

    const items = await db.checklistItem.findMany({
      where: { noteId: note.id },
      orderBy: { order: "asc" },
    });

    if (position < 0 || position >= items.length) {
      await sendMessage(
        client,
        event.channel,
        `❌ Task #${data.position} not found. You have ${items.length} tasks.`,
        isThreaded ? event.ts : undefined
      );
      return;
    }

    item = items[position];
  }
  // Handle name-based unmarking
  else if (data.task) {
    item = await db.checklistItem.findFirst({
      where: {
        noteId: note.id,
        content: data.task,
      },
    });
  } else {
    await sendMessage(
      client,
      event.channel,
      `❌ Please specify which task to unmark (by name or number).`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  if (!item) {
    await sendMessage(
      client,
      event.channel,
      `❌ Task not found.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  if (!item.checked) {
    await sendMessage(
      client,
      event.channel,
      `ℹ️ Task is already pending.`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  const updatedItem = await db.checklistItem.update({
    where: { id: item.id },
    data: { checked: false },
  });

  const taskRef = data.position ? `task #${data.position}` : `"${updatedItem.content}"`;
  await sendMessage(
    client,
    event.channel,
    `⭕ Marked ${taskRef} as pending`,
    isThreaded ? event.ts : undefined
  );
}
