import { prisma } from "@/lib/prisma";
import { nlpService, NLPIntent } from "./nlp";
import { contextManager } from "./context";
// Remove unused import: slackClient

export class MessageHandler {
  async handleMessage(
    text: string,
    userId: string,
    channelId: string,
    teamId: string
  ): Promise<string> {
    try {
      // Get organization from Slack team ID
      const organization = await prisma.organization.findFirst({
        where: { slackTeamId: teamId },
      });

      if (!organization) {
        return "❌ Your Slack workspace isn't connected to Gumboard yet. Please contact your admin to set up the integration.";
      }

      // Parse user intent
      const intent = await nlpService.parseIntent(text);

      // Route to appropriate handler
      return await this.routeIntent(intent, userId, channelId, organization.id);
    } catch (error) {
      console.error("Error handling message:", error);
      return "Sorry, I encountered an error processing your request. Please try again.";
    }
  }

  private async routeIntent(
    intent: NLPIntent,
    userId: string,
    channelId: string,
    organizationId: string
  ): Promise<string> {
    switch (intent.action) {
      case "list":
        return await this.handleList(userId, channelId, organizationId);
      case "add":
        return await this.handleAdd(intent, userId, channelId, organizationId);
      case "complete":
        return await this.handleComplete(intent, userId, channelId, organizationId);
      case "remove":
        return await this.handleRemove(intent, userId, channelId, organizationId);
      case "edit":
        return await this.handleEdit(intent, userId, channelId, organizationId);
      case "help":
        return this.getHelpMessage();
      default:
        return this.getUnknownMessage(intent.confidence);
    }
  }

  private async handleList(
    userId: string,
    channelId: string,
    organizationId: string
  ): Promise<string> {
    // Get user's tasks across all boards in the organization
    const tasks = await prisma.checklistItem.findMany({
      where: {
        note: {
          createdBy: userId,
          board: {
            organizationId: organizationId,
          },
          deletedAt: null,
        },
      },
      include: {
        note: {
          include: {
            board: true,
          },
        },
      },
      orderBy: [{ note: { createdAt: "desc" } }, { order: "asc" }],
    });

    if (tasks.length === 0) {
      return "Your task list is empty! 🎉\n\nAdd a task by saying something like 'Add call John about the project'.";
    }

    // Store tasks in context for future reference
    const taskContext = tasks.map((task, index) => ({
      id: task.id,
      content: task.content,
      index: index + 1,
    }));

    await contextManager.setLastTasks(userId, channelId, organizationId, taskContext);

    // Format task list
    const taskList = tasks
      .map((task, index) => {
        const status = task.checked ? "✅" : "⏳";
        const boardName = task.note.board.name;
        return `${index + 1}. ${task.content} ${status} _[${boardName}]_`;
      })
      .join("\n");

    const completedCount = tasks.filter((t) => t.checked).length;
    const pendingCount = tasks.length - completedCount;

    return `📋 **Your Tasks:**\n\n${taskList}\n\n📊 *${pendingCount} pending* • *${completedCount} completed*`;
  }

  private async handleAdd(
    intent: NLPIntent,
    userId: string,
    channelId: string,
    organizationId: string
  ): Promise<string> {
    const taskText = intent.entities.taskText;
    if (!taskText) {
      return "I couldn't understand what task you want to add. Try saying something like 'Add call John about the meeting'.";
    }

    try {
      // Get user's default board or create one
      let board = await prisma.board.findFirst({
        where: {
          organizationId: organizationId,
          OR: [{ name: "Personal" }, { name: "Default" }],
        },
      });

      if (!board) {
        board = await prisma.board.create({
          data: {
            name: "Personal",
            organizationId: organizationId,
            createdBy: userId,
          },
        });
      }

      // Create a note for the task
      const note = await prisma.note.create({
        data: {
          boardId: board.id,
          createdBy: userId,
        },
      });

      // Create the checklist item
      await prisma.checklistItem.create({
        data: {
          content: taskText,
          noteId: note.id,
          slackUserId: userId,
          order: 0,
        },
      });

      await contextManager.updateContext(userId, channelId, organizationId, {
        lastAction: "add",
      });

      return `✅ **Added:** ${taskText}\n_Added to ${board.name} board_`;
    } catch (error) {
      console.error("Error adding task:", error);
      return "Sorry, I couldn't add that task. Please try again.";
    }
  }

