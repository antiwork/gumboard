import { OpenAI } from "openai";

export interface NLPIntent {
  action: "list" | "add" | "complete" | "remove" | "edit" | "help" | "unknown";
  confidence: number;
  entities: {
    taskText?: string;
    taskIndex?: number;
    boardName?: string;
    newText?: string;
  };
  originalText: string;
}

export class NLPService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async parseIntent(text: string): Promise<NLPIntent> {
    // Clean the text (remove bot mentions)
    const cleanText = text
      .replace(/<@[UW][A-Z0-9]+>/g, "")
      .replace(/<#[C][A-Z0-9]+\\|[^>]+>/g, "") // Fixed: Escaped pipe character
      .trim();

    // Try OpenAI first if available
    if (this.openai) {
      return await this.parseWithOpenAI(cleanText);
    }

    // Fallback to rule-based parsing
    return this.parseWithRules(cleanText);
  }

  private async parseWithOpenAI(text: string): Promise<NLPIntent> {
    try {
      const response = await this.openai!.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a todo management assistant. Parse user messages and return JSON with:
            - action: "list" | "add" | "complete" | "remove" | "edit" | "help" | "unknown"
            - confidence: 0-1
            - entities: {taskText?, taskIndex?, boardName?, newText?}
            
            Examples:
            "What's on my list?" -> {"action": "list", "confidence": 0.9}
            "Add call John" -> {"action": "add", "confidence": 0.9, "entities": {"taskText": "call John"}}
            "Complete task 2" -> {"action": "complete", "confidence": 0.9, "entities": {"taskIndex": 2}}
            "Mark the meeting as done" -> {"action": "complete", "confidence": 0.8, "entities": {"taskText": "meeting"}}
            "Change task 1 to call Sarah" -> {"action": "edit", "confidence": 0.9, "entities": {"taskIndex": 1, "newText": "call Sarah"}}`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      // Fixed: Properly access response content
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      const result = JSON.parse(content) as Omit<NLPIntent, "originalText">;
      return {
        ...result,
        originalText: text,
      };
    } catch (error) {
      console.error("OpenAI parsing error:", error);
      return this.parseWithRules(text);
    }
  }

  private parseWithRules(text: string): NLPIntent {
    const lowerText = text.toLowerCase();

    // List intentions
    if (lowerText.match(/\b(list|show|what's|display|my tasks|my todos)\b/)) {
      return {
        action: "list",
        confidence: 0.8,
        entities: {},
        originalText: text,
      };
    }

    // Add intentions
    const addMatch = lowerText.match(/\b(add|create|remind|new task)\b\s*:?\s*(.+)/);
    if (addMatch && addMatch[2]) {
      // Fixed: Check array index exists
      return {
        action: "add",
        confidence: 0.85,
        entities: { taskText: addMatch[2].trim() }, // Fixed: Use array index and trim
        originalText: text,
      };
    }

    // Complete intentions
    const completeNumberMatch = lowerText.match(
      /\b(complete|done|finished?)\s+(?:task\s+)?(\d+)\b/
    );
    if (completeNumberMatch && completeNumberMatch[2]) {
      // Fixed: Check array index exists
      return {
        action: "complete",
        confidence: 0.9,
        entities: { taskIndex: parseInt(completeNumberMatch[2]) }, // Fixed: Use array index
        originalText: text,
      };
    }

    const completeTextMatch = lowerText.match(
      /\b(mark|complete|finish)\b.*\b(.*?)\b.*\b(done|complete)\b/
    );
    if (completeTextMatch && completeTextMatch[2]) {
      // Fixed: Check array index exists
      return {
        action: "complete",
        confidence: 0.7,
        entities: { taskText: completeTextMatch[2].trim() }, // Fixed: Use array index and trim
        originalText: text,
      };
    }

    // Remove intentions
    const removeNumberMatch = lowerText.match(/\b(remove|delete)\s+(?:task\s+)?(\d+)\b/);
    if (removeNumberMatch && removeNumberMatch[2]) {
      // Fixed: Check array index exists
      return {
        action: "remove",
        confidence: 0.9,
        entities: { taskIndex: parseInt(removeNumberMatch[2]) }, // Fixed: Use array index
        originalText: text,
      };
    }

    // Edit intentions
    const editMatch = lowerText.match(
      /\b(change|edit|update)\s+(?:task\s+)?(\d+)\s+(?:to\s+)?(.+)/
    );
    if (editMatch && editMatch[2] && editMatch[3]) {
      // Fixed: Check array indices exist
      return {
        action: "edit",
        confidence: 0.85,
        entities: {
          taskIndex: parseInt(editMatch[2]), // Fixed: Use array index
          newText: editMatch[3].trim(), // Fixed: Use array index and trim
        },
        originalText: text,
      };
    }

    // Help intentions
    if (lowerText.match(/\b(help|how|what can)\b/)) {
      return {
        action: "help",
        confidence: 0.9,
        entities: {},
        originalText: text,
      };
    }

    return {
      action: "unknown",
      confidence: 0.1,
      entities: {},
      originalText: text,
    };
  }

  // Added: Helper method for extracting task text from general input
  extractTaskFromText(text: string): string | null {
    const cleanText = text.trim();

    // Remove common task-related prefixes
    const cleaned = cleanText
      .replace(/^(add|create|make|do|finish|complete|update|change|edit|remove|delete)\s+/i, "")
      .replace(/^(a|an|the)\s+/i, "")
      .replace(/\s+(task|todo|item)$/i, "")
      .trim();

    return cleaned || null;
  }
}

export const nlpService = new NLPService();
