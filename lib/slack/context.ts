import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface ConversationContext {
  userId: string;
  channelId: string;
  organizationId: string;
  lastAction?: string;
  lastTasks?: Array<{
    id: string;
    content: string;
    index: number;
  }>;
  conversationData?: Prisma.JsonValue; // Use Prisma's JsonValue type
}

export class ContextManager {
  async getContext(userId: string, channelId: string): Promise<ConversationContext | null> {
    try {
      const session = await prisma.slackSession.findUnique({
        where: {
          userId_channelId: {
            userId,
            channelId
          }
        }
      });

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return {
        userId: session.userId,
        channelId: session.channelId,
        organizationId: session.organizationId,
        lastAction: session.lastAction || undefined,
        conversationData: session.conversationData || undefined
      };
    } catch (error) {
      console.error('Error getting context:', error);
      return null;
    }
  }

  async updateContext(
    userId: string, 
    channelId: string, 
    organizationId: string,
    updates: Partial<ConversationContext>
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 min TTL

      await prisma.slackSession.upsert({
        where: {
          userId_channelId: {
            userId,
            channelId
          }
        },
        create: {
          userId,
          channelId,
          organizationId,
          lastAction: updates.lastAction,
          conversationData: (updates.conversationData as Prisma.JsonValue) || Prisma.JsonNull,
          expiresAt
        },
        update: {
          lastAction: updates.lastAction,
          conversationData: (updates.conversationData as Prisma.JsonValue) || Prisma.JsonNull,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  async setLastTasks(
    userId: string, 
    channelId: string, 
    organizationId: string,
    tasks: Array<{ id: string; content: string; index: number }>
  ): Promise<void> {
    await this.updateContext(userId, channelId, organizationId, {
      lastAction: 'list',
      lastTasks: tasks,
      conversationData: { lastTasks: tasks } as Prisma.JsonValue
    });
  }

  async resolveTaskReference(
    userId: string,
    channelId: string,
    reference: string | number
  ): Promise<string | null> {
    const context = await this.getContext(userId, channelId);
    if (!context || !context.lastTasks) return null;

    // Handle numeric references
    if (typeof reference === 'number') {
      const task = context.lastTasks[reference - 1];
      return task?.id || null;
    }

    // Handle text references
    if (typeof reference === 'string') {
      const lowerRef = reference.toLowerCase();
      
      // Handle "that", "it", "the last one"
      if (lowerRef.includes('that') || lowerRef.includes('it') || lowerRef === 'last') {
        const lastTask = context.lastTasks[context.lastTasks.length - 1];
        return lastTask?.id || null;
      }

      // Find by partial content match
      const matchingTask = context.lastTasks.find(task => 
        task.content.toLowerCase().includes(lowerRef)
      );
      return matchingTask?.id || null;
    }

    return null;
  }
}

export const contextManager = new ContextManager();
