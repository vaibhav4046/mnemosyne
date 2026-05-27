import { bootstrapAgents } from "@/lib/agents";
import { listJobs, subscribe } from "@/lib/agents/registry";

export const runtime = "nodejs";

export async function GET() {
  bootstrapAgents();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "snapshot", jobs: listJobs() })}\n\n`));
      const unsub = subscribe((job) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "update", job })}\n\n`));
        } catch {}
      });
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      }, 15000);
      return () => {
        clearInterval(ping);
        unsub();
      };
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
