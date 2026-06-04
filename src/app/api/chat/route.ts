import { NextRequest } from "next/server";
import { chatStream, type ChatMessage } from "@/lib/ollama";
import { search } from "@/lib/vector";
import { listPages, getPage } from "@/lib/wiki";

export const runtime = "nodejs";

// Keep this many most-recent turns verbatim; older turns are compacted into a
// short synopsis so long conversations stay coherent without blowing the context
// window (small local models degrade badly on huge prompts).
const KEEP_VERBATIM = 10;
const SYNOPSIS_PER_MSG = 220;

/** Pull the most recent memory facts straight from the memory page. */
async function recentMemory(limit = 14): Promise<string> {
  try {
    const mem = await getPage("memory");
    if (!mem?.body) return "";
    const bullets = mem.body
      .split("\n")
      .filter((l) => l.trim().startsWith("- "))
      .slice(-limit)
      .map((l) => l.replace(/^\s*-\s*/, "").replace(/`[^`]*`\s*/, "").trim());
    return bullets.join("\n");
  } catch {
    return "";
  }
}

/** Compact a long message list: synopsis of older turns + recent turns verbatim. */
function compact(messages: ChatMessage[]): { synopsis: string; recent: ChatMessage[] } {
  if (messages.length <= KEEP_VERBATIM) return { synopsis: "", recent: messages };
  const older = messages.slice(0, messages.length - KEEP_VERBATIM);
  const recent = messages.slice(messages.length - KEEP_VERBATIM);
  const synopsis = older
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.replace(/\s+/g, " ").slice(0, SYNOPSIS_PER_MSG)}`)
    .join("\n");
  return { synopsis, recent };
}

export async function POST(req: NextRequest) {
  const { messages, useRag = true, useWiki = true } = (await req.json()) as {
    messages: ChatMessage[];
    useRag?: boolean;
    useWiki?: boolean;
  };

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const ragHits = useRag && lastUser ? await search(lastUser.content, 6) : [];
  const memory = await recentMemory();
  const { synopsis, recent } = compact(messages);

  let wikiContext = "";
  if (useWiki) {
    const pages = await listPages();
    wikiContext = pages
      .slice(0, 40)
      .map((p) => `- [[${p.slug}]] ${p.title} — tags: ${p.tags.join(",")}`)
      .join("\n");
  }

  const sys = `You are Own Wiki, a personal knowledge OS with long-term memory of this user. Answer using the cited context and remembered facts when relevant, and stay consistent with what you already know about the user. Use [[wiki-slug]] to link wiki pages and [1], [2] to cite retrieved sources. If the user refers to something discussed earlier, use the memory and conversation synopsis below.

${memory ? `# What you remember about this user:\n${memory}\n` : ""}
${synopsis ? `# Earlier in this conversation (synopsis):\n${synopsis}\n` : ""}
${wikiContext ? `# Wiki pages available:\n${wikiContext}\n` : ""}
${ragHits.length ? `# Retrieved context:\n${ragHits.map((h, i) => `[${i + 1}] (${h.source}) ${h.text}`).join("\n\n")}\n` : ""}`;

  const fullMessages: ChatMessage[] = [{ role: "system", content: sys }, ...recent];

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
