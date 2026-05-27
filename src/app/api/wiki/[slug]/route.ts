import { NextRequest, NextResponse } from "next/server";
import { getPage, writePage, deletePage } from "@/lib/wiki";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const page = await getPage(slug);
  if (!page) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const body = (await req.json()) as { title: string; body: string; tags?: string[]; sources?: string[] };
  const page = await writePage({ slug, title: body.title, body: body.body, tags: body.tags, sources: body.sources });
  return NextResponse.json(page);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  await deletePage(slug);
  return NextResponse.json({ ok: true });
}
