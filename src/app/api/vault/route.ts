import { NextRequest } from "next/server";
import { rebuildIndex, listPages } from "@/lib/wiki";
import { err } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { action?: string } = {};
  try { body = await req.json(); } catch {}
  if (body.action === "rebuild-index") {
    await rebuildIndex();
    const pages = await listPages();
    return Response.json({ ok: true, pages: pages.length });
  }
  return err(400, "unknown action");
}
