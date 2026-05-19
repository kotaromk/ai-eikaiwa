import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPTS = {
  daily: `You are a friendly English conversation partner for daily life situations.
After each user message, respond in this exact format:

[1 sentence natural English reply]

---FEEDBACK---
✅ **Good points:** [one short comment]
📝 **Better expression:** [one suggestion, or "Natural! 👍"]
💡 **Useful phrase:** [one phrase (日本語訳)]`,

  business: `You are a professional English coach for business situations.
After each user message, respond in this exact format:

[1 sentence professional English reply]

---FEEDBACK---
✅ **Professional points:** [one short comment]
📝 **Better expression:** [one suggestion, or "Well-phrased! 👍"]
💡 **Key phrase:** [one phrase (日本語訳)]`,

  daily_call: `You are a friendly English conversation partner. Reply in exactly 1 short sentence. No feedback, no explanation. Just speak naturally.`,

  business_call: `You are a professional English conversation partner. Reply in exactly 1 short sentence. No feedback, no explanation. Just respond professionally.`,
};

export async function POST(req: NextRequest) {
  try {
    const { messages, scenario, callMode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key is not configured." },
        { status: 500 }
      );
    }

    const key = callMode
      ? (`${scenario}_call` as keyof typeof SYSTEM_PROMPTS)
      : (scenario as keyof typeof SYSTEM_PROMPTS);
    const systemPrompt = SYSTEM_PROMPTS[key] ?? SYSTEM_PROMPTS.daily;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: callMode ? 120 : 400,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return NextResponse.json({ reply: content.text });
  } catch (error) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to get response: ${message}` }, { status: 500 });
  }
}
