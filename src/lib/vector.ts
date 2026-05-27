import fs from "node:fs/promises";
import path from "node:path";
import { embed } from "./ollama";

export type VectorRecord = {
  id: string;
  source: string;
  title: string;
  text: string;
  embedding: number[];
  meta?: Record<string, unknown>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "vectors.json");

let cache: VectorRecord[] | null = null;
let saving: Promise<void> | null = null;

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<VectorRecord[]> {
  if (cache) return cache;
  await ensureDir();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    cache = JSON.parse(raw) as VectorRecord[];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(): Promise<void> {
  if (saving) return saving;
  saving = (async () => {
    await ensureDir();
    await fs.writeFile(STORE_PATH, JSON.stringify(cache ?? [], null, 0));
  })();
  await saving;
  saving = null;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export async function upsert(rec: Omit<VectorRecord, "embedding"> & { embedding?: number[] }): Promise<void> {
  const all = await load();
  const embedding = rec.embedding ?? (await embed(rec.text));
  const idx = all.findIndex((r) => r.id === rec.id);
  const record: VectorRecord = { ...rec, embedding };
  if (idx >= 0) all[idx] = record;
  else all.push(record);
  await persist();
}

export async function removeBySource(source: string): Promise<number> {
  const all = await load();
  const before = all.length;
  cache = all.filter((r) => r.source !== source);
  await persist();
  return before - (cache?.length ?? 0);
}

export async function search(
  query: string,
  topK = 6,
): Promise<Array<VectorRecord & { score: number }>> {
  const all = await load();
  if (all.length === 0) return [];
  const q = await embed(query);
  const scored = all.map((r) => ({ ...r, score: cosine(q, r.embedding) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export async function count(): Promise<number> {
  const all = await load();
  return all.length;
}

export async function sources(): Promise<string[]> {
  const all = await load();
  return [...new Set(all.map((r) => r.source))];
}

export function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= chunkSize) return [clean];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}
