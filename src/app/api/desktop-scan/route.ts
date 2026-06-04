import { NextRequest } from "next/server";
import { bootstrapAgents } from "@/lib/agents";
import { spawn, listJobs } from "@/lib/agents/registry";

export const runtime = "nodejs";

/** Auto-index the user's Desktop/Documents/Downloads into the vector store. */
export async function POST(req: NextRequest) {
  bootstrapAgents();
  let body: { roots?: unknown; maxFiles?: unknown } = {};
  try { body = await req.json(); } catch {}

  // Dedup: if a desktop scan is already running, return it instead of stacking.
  const running = listJobs().find((j) => j.kind === "desktop" && (j.status === "running" || j.status === "queued"));
  if (running) return Response.json({ jobId: running.id, alreadyRunning: true });

  const roots = Array.isArray(body.roots) ? (body.roots as string[]).filter((r) => typeof r === "string") : undefined;
  const maxFiles = typeof body.maxFiles === "number" ? body.maxFiles : undefined;
  const job = await spawn("desktop", "Indexing your computer", { roots, maxFiles });
  return Response.json({ jobId: job.id });
}

export async function GET() {
  bootstrapAgents();
  const jobs = listJobs().filter((j) => j.kind === "desktop");
  const latest = jobs[0];
  return Response.json({
    latest: latest ? { id: latest.id, status: latest.status, result: latest.result, startedAt: latest.startedAt } : null,
  });
}
