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

    const { noteContent } = await request.json();

    const agent = getOpenAIAgent(user.organization.openaiApiKey);

    const response = await agent.processNoteContent(noteContent);

    return NextResponse.json(response);
  } catch {
    // Handle error silently
    return NextResponse.json(
      { error: "Failed to process with AI agent" },
      { status: 500 }
    );
  }
}