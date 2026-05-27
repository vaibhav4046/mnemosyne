import { NextRequest } from "next/server";
import { bootstrapAgents } from "@/lib/agents";
import { spawn } from "@/lib/agents/registry";
import { clampText, err, validRel, validRoot } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  bootstrapAgents();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "invalid JSON");
  }
  const b = body as {
    source?: unknown;
    title?: unknown;
    text?: unknown;
    filePath?: unknown;
    root?: unknown;
    rel?: unknown;
  };
  const source = clampText(b.source, 512);
  if (!source.trim()) return err(400, "source required");
  const title = clampText(b.title, 200);
  const text = clampText(b.text, 500_000);
  let filePath: string | undefined;
  if (b.filePath) {
    filePath = clampText(b.filePath, 1024);
  } else if (validRoot(b.root) && validRel(b.rel)) {
    const { ROOTS } = await import("@/lib/fs");
    const path = await import("node:path");
    filePath = path.join(ROOTS[b.root as string], b.rel as string);
  }
  if (!text && !filePath) return err(400, "text or filePath required");
  const job = await spawn("ingest", `Ingest ${title || source}`, { source, title, text, filePath });
  return Response.json({ jobId: job.id });
}
