import { Ollama } from "ollama";
import { readSettings, DEFAULT_MODELS, type ProviderId, type Settings } from "./settings";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";
export const ollama = new Ollama({ host: OLLAMA_HOST });

const OPENAI_COMPAT: Record<string, { base: string; label: string }> = {
  groq: { base: "https://api.groq.com/openai/v1", label: "Groq" },
  openrouter: { base: "https://openrouter.ai/api/v1", label: "OpenRouter" },
};

const TIMEOUT_MS = 60_000;

function modelFor(s: Settings, p: ProviderId): string {
  return s.models[p] || DEFAULT_MODELS[p];
}

/** Ordered list of providers to attempt: active first, then configured fallbacks. */
async function chain(s: Settings): Promise<ProviderId[]> {
  const isReady = (p: ProviderId) => (p === "ollama" ? true : !!s.keys[p as Exclude<ProviderId, "ollama">]);
  const order = [s.provider, ...s.fallback.filter((p) => p !== s.provider)];
  return [...new Set(order)].filter(isReady);
}

// ── OpenAI-compatible (Groq / OpenRouter) ───────────────────────────────────
async function* openaiStream(provider: "groq" | "openrouter", key: string, model: string, messages: ChatMessage[], json: boolean): AsyncGenerator<string> {
  const { base } = OPENAI_COMPAT[provider];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        ...(provider === "openrouter" ? { "HTTP-Referer": "https://ownwiki.app", "X-Title": "Own Wiki" } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: json ? 0.2 : 0.6,
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${provider} ${res.status}: ${txt.slice(0, 160)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const tok = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (tok) yield tok as string;
        } catch {}
      }
    }
  } finally {
    clearTimeout(t);
  }
}

// ── Gemini ───────────────────────────────────────────────────────────────────
function toGemini(messages: ChatMessage[]) {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  return { sys, contents };
}

async function* geminiStream(key: string, model: string, messages: ChatMessage[], json: boolean): AsyncGenerator<string> {
  const { sys, contents } = toGemini(messages);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
        contents,
        generationConfig: { temperature: json ? 0.2 : 0.6, ...(json ? { responseMimeType: "application/json" } : {}) },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`gemini ${res.status}: ${txt.slice(0, 160)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        try {
          const tok = JSON.parse(l.slice(5).trim())?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (tok) yield tok as string;
        } catch {}
      }
    }
  } finally {
    clearTimeout(t);
  }
}

// ── Ollama ───────────────────────────────────────────────────────────────────
async function* ollamaStream(model: string, messages: ChatMessage[], json: boolean): AsyncGenerator<string> {
  const stream = await ollama.chat({
    model,
    messages,
    stream: true,
    keep_alive: KEEP_ALIVE,
    options: { temperature: json ? 0.2 : 0.6, top_p: 0.9, num_ctx: 4096 },
    ...(json ? { format: "json" } : {}),
  });
  for await (const chunk of stream) if (chunk.message?.content) yield chunk.message.content;
}

// ── Unified streaming with fallback ──────────────────────────────────────────
async function* streamProvider(p: ProviderId, s: Settings, messages: ChatMessage[], json: boolean): AsyncGenerator<string> {
  const model = modelFor(s, p);
  if (p === "ollama") yield* ollamaStream(model, messages, json);
  else if (p === "gemini") yield* geminiStream(s.keys.gemini!, model, messages, json);
  else yield* openaiStream(p, s.keys[p]!, model, messages, json);
}

export async function* chatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const s = await readSettings();
  const order = await chain(s);
  if (order.length === 0) throw new Error("No AI provider configured");
  let lastErr: unknown;
  for (const p of order) {
    try {
      let any = false;
      for await (const tok of streamProvider(p, s, messages, false)) {
        any = true;
        yield tok;
      }
      if (any) return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(lastErr instanceof Error ? lastErr.message : "all providers failed");
}

export async function chatOnce(messages: ChatMessage[]): Promise<string> {
  let out = "";
  for await (const tok of chatStream(messages)) out += tok;
  return out;
}

export async function generateJSON<T = unknown>(prompt: string, schemaHint: string): Promise<T> {
  const s = await readSettings();
  const order = await chain(s);
  if (order.length === 0) throw new Error("No AI provider configured");
  const messages: ChatMessage[] = [
    { role: "system", content: `You are a strict JSON generator. Output ONLY valid JSON matching: ${schemaHint}. No prose.` },
    { role: "user", content: prompt },
  ];
  let lastErr: unknown;
  for (const p of order) {
    try {
      let content = "";
      for await (const tok of streamProvider(p, s, messages, true)) content += tok;
      if (!content.trim()) throw new Error("empty");
      try {
        return JSON.parse(content) as T;
      } catch {
        const f = content.replace(/```(?:json)?/gi, "");
        const a = f.indexOf("{"), b = f.lastIndexOf("}");
        if (a >= 0 && b > a) return JSON.parse(f.slice(a, b + 1)) as T;
        throw new Error("invalid JSON");
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(lastErr instanceof Error ? lastErr.message : "all providers failed JSON");
}

