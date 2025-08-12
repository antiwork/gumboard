import OpenAI from "openai";

export interface AgentTask {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: Date;
  assignedTo?: string;
  notes?: string;
}

export interface AgentResponse {
  message: string;
  tasks: AgentTask[];
}

export class OpenAIAgent {
  private client: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.client = new OpenAI({
        apiKey: apiKey,
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async processNoteContent(
    content: string
  ): Promise<AgentResponse> {
    if (!this.client) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const systemPrompt = `You are an intelligent task generation assistant for Gumboard.
      
      Your ONLY job is to:
      1. Analyze the user's input and generate actionable tasks
      2. Break down large concepts into smaller, manageable steps
      3. Create multiple specific tasks (typically 3-8 tasks)
      
      IMPORTANT: Always generate multiple specific, actionable tasks. For example:
      - "Learn Data Structures" → "Study arrays and lists", "Practice tree algorithms", "Complete sorting exercises", "Implement graph traversal", etc.
      - "Plan meeting" → "Set agenda", "Send calendar invites", "Prepare presentation", "Book conference room", etc.
      
      Respond with structured JSON containing:
      - message: Brief confirmation of tasks generated
      - tasks: Array of tasks (with content, status as "pending", priority) - DO NOT include id field, it will be generated client-side`;

      const userPrompt = `Generate actionable tasks for: ${content}`;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result as AgentResponse;
    } catch {
      throw new Error("Failed to process with AI agent");
    }
  }

}

const agentInstances = new Map<string, OpenAIAgent>();

export function getOpenAIAgent(apiKey?: string): OpenAIAgent {
  const key = apiKey || 'default';
  
  if (!agentInstances.has(key)) {
    agentInstances.set(key, new OpenAIAgent(apiKey));
  }
  
  return agentInstances.get(key)!;
}