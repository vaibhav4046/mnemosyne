import { NextRequest, NextResponse } from "next/server";
import { getPage, writePage, deletePage } from "@/lib/wiki";
import { validSlug, clampText, err } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!validSlug(slug)) return err(400, "invalid slug");
  const page = await getPage(slug);
  if (!page) return err(404, "not found");
  return NextResponse.json(page);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!validSlug(slug)) return err(400, "invalid slug");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "invalid JSON");
  }
  const b = body as { title?: unknown; body?: unknown; tags?: unknown; sources?: unknown };
  const title = clampText(b.title, 200);
  if (!title.trim()) return err(400, "title required");
  const pageBody = clampText(b.body, 200_000);
  const tags = Array.isArray(b.tags) ? b.tags.filter((t) => typeof t === "string").slice(0, 16) : [];
  const sources = Array.isArray(b.sources) ? b.sources.filter((s) => typeof s === "string").slice(0, 32) : [];
  const page = await writePage({ slug, title, body: pageBody, tags, sources });
  return NextResponse.json(page);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!validSlug(slug)) return err(400, "invalid slug");
  await deletePage(slug);
  return NextResponse.json({ ok: true });
}
