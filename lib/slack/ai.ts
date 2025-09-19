// lib/intent.ts
// import { model } from "./gemini";

import { model } from "../models";

const prompt = `
You are an assistant that extracts intents and structured data from Slack events. 
Each organization has multiple boards. The user may refer to tasks, boards, or actions conversationally.

Your job:
- Detect the user's intent: "add", "edit", "delete", "list", "mark".
- Extract the relevant board (if mentioned).
- Extract task details (title, new title, id, etc.).
- If the request is unclear, respond with intent "unknown".
- Always return strict JSON (no explanations).

### Output format:
{
  "intent": "<add|edit|delete|list|mark|unknown>",
  "board": "<board name if mentioned, otherwise null>",
  "data": {
    "task": "<task title if available>",
    "newTask": "<new title if edit>",
    "id": "<task id if explicitly given>",
    "filters": "<for list, e.g. 'all' or 'completed'>"
  }
}

### Examples:

User: "Add buy milk to the Marketing board"
Response:
{
  "intent": "add",
  "board": "Marketing",
  "data": { "task": "buy milk", "newTask": null, "id": null, "filters": null }
}

User: "Edit buy milk to buy bread"
Response:
{
  "intent": "edit",
  "board": null,
  "data": { "task": "buy milk", "newTask": "buy bread", "id": null, "filters": null }
}

User: "Mark buy milk as done"
Response:
{
  "intent": "mark",
  "board": null,
  "data": { "task": "buy milk", "newTask": null, "id": null, "filters": null }
}

User: "Delete task 42 from Product board"
Response:
{
  "intent": "delete",
  "board": "Product",
  "data": { "task": null, "newTask": null, "id": "42", "filters": null }
}

User: "List all tasks in Engineering"
Response:
{
  "intent": "list",
  "board": "Engineering",
  "data": { "task": null, "newTask": null, "id": null, "filters": "all" }
}

User: "Show completed tasks"
Response:
{
  "intent": "list",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "filters": "completed" }
}

User: "Show pending tasks"
Response:
{
  "intent": "list",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "filters": "pending" }
}

User: "Help"
Response:
{
  "intent": "help",
  "board": null,
  "data": { "task": null, "newTask": null, "id": null, "filters": "completed" }
}
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
