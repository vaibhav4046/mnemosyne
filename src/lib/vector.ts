import fs from "node:fs/promises";
import path from "node:path";
import { embed } from "./ollama";
import { DATA_DIR } from "./paths";

export type VectorRecord = {
  id: string;
  source: string;
  title: string;
  text: string;
  embedding: number[];
  meta?: Record<string, unknown>;
};

const STORE_PATH = path.join(DATA_DIR, "vectors.json");
const TMP_PATH = STORE_PATH + ".tmp";
const MAX_RECORDS = 100_000;

let cache: VectorRecord[] | null = null;

// Persist serialization: coalesce concurrent writes without dropping the latest state.
let saving: Promise<void> | null = null;
let dirty = false;

// Mutation mutex: load→mutate→persist is atomic, so concurrent upsert/remove can't
// interleave around the embed() await and lose records.
let mutationChain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = mutationChain.then(fn, fn);
  mutationChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<VectorRecord[]> {
  if (cache) return cache;
  await ensureDir();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as VectorRecord[]) : [];
  } catch (e) {
    // Corrupt/unreadable store: back it up rather than silently wiping, then start fresh.
    if ((e as { code?: string }).code !== "ENOENT") {
      try {
        await fs.rename(STORE_PATH, STORE_PATH + ".corrupt-" + Math.floor(performance.now()));
      } catch {}
    }
    cache = [];
  }
  return cache;
}

/** Atomic write (tmp + rename) with coalescing so the final state always lands. */
function persist(): Promise<void> {
  dirty = true;
  if (saving) return saving;
  saving = (async () => {
    try {
      while (dirty) {
        dirty = false;
        await ensureDir();
        await fs.writeFile(TMP_PATH, JSON.stringify(cache ?? []));
        await fs.rename(TMP_PATH, STORE_PATH);
      }
    } finally {
      saving = null;
    }
  })();
  return saving;
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0; // mismatched dims (e.g. after embed-model switch)
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

export function upsert(rec: Omit<VectorRecord, "embedding"> & { embedding?: number[] }): Promise<void> {
  return withLock(async () => {
    const embedding = rec.embedding ?? (await embed(rec.text));
    const all = await load(); // re-read inside the lock, after the embed await
    const record: VectorRecord = { ...rec, embedding };
    const idx = all.findIndex((r) => r.id === rec.id);
    if (idx >= 0) all[idx] = record;
    else {
      if (all.length >= MAX_RECORDS) all.shift(); // bound growth
      all.push(record);
    }
    await persist();
  });
}

export function removeBySource(source: string): Promise<number> {
  return withLock(async () => {
    const all = await load();
    const before = all.length;
    cache = all.filter((r) => r.source !== source);
    await persist();
    return before - (cache?.length ?? 0);
  });
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
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];
  const step = Math.max(1, chunkSize - overlap); // guard infinite loop when overlap>=size
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + chunkSize));
    i += step;
  }
  return chunks;
}
