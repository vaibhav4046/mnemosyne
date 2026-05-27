import { NextRequest, NextResponse } from "next/server";
import { bootstrapAgents } from "@/lib/agents";
import { listJobs, spawn } from "@/lib/agents/registry";
import type { AgentKind } from "@/lib/agents/types";

export const runtime = "nodejs";

export async function GET() {
  bootstrapAgents();
  return NextResponse.json({ jobs: listJobs() });
}

export async function POST(req: NextRequest) {
  bootstrapAgents();
  const body = (await req.json()) as { kind: AgentKind; title?: string; input: unknown };
  const job = await spawn(body.kind, body.title || body.kind, body.input);
  return NextResponse.json({ jobId: job.id });
}