// ── Embeddings (Ollama nomic, else Gemini, else none → RAG degrades gracefully)
export async function embed(text: string): Promise<number[]> {
  const s = await readSettings();
  try {
    const res = await ollama.embeddings({ model: s.models.ollama && /embed/.test(s.models.ollama) ? s.models.ollama : "nomic-embed-text", prompt: text, keep_alive: KEEP_ALIVE });
    if (res.embedding?.length) return res.embedding;
  } catch {}
  if (s.keys.gemini) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${encodeURIComponent(s.keys.gemini)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      });
      if (res.ok) {
        const v = (await res.json())?.embedding?.values;
        if (Array.isArray(v) && v.length) return v;
      }
    } catch {}
  }
  return [];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(t));
  return out;
}

// ── Status + connectivity test ───────────────────────────────────────────────
export async function listOllamaModels(): Promise<string[]> {
  try {
    const r = await ollama.list();
    return r.models.map((m) => m.name);
  } catch {
    return [];
  }
}

export type ProviderStatus = {
  provider: ProviderId;
  online: boolean;
  reachable: Record<ProviderId, boolean>;
  ollamaModels: string[];
  activeModel: string;
};

export async function providerStatus(): Promise<ProviderStatus> {
  const s = await readSettings();
  const ollamaModels = await listOllamaModels();
  const reachable: Record<ProviderId, boolean> = {
    ollama: ollamaModels.length > 0,
    groq: !!s.keys.groq,
    gemini: !!s.keys.gemini,
    openrouter: !!s.keys.openrouter,
  };
  const order = await chain(s);
  const online = order.some((p) => reachable[p]);
  return { provider: s.provider, online, reachable, ollamaModels, activeModel: modelFor(s, s.provider) };
}

/** Live test of a provider with a 1-token ping. Returns ok + latency or error. */
export async function testProvider(p: ProviderId): Promise<{ ok: boolean; ms?: number; error?: string; model?: string }> {
  const s = await readSettings();
  if (p !== "ollama" && !s.keys[p as Exclude<ProviderId, "ollama">]) return { ok: false, error: "no key configured" };
  const model = modelFor(s, p);
  const t0 = Date.now();
  try {
    let got = "";
    for await (const tok of streamProvider(p, s, [{ role: "user", content: "Reply with: ok" }], false)) {
      got += tok;
      if (got.length > 0) break;
    }
    return { ok: got.length > 0, ms: Date.now() - t0, model };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 160) : "failed", model };
  }
}

let warmed = false;
export async function warmup(): Promise<void> {
  if (warmed) return;
  warmed = true;
  try {
    const s = await readSettings();
    if ((await listOllamaModels()).length) {
      await Promise.allSettled([
        ollama.chat({ model: s.models.ollama || "llama3.2:3b", messages: [{ role: "user", content: "hi" }], keep_alive: KEEP_ALIVE, options: { num_predict: 1 } }),
        ollama.embeddings({ model: "nomic-embed-text", prompt: "warm", keep_alive: KEEP_ALIVE }),
      ]);
    }
  } catch {
    warmed = false;
  }
}
