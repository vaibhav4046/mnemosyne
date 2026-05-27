import { NextRequest, NextResponse } from "next/server";
import { bootstrapAgents } from "@/lib/agents";
import { spawn } from "@/lib/agents/registry";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  bootstrapAgents();
  const body = (await req.json()) as {
    source: string;
    title?: string;
    text?: string;
    filePath?: string;
  };
  if (!body.source) return NextResponse.json({ error: "source required" }, { status: 400 });
  const job = await spawn("ingest", `Ingest ${body.title || body.source}`, body);
  return NextResponse.json({ jobId: job.id });
}
