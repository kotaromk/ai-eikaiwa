import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPTS = {
  daily: `You are a friendly English conversation partner for daily life situations.
Engage in natural, casual conversation. After each user message, respond in the following format:

[Your natural English response in 2-3 sentences]

---FEEDBACK---
✅ **Good points:** [Comment on what was good about the user's English. If the message was short or simple, still find something positive.]
📝 **Better expression:** [If there's a more natural way to say what they said, suggest it. If their English was already natural, write "Your expression was natural! 👍"]
💡 **Useful phrase:** [One relevant English phrase with Japanese translation in parentheses, e.g., "Nice to meet you! (はじめまして！)"]`,

  business: `You are a professional English coach for business situations.
Engage in realistic business conversation. After each user message, respond in the following format:

[Your professional English response as a business colleague in 2-3 sentences]

---FEEDBACK---
✅ **Professional points:** [Comment on what was professional or effective about the user's business English.]
📝 **Better business expression:** [If there's a more professional way to phrase it, suggest it. If already professional, write "Well-phrased for business! 👍"]
💡 **Key business phrase:** [One key business English phrase with Japanese translation in parentheses, e.g., "Let's circle back on this. (後でこの件に戻りましょう。)"]`,
};

export async function POST(req: NextRequest) {
  try {
    const { messages, scenario } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key is not configured. Please set ANTHROPIC_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[scenario as "daily" | "business"] ?? SYSTEM_PROMPTS.daily;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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
