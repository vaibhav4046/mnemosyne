import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, clearKey, publicView, DEFAULT_MODELS, type ProviderId } from "@/lib/settings";
import { providerStatus, testProvider } from "@/lib/providers";

export const runtime = "nodejs";

const IDS: ProviderId[] = ["ollama", "groq", "gemini", "openrouter"];

export async function GET() {
  const [s, st] = await Promise.all([readSettings(), providerStatus()]);
  return NextResponse.json({ settings: publicView(s), status: st, defaultModels: DEFAULT_MODELS });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const action = body.action;

  if (action === "test") {
    const p = body.provider as ProviderId;
    if (!IDS.includes(p)) return NextResponse.json({ error: "invalid provider" }, { status: 400 });
    return NextResponse.json(await testProvider(p));
  }

  if (action === "save") {
    const patch: Record<string, unknown> = {};
    if (typeof body.provider === "string" && IDS.includes(body.provider as ProviderId)) patch.provider = body.provider;
    if (body.models && typeof body.models === "object") patch.models = body.models;
    if (Array.isArray(body.fallback)) patch.fallback = body.fallback;
    if (body.keys && typeof body.keys === "object") {
      // Ignore masked placeholders (value containing the bullet char) so saving the
      // settings form without re-typing a key does not overwrite the real secret.
      const k = body.keys as Record<string, unknown>;
      const clean: Record<string, string> = {};
      for (const id of ["groq", "gemini", "openrouter"]) {
        const v = k[id];
        if (typeof v === "string" && v.trim() && !v.includes("•")) clean[id] = v.trim();
      }
      if (Object.keys(clean).length) patch.keys = clean;
    }
    const next = await writeSettings(patch);
    return NextResponse.json({ settings: publicView(next), status: await providerStatus() });
  }

  if (action === "clearKey") {
    const id = body.provider as string;
    if (!["groq", "gemini", "openrouter"].includes(id)) return NextResponse.json({ error: "invalid provider" }, { status: 400 });
    const next = await clearKey(id as "groq" | "gemini" | "openrouter");
    return NextResponse.json({ settings: publicView(next), status: await providerStatus() });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
