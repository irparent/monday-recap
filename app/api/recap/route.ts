import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from "@/lib/agent";

export const maxDuration = 60;

type InFile = { name: string; kind: "csv" | "image"; media?: string; data: string };

// --- deterministic totals -----------------------------------------------------------------
// The agent reasons; the code does arithmetic. Weekly sums are computed here, in code, and
// handed to the agent as a VERIFIED TOTALS block so no multi-row addition ever rides on the
// model. Rows are grouped by the week (Mon-Sun) of their date column when one exists.

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function weekStart(iso: string): string | null {
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return d.toISOString().slice(0, 10);
}

function computeTotals(files: InFile[]): string {
  const lines: string[] = [];
  for (const f of files) {
    if (f.kind !== "csv") continue;
    const rows = f.data.trim().split(/\r?\n/);
    if (rows.length < 2) continue;
    const headers = splitCsvLine(rows[0]).map((h) => h.trim());
    const dateCol = headers.findIndex((h) => /date/i.test(h));
    const groups = new Map<string, { sums: Record<string, number>; count: number }>();
    for (const raw of rows.slice(1)) {
      const cells = splitCsvLine(raw);
      const key = dateCol >= 0 ? weekStart(cells[dateCol]?.trim() ?? "") ?? "all rows" : "all rows";
      const g = groups.get(key) ?? { sums: {}, count: 0 };
      headers.forEach((h, i) => {
        if (i === dateCol) return;
        const v = Number(cells[i]);
        if (cells[i]?.trim() !== "" && Number.isFinite(v)) g.sums[h] = (g.sums[h] ?? 0) + v;
      });
      g.count++;
      groups.set(key, g);
    }
    for (const [key, g] of [...groups.entries()].sort()) {
      const parts = Object.entries(g.sums).map(([h, v]) => `${h}=${v}`);
      if (parts.length) {
        const label = key === "all rows" ? `${g.count} rows` : `week of ${key}, ${g.count} rows`;
        lines.push(`${f.name} (${label}): ${parts.join(", ")}`);
      }
    }
  }
  return lines.length
    ? `VERIFIED TOTALS - computed in code by summing the CSV rows (authoritative; never re-derive these by hand):\n${lines.join("\n")}`
    : "";
}
// ------------------------------------------------------------------------------------------

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
  const totals = computeTotals(files);
  if (totals) content.push({ type: "text", text: totals });
  if (body.note?.trim()) {
    content.push({ type: "text", text: `Extra context from Andrea this week: ${body.note.trim()}` });
  }
  content.push({ type: "text", text: "Generate this week's Monday recap." });

  const client = new Anthropic({ apiKey: key });
  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      // The model thinks before it answers; the budget covers thinking + the full JSON,
      // and low effort keeps a weekly recap fast (and inside the function's time limit).
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    });
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("\n");
    const parsed = extractJson(text);
    if (!parsed) {
      return NextResponse.json({ error: "Model returned unparseable output.", raw: text }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: `Claude call failed: ${detail}` }, { status: 502 });
  }
}

function extractJson(t: string): unknown | null {
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}
