import { db } from "@/lib/db";
import { sendMessage } from "../commands";
import { WebClient } from "@slack/web-api";
import { CommandData, SlackEvent, User } from "../types";

export async function listBoards(
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

  const boards = await db.board.findMany({
    where: { organizationId: user.organizationId },
    select: { name: true, description: true },
    orderBy: { name: "asc" },
  });

  if (boards.length === 0) {
    await sendMessage(
      client,
      event.channel,
      `📋 No boards found in your organization. Want me to create one. Try saying "Create board xyz"`,
      isThreaded ? event.ts : undefined
    );
    return;
  }

  const boardList = boards
    .map((board, index) => {
      const number = index + 1;
      return `${number}. *${board.name}*${board.description ? ` - ${board.description}` : ""}`;
    })
    .join("\n");

  await sendMessage(
    client,
    event.channel,
    `📋 Available boards:\n${boardList}`,
    isThreaded ? event.ts : undefined
  );
}

export async function createBoard(
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

  await db.board.create({
    data: {
      name: data.task || "New Board",
      organizationId: user.organizationId,
      createdBy: user.id,
    },
  });

  await sendMessage(
    client,
    event.channel,
    `📋 Created boards: ${data.task}`,
    isThreaded ? event.ts : undefined
  );
}