  private async handleComplete(
    intent: NLPIntent,
    userId: string,
    channelId: string,
    organizationId: string
  ): Promise<string> {
    let taskId: string | null = null;

    // Resolve task by index or text
    if (intent.entities.taskIndex) {
      taskId = await contextManager.resolveTaskReference(
        userId,
        channelId,
        intent.entities.taskIndex
      );
    } else if (intent.entities.taskText) {
      taskId = await contextManager.resolveTaskReference(
        userId,
        channelId,
        intent.entities.taskText
      );
    }

    if (!taskId) {
      return "I couldn't find that task. Try saying 'list my tasks' first to see what's available.";
    }

    try {
      // Update task as completed
      const task = await prisma.checklistItem.update({
        where: { id: taskId },
        data: { checked: true },
      });

      await contextManager.updateContext(userId, channelId, organizationId, {
        lastAction: "complete",
      });

      return `🎉 **Great work!** "${task.content}" is now completed.`;
    } catch (error) {
      console.error("Error completing task:", error);
      return "Sorry, I couldn't complete that task. Please try again.";
    }
  }

  private async handleRemove(
    intent: NLPIntent,
    userId: string,
    channelId: string,
    organizationId: string
  ): Promise<string> {
    let taskId: string | null = null;

    if (intent.entities.taskIndex) {
      taskId = await contextManager.resolveTaskReference(
        userId,
        channelId,
        intent.entities.taskIndex
      );
    } else if (intent.entities.taskText) {
      taskId = await contextManager.resolveTaskReference(
        userId,
        channelId,
        intent.entities.taskText
      );
    }

    if (!taskId) {
      return "I couldn't find that task. Try saying 'list my tasks' first to see what's available.";
    }

    try {
      const task = await prisma.checklistItem.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return "That task doesn't exist anymore.";
      }

      // Delete the checklist item
      await prisma.checklistItem.delete({
        where: { id: taskId },
      });

      await contextManager.updateContext(userId, channelId, organizationId, {
        lastAction: "remove",
      });

      return `🗑️ **Removed:** ${task.content}`;
    } catch (error) {
      console.error("Error removing task:", error);
      return "Sorry, I couldn't remove that task. Please try again.";
    }
  }

  private async handleEdit(
    intent: NLPIntent,
    userId: string,
    channelId: string,
    organizationId: string
  ): Promise<string> {
    const newText = intent.entities.newText;
    if (!newText) {
      return "I couldn't understand what you want to change. Try saying something like 'Change task 1 to call Sarah instead'.";
    }

    let taskId: string | null = null;

    if (intent.entities.taskIndex) {
      taskId = await contextManager.resolveTaskReference(
        userId,
        channelId,
        intent.entities.taskIndex
      );
    }

    if (!taskId) {
      return "I couldn't find that task. Try specifying the task number, like 'Change task 1 to call Sarah'.";
    }

    try {
      const oldTask = await prisma.checklistItem.findUnique({
        where: { id: taskId },
      });

      if (!oldTask) {
        return "That task doesn't exist anymore.";
      }

      const updatedTask = await prisma.checklistItem.update({
        where: { id: taskId },
        data: { content: newText },
      });

      await contextManager.updateContext(userId, channelId, organizationId, {
        lastAction: "edit",
      });

      return `✏️ **Updated:** "${oldTask.content}" → "${updatedTask.content}"`;
    } catch (error) {
      console.error("Error editing task:", error);
      return "Sorry, I couldn't edit that task. Please try again.";
    }
  }

  private getHelpMessage(): string {
    return `🤖 **Gumboard Slack Bot Help**

I can help you manage your tasks using natural language! Here's what I can do:

📋 **List tasks**: "What's on my list?" or "Show my tasks"
➕ **Add tasks**: "Add call John about pricing" or "Remind me to finish the report"  
✅ **Complete tasks**: "Mark task 2 as done" or "I finished the homepage redesign"
✏️ **Edit tasks**: "Change task 1 to call Sarah instead"
🗑️ **Remove tasks**: "Delete the meeting task" or "Remove task 3"

💡 **Tips:**
• I understand natural language - speak normally!
• Reference tasks by number or description
• I remember our recent conversation context

Try saying something like "Add prepare presentation for Monday"!`;
  }

  private getUnknownMessage(confidence: number): string {
    if (confidence < 0.3) {
      return `I'm not sure what you want to do. ${this.getHelpMessage()}`;
    }
    return "I didn't quite understand that. Try being more specific, or say 'help' to see what I can do.";
  }
}

export const messageHandler = new MessageHandler();
