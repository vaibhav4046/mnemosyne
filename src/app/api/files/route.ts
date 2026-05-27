import { NextRequest, NextResponse } from "next/server";
import { listDir, readFile, writeFile, listRoots } from "@/lib/fs";
import { validRoot, validRel, clampText, err } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const root = url.searchParams.get("root");
  const rel = url.searchParams.get("rel") || "";
  const file = url.searchParams.get("file");
  if (!root) return NextResponse.json({ roots: listRoots() });
  if (!validRoot(root)) return err(400, "invalid root");
  if (rel && !validRel(rel)) return err(400, "invalid path");
  if (file) {
    if (!validRel(file)) return err(400, "invalid file path");
    try {
      const content = await readFile(root, file);
      return NextResponse.json({ content: content.slice(0, 1_000_000) });
    } catch (e) {
      return err(400, e instanceof Error ? e.message : "read failed");
    }
  }
  try {
    const entries = await listDir(root, rel);
    return NextResponse.json({ entries });
  } catch (e) {
    return err(400, e instanceof Error ? e.message : "list failed");
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "invalid JSON");
  }
  const b = body as { root?: unknown; rel?: unknown; content?: unknown };
  if (!validRoot(b.root)) return err(400, "invalid root");
  if (!validRel(b.rel)) return err(400, "invalid path");
  const content = clampText(b.content, 1_000_000);
  await writeFile(b.root as string, b.rel as string, content);
  return NextResponse.json({ ok: true });
}
