import fs from "node:fs/promises";
import path from "node:path";
import { upsert, chunkText, removeBySource } from "../vector";
import { writePage, rebuildIndex, appendLog } from "../wiki";
import { extractText, ROOTS } from "../fs";
import { DATA_DIR } from "../paths";
import type { AgentRunner } from "./types";

/**
 * Desktop auto-indexer. Walks the user's Desktop / Documents / Downloads, reads
 * supported files, embeds them into the vector store so chat RAG can answer about
 * them with NO manual ingest, and maintains a "Desktop Files" wiki page (a galaxy
 * node). Idempotent: a manifest tracks path -> mtime so re-runs only touch new or
 * changed files. Bounded hard so a huge home folder can't wedge the app.
 */
export type DesktopInput = { roots?: string[]; maxFiles?: number };

const INDEX_ROOTS = ["desktop", "documents", "downloads"] as const;
const SUPPORTED = new Set([".md", ".txt", ".pdf", ".docx", ".csv", ".json", ".log", ".yaml", ".yml"]);
const MAX_FILES = 48;
const MAX_DEPTH = 2;
const PER_FILE_CHARS = 6000; // index the head of each file — keeps it fast + bounded
const PER_FILE_BYTES = 4 * 1024 * 1024;
const MANIFEST = path.join(DATA_DIR, "desktop-index.json");

type Manifest = Record<string, { mtime: number; chunks: number }>;

async function loadManifest(): Promise<Manifest> {
  try { return JSON.parse(await fs.readFile(MANIFEST, "utf8")); } catch { return {}; }
}
async function saveManifest(m: Manifest): Promise<void> {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); await fs.writeFile(MANIFEST, JSON.stringify(m)); } catch {}
}

type Found = { abs: string; name: string; root: string; mtime: number; size: number };

async function walk(root: string, base: string, dir: string, depth: number, out: Found[], cap: number): Promise<void> {
  if (depth > MAX_DEPTH || out.length >= cap) return;
  let entries: import("node:fs").Dirent[];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (out.length >= cap) return;
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(root, base, abs, depth + 1, out, cap);
    } else if (SUPPORTED.has(path.extname(e.name).toLowerCase())) {
      try {
        const st = await fs.stat(abs);
        if (st.size > 0 && st.size <= PER_FILE_BYTES) out.push({ abs, name: e.name, root, mtime: st.mtimeMs, size: st.size });
      } catch {}
    }
  }
}

export const desktopRunner: AgentRunner = async (job, log) => {
  const input = (job.input || {}) as DesktopInput;
  const roots = (input.roots && input.roots.length ? input.roots : [...INDEX_ROOTS]).filter((r) => ROOTS[r]);
  const cap = Math.min(Math.max(input.maxFiles || MAX_FILES, 1), 200);

  // 1) discover
  const found: Found[] = [];
  for (const r of roots) {
    if (found.length >= cap) break;
    log(`Scanning ${r} (${ROOTS[r]})`);
    await walk(r, ROOTS[r], ROOTS[r], 0, found, cap);
  }
  log(`Found ${found.length} indexable files`);
  if (found.length === 0) {
    return { indexed: 0, skipped: 0, total: 0, note: "No supported files found in Desktop/Documents/Downloads." };
  }

  // 2) index new / changed only
  const manifest = await loadManifest();
  let indexed = 0, skipped = 0, totalChunks = 0;
  const indexedFiles: { name: string; root: string }[] = [];
  for (const f of found) {
    const prev = manifest[f.abs];
    if (prev && Math.abs(prev.mtime - f.mtime) < 1000) { skipped++; continue; }
    try {
      const raw = await extractText(f.abs);
      const text = (raw || "").trim().slice(0, PER_FILE_CHARS);
      if (text.length < 40) { skipped++; continue; }
      const source = `file:${f.abs}`;
      await removeBySource(source);
      const chunks = chunkText(text, 800, 120);
      for (let i = 0; i < chunks.length; i++) {
        await upsert({ id: `${source}#${i}`, source, title: f.name, text: chunks[i], meta: { from: "desktop", path: f.abs, root: f.root, chunk: i } });
      }
      manifest[f.abs] = { mtime: f.mtime, chunks: chunks.length };
      totalChunks += chunks.length;
      indexed++;
      indexedFiles.push({ name: f.name, root: f.root });
      if (indexed % 4 === 0) log(`Indexed ${indexed} files (${totalChunks} chunks)`);
    } catch (e) {
      log(`skip ${f.name} — ${e instanceof Error ? e.message : e}`, "warn");
      skipped++;
    }
  }

  await saveManifest(manifest);

  // 3) maintain a browsable "Desktop Files" wiki page (also a galaxy node)
  try {
    const byRoot: Record<string, string[]> = {};
    for (const abs of Object.keys(manifest)) {
      const r = roots.find((rt) => abs.startsWith(ROOTS[rt])) || "files";
      (byRoot[r] ??= []).push(path.basename(abs));
    }
    const lines = ["> Files auto-indexed from your computer — searchable in Chat with no manual ingest.", ""];
    for (const [r, names] of Object.entries(byRoot)) {
      lines.push(`## ${r.charAt(0).toUpperCase() + r.slice(1)} (${names.length})`, "");
      for (const n of names.slice(0, 60)) lines.push(`- ${n}`);
      lines.push("");
    }
    lines.push(`_Last scan: ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${Object.keys(manifest).length} files indexed._`);
    await writePage({ slug: "desktop-files", title: "Desktop Files", tags: ["desktop", "files", "auto"], sources: ["desktop-scan"], body: lines.join("\n") });
    await rebuildIndex();
  } catch (e) {
    log(`page update failed: ${e instanceof Error ? e.message : e}`, "warn");
  }

  await appendLog(`desktop-scan: indexed ${indexed}, skipped ${skipped}, ${totalChunks} chunks`);
  return { indexed, skipped, total: found.length, chunks: totalChunks, files: indexedFiles.slice(0, 30) };
};
