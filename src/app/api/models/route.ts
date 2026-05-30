import { NextResponse } from "next/server";
import { listModels, warmup, DEFAULT_CHAT_MODEL, DEFAULT_EMBED_MODEL, OLLAMA_HOST } from "@/lib/ollama";
import { count, sources } from "@/lib/vector";

export const runtime = "nodejs";

export async function GET() {
  const models = await listModels();
  // Warm models the moment Ollama is reachable so the first chat is instant.
  if (models.length > 0) void warmup();
  return NextResponse.json({
    host: OLLAMA_HOST,
    chatModel: DEFAULT_CHAT_MODEL,
    embedModel: DEFAULT_EMBED_MODEL,
    vectorCount: await count(),
    sources: await sources(),
    online: models.length > 0,
    models,
  });
}
