import { NextResponse } from "next/server";
import { providerStatus, warmup } from "@/lib/providers";
import { readSettings, DEFAULT_MODELS } from "@/lib/settings";
import { count, sources } from "@/lib/vector";
import { OLLAMA_HOST } from "@/lib/providers";

export const runtime = "nodejs";

export async function GET() {
  const [st, s] = await Promise.all([providerStatus(), readSettings()]);
  if (st.reachable.ollama) void warmup();
  return NextResponse.json({
    host: OLLAMA_HOST,
    provider: st.provider,
    chatModel: s.models[st.provider] || DEFAULT_MODELS[st.provider],
    embedModel: "nomic-embed-text",
    models: st.ollamaModels,
    reachable: st.reachable,
    online: st.online,
    vectorCount: await count(),
    sources: await sources(),
  });
}
