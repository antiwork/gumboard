import { model } from "../models";

const prompt = `
You are an assistant that extracts intents and structured data from Slack events. 
Each organization has multiple boards. The user may refer to tasks, boards, or actions conversationally.

Your job:
- Detect the user's intent: "add", "edit", "delete", "list", "mark", "unmark", "boards", "help".
- Extract the relevant board (if mentioned).
- Extract task details (title, new title, position number, etc.).
- If the request is unclear, respond with intent "unknown".
- Always return strict JSON (no explanations).

### Output format:
{
  "intent": "<add|edit|delete|list|mark|unmark|boards|help|unknown>",
  "board": "<board name if mentioned, otherwise null>",
  "data": {
    "task": "<task title if available>",
    "newTask": "<new title if edit>",
    "id": "<task id if explicitly given>",
    "position": "<number if user refers to '1st', '2nd', '3rd', 'first', 'second', etc.>",
    "filters": "<for list, e.g. 'all', 'completed', or 'pending'>"
  }
}

### Examples:

User: "Add buy milk to the Marketing board"
Response:
{
  "intent": "add",
  "board": "Marketing",
  "data": { "task": "buy milk", "newTask": null, "id": null, "position": null, "filters": null }
}

User: "list all"
Response:
{
  "intent": "list",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": "all" }
}

User: "delete 3rd one" or "delete the 3rd task" or "delete third one"
Response:
{
  "intent": "delete",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": "3", "filters": null }
}

User: "mark 1st as done" or "mark first task as complete"
Response:
{
  "intent": "mark",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": "1", "filters": null }
}

User: "edit 2nd task to buy bread"
Response:
{
  "intent": "edit",
  "board": null,
  "data": { "task": null, "newTask": "buy bread", "id": null, "position": "2", "filters": null }
}

User: "unmark 1st" or "unmark first task"
Response:
{
  "intent": "unmark",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": "1", "filters": null }
}

User: "delete buy milk"
Response:
{
  "intent": "delete",
  "board": null,
  "data": { "task": "buy milk", "newTask": null, "id": null, "position": null, "filters": null }
}

User: "Edit buy milk to buy bread"
Response:
{
  "intent": "edit",
  "board": null,
  "data": { "task": "buy milk", "newTask": "buy bread", "id": null, "position": null, "filters": null }
}

User: "Mark buy milk as done"
Response:
{
  "intent": "mark",
  "board": null,
  "data": { "task": "buy milk", "newTask": null, "id": null, "position": null, "filters": null }
}

User: "List all tasks in Engineering"
Response:
{
  "intent": "list",
  "board": "Engineering",
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": "all" }
}

User: "Show completed tasks"
Response:
{
  "intent": "list",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": "completed" }
}

User: "Show pending tasks"
Response:
{
  "intent": "list",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": "pending" }
}

User: "list tasks in Marketing board"
Response:
{
  "intent": "list",
  "board": "Marketing",
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": "all" }
}

User: "boards" or "list boards" or "show all boards"
Response:
{
  "intent": "boards",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": null }
}

User: "create board Project X"
Response:
{
  "intent": "create board",
  "board": null,
  "data": { "task": Project X, "newTask": null, "id": null, "position": null, "filters": null }
}

User: "Help" or "what can you do"
Response:
{
  "intent": "help",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "position": null, "filters": null }
}

### Position Number Recognition:
- "1st", "first", "1" → position: "1"
- "2nd", "second", "2" → position: "2"  
- "3rd", "third", "3" → position: "3"
- "4th", "fourth", "4" → position: "4"
- "5th", "fifth", "5" → position: "5"
- etc.

### Board Name Extraction:
- Look for phrases like "in [board]", "to [board]", "[board] board"
- Board names can be partial matches (e.g., "eng" for "Engineering")

### Filter Recognition:
- "all", "everything" → "all"
- "completed", "done", "finished" → "completed"
- "pending", "todo", "incomplete", "remaining" → "pending"
`;

export async function extractIntentAndData(eventText: string) {
  const promptWithInput = `${prompt}\n\nUser: "${eventText}"\nResponse:`;

  const result = await model.generateContent(promptWithInput);
  const rawText = result.response.text();

  // Clean possible markdown code fences
  const clean = rawText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch (err) {
    console.error("Parsing failed. Raw text:", rawText);
    return { intent: "unknown", board: null, data: {} };
  }
}
