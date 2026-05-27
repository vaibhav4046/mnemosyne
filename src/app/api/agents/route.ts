import { NextRequest } from "next/server";
import { bootstrapAgents } from "@/lib/agents";
import { listJobs, spawn } from "@/lib/agents/registry";
import type { AgentKind } from "@/lib/agents/types";
import { err } from "@/lib/validate";

export const runtime = "nodejs";

const KINDS: AgentKind[] = ["ingest", "query", "lint", "browser", "file", "mcp"];

export async function GET() {
  bootstrapAgents();
  return Response.json({ jobs: listJobs() });
}

export async function POST(req: NextRequest) {
  bootstrapAgents();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "invalid JSON");
  }
  const b = body as { kind?: unknown; title?: unknown; input?: unknown };
  if (typeof b.kind !== "string" || !KINDS.includes(b.kind as AgentKind)) {
    return err(400, "invalid kind");
  }
  const title = typeof b.title === "string" ? b.title.slice(0, 200) : b.kind;
  const job = await spawn(b.kind as AgentKind, title, b.input ?? {});
  return Response.json({ jobId: job.id });
}
