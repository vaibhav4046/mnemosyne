import { NextRequest, NextResponse } from "next/server";
import { listDir, readFile, writeFile, listRoots } from "@/lib/fs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const root = url.searchParams.get("root");
  const rel = url.searchParams.get("rel") || "";
  const file = url.searchParams.get("file");
  if (!root) return NextResponse.json({ roots: listRoots() });
  if (file) {
    try {
      const content = await readFile(root, file);
      return NextResponse.json({ content });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "read failed" }, { status: 400 });
    }
  }
  try {
    const entries = await listDir(root, rel);
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "list failed" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { root: string; rel: string; content: string };
  await writeFile(body.root, body.rel, body.content);
  return NextResponse.json({ ok: true });
}
