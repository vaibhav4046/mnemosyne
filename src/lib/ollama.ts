import { Ollama } from "ollama";

export const DEFAULT_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.2:3b";
export const DEFAULT_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

// Keep models resident in VRAM/RAM between requests → no reload latency on every call.
export const KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || "30m";

// Faster, deterministic-enough sampling for a snappy local assistant.
const CHAT_OPTS = { temperature: 0.6, top_p: 0.9, num_ctx: 4096 } as const;
const JSON_OPTS = { temperature: 0.2, top_p: 0.9, num_ctx: 4096 } as const;

export const ollama = new Ollama({ host: OLLAMA_HOST });

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function listModels(): Promise<string[]> {
  try {
    const res = await ollama.list();
    return res.models.map((m) => m.name);
  } catch {
    return [];
  }
}

export async function embed(text: string, model = DEFAULT_EMBED_MODEL): Promise<number[]> {
  const res = await ollama.embeddings({ model, prompt: text, keep_alive: KEEP_ALIVE });
  return res.embedding;
}

export async function embedBatch(texts: string[], model = DEFAULT_EMBED_MODEL): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(t, model));
  return out;
}

export async function chatOnce(messages: ChatMessage[], model = DEFAULT_CHAT_MODEL): Promise<string> {
  const res = await ollama.chat({ model, messages, stream: false, keep_alive: KEEP_ALIVE, options: CHAT_OPTS });
  return res.message.content;
}

export async function* chatStream(
  messages: ChatMessage[],
  model = DEFAULT_CHAT_MODEL,
): AsyncGenerator<string> {
  const stream = await ollama.chat({ model, messages, stream: true, keep_alive: KEEP_ALIVE, options: CHAT_OPTS });
  for await (const chunk of stream) {
    if (chunk.message?.content) yield chunk.message.content;
  }
}

export async function generateJSON<T = unknown>(
  prompt: string,
  schema_hint: string,
  model = DEFAULT_CHAT_MODEL,
): Promise<T> {
  const sys = `You are a strict JSON generator. Output ONLY valid JSON matching: ${schema_hint}. No prose.`;
  const res = await ollama.chat({
    model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt },
    ],
    format: "json",
    stream: false,
    keep_alive: KEEP_ALIVE,
    options: JSON_OPTS,
  });
  const content = res.message.content ?? "";
  try {
    return JSON.parse(content) as T;
  } catch {
    // Small local models sometimes wrap JSON in prose/code fences — recover the object.
    const fenced = content.replace(/```(?:json)?/gi, "");
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(fenced.slice(start, end + 1)) as T;
      } catch {}
    }
    throw new Error("model returned invalid JSON");
  }
}

let warmed = false;
/**
 * Preload chat + embed models so the first real request is instant.
 * Fire-and-forget on server boot; safe to call repeatedly.
 */
export async function warmup(): Promise<void> {
  if (warmed) return;
  warmed = true;
  try {
    await Promise.allSettled([
      ollama.chat({ model: DEFAULT_CHAT_MODEL, messages: [{ role: "user", content: "hi" }], keep_alive: KEEP_ALIVE, options: { num_predict: 1 } }),
      ollama.embeddings({ model: DEFAULT_EMBED_MODEL, prompt: "warmup", keep_alive: KEEP_ALIVE }),
    ]);
  } catch {
    warmed = false;
  }
}
