import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/prompt";

export const maxDuration = 60;

type InFile = { name: string; kind: "csv" | "image"; media?: string; data: string };

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  let body: { files?: InFile[]; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  const files = body.files ?? [];
  if (!files.length) {
    return NextResponse.json({ error: "No files received." }, { status: 400 });
  }

  const content: Anthropic.ContentBlockParam[] = [];
  for (const f of files) {
    if (f.kind === "image") {
      content.push({ type: "text", text: `Screenshot: ${f.name}` });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: (f.media as "image/png" | "image/jpeg" | "image/webp" | "image/gif") || "image/png",
          data: f.data,
        },
      });
    } else {
      content.push({ type: "text", text: `File: ${f.name}\n\`\`\`csv\n${f.data}\n\`\`\`` });
    }
  }
  if (body.note?.trim()) {
    content.push({ type: "text", text: `Extra context from Andrea this week: ${body.note.trim()}` });
  }
  content.push({ type: "text", text: "Generate this week's Monday recap." });

  const client = new Anthropic({ apiKey: key });
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
    return NextResponse.json({ message: text });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `Claude call failed: ${detail}` }, { status: 502 });
  }
}
