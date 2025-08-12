import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOpenAIAgent } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!user.organization.openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please add it in settings." },
        { status: 400 }
      );
    }

    const { input, existingTasks } = await request.json();

    const agent = getOpenAIAgent(user.organization.openaiApiKey);
    const tasks = await agent.generateTodoList(input, existingTasks);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Todo generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate todo list" },
      { status: 500 }
    );
  }
}