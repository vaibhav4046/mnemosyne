import { listPages } from "@/lib/wiki";
import { upsert, chunkText, removeBySource } from "@/lib/vector";

export const runtime = "nodejs";

/**
 * Embed every wiki page's BODY into the vector store so chat RAG can retrieve the
 * vault's own curated knowledge (previously only ingested sources + desktop files
 * were embedded, so questions answerable from a page like `ollama` returned
 * "I don't have that information"). Idempotent: re-embeds under a stable
 * `page:<slug>` source each run.
 */
export async function POST() {
  const pages = await listPages();
  let indexed = 0, chunks = 0;
  for (const p of pages) {
    const body = (p.body || "").trim();
    if (body.length < 30) continue;
    const source = `page:${p.slug}`;
    await removeBySource(source);
    const text = `${p.title}\n\n${body}`;
    const cs = chunkText(text, 800, 120);
    for (let i = 0; i < cs.length; i++) {
      await upsert({ id: `${source}#${i}`, source, title: p.title, text: cs[i], meta: { from: "page", slug: p.slug, chunk: i } });
    }
    chunks += cs.length;
    indexed++;
  }
  return Response.json({ indexed, chunks, pages: pages.length });
}

export async function GET() {
  const pages = await listPages();
  return Response.json({ pages: pages.length });
}
