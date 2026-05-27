import { NextResponse } from "next/server";
import { listModels, DEFAULT_CHAT_MODEL, DEFAULT_EMBED_MODEL, OLLAMA_HOST } from "@/lib/ollama";
import { count, sources } from "@/lib/vector";

export const runtime = "nodejs";

export async function GET() {
  const models = await listModels();
  return NextResponse.json({
    host: OLLAMA_HOST,
    models,
    chatModel: DEFAULT_CHAT_MODEL,
    embedModel: DEFAULT_EMBED_MODEL,
    vectorCount: await count(),
    sources: await sources(),
    online: models.length > 0,
  });
}
