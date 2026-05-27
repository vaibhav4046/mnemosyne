import { NextResponse } from "next/server";
import { listPages, buildGraph } from "@/lib/wiki";

export const runtime = "nodejs";

export async function GET() {
  const pages = await listPages();
  return NextResponse.json({
    pages: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      tags: p.tags,
      sources: p.sources,
      links: p.links,
      updated: p.updated,
      preview: p.body.slice(0, 200),
    })),
    graph: buildGraph(pages),
    count: pages.length,
  });
}
