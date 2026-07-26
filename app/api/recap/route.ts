import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Skeleton — accepts the files, model call comes next.
export async function POST(req: NextRequest) {
  let body: { files?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request body." }, { status: 400 });
  }
  if (!body.files?.length) {
    return NextResponse.json({ error: "No files received." }, { status: 400 });
  }
  return NextResponse.json({ error: "Model call not wired up yet." }, { status: 501 });
}
