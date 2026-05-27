import { NextRequest } from "next/server";
import { chatOnce } from "@/lib/ollama";
import { clampText, err } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { firstMessage?: unknown } = {};
  try { body = await req.json(); } catch { return err(400, "invalid JSON"); }
  const first = clampText(body.firstMessage, 600);
  if (!first) return err(400, "firstMessage required");
  try {
    const title = await chatOnce([
      { role: "system", content: "Summarise the user's question in 3-6 words. No quotes, no punctuation at the end. Title case." },
      { role: "user", content: first },
    ]);
    return Response.json({ title: title.trim().replace(/^["']|["']$/g, "").slice(0, 60) });
  } catch (e) {
    return err(500, e instanceof Error ? e.message : "title failed");
  }
}
