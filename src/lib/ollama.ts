import { Ollama } from "ollama";

export const DEFAULT_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.2:3b";
export const DEFAULT_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";
export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";

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
  const res = await ollama.embeddings({ model, prompt: text });
  return res.embedding;
}

export async function embedBatch(texts: string[], model = DEFAULT_EMBED_MODEL): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) out.push(await embed(t, model));
  return out;
}

export async function chatOnce(messages: ChatMessage[], model = DEFAULT_CHAT_MODEL): Promise<string> {
  const res = await ollama.chat({ model, messages, stream: false });
  return res.message.content;
}

export async function* chatStream(
  messages: ChatMessage[],
  model = DEFAULT_CHAT_MODEL,
): AsyncGenerator<string> {
  const stream = await ollama.chat({ model, messages, stream: true });
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
  });
  return JSON.parse(res.message.content) as T;
}
