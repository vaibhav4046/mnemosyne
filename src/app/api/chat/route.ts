import { NextRequest } from "next/server";
import { chatStream, type ChatMessage } from "@/lib/ollama";
import { search } from "@/lib/vector";
import { listPages } from "@/lib/wiki";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages, useRag = true, useWiki = true } = (await req.json()) as {
    messages: ChatMessage[];
    useRag?: boolean;
    useWiki?: boolean;
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const ragHits = useRag && lastUser ? await search(lastUser.content, 5) : [];

  let wikiContext = "";
  if (useWiki) {
    const pages = await listPages();
    wikiContext = pages
      .slice(0, 40)
      .map((p) => `- [[${p.slug}]] ${p.title} — tags: ${p.tags.join(",")}`)
      .join("\n");
  }

  const sys = `You are Own Wiki, a personal knowledge OS. You answer using the cited context when relevant. Use [[wiki-slug]] to link to wiki pages. Use [1], [2] etc. to cite sources.

${wikiContext ? `# Wiki pages available:\n${wikiContext}\n` : ""}
${ragHits.length ? `# Retrieved context:\n${ragHits.map((h, i) => `[${i + 1}] (${h.source}) ${h.text}`).join("\n\n")}\n` : ""}`;

  const fullMessages: ChatMessage[] = [{ role: "system", content: sys }, ...messages];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "citations", citations: ragHits.map((h) => ({ source: h.source, title: h.title, score: h.score })) })}\n\n`));
        for await (const tok of chatStream(fullMessages)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text: tok })}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: e instanceof Error ? e.message : String(e) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
