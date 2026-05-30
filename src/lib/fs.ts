import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export type Roots = Record<string, string>;

export const ROOTS: Roots = {
  vault: process.env.MNEMOSYNE_VAULT || path.join(process.cwd(), "vault"),
  desktop: path.join(os.homedir(), "Desktop"),
  documents: path.join(os.homedir(), "Documents"),
  downloads: path.join(os.homedir(), "Downloads"),
  home: os.homedir(),
};

const ALLOWED_ROOT_KEYS = new Set(Object.keys(ROOTS));

/** True if `child` is `base` itself or strictly inside it (boundary-aware). */
function isInside(base: string, child: string): boolean {
  const rel = path.relative(base, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Resolve `rel` under a NAMED root only (never an arbitrary absolute path).
 * Boundary-aware containment check defeats sibling-prefix escapes.
 */
function resolveSafe(root: keyof Roots | string, rel: string): string {
  if (typeof root !== "string" || !ALLOWED_ROOT_KEYS.has(root)) {
    throw new Error("invalid root");
  }
  const base = path.resolve(ROOTS[root]);
  const target = path.resolve(base, rel || ".");
  if (!isInside(base, target)) {
    throw new Error("path escape blocked");
  }
  return target;
}

/** After-the-fact realpath check: defeats symlink/junction escapes. */
async function assertRealInside(root: keyof Roots | string, target: string): Promise<void> {
  const base = path.resolve(ROOTS[root as string]);
  let realBase: string;
  try {
    realBase = await fs.realpath(base);
  } catch {
    realBase = base; // base may not exist yet (e.g. before first write)
  }
  let realTarget: string;
  try {
    realTarget = await fs.realpath(target);
  } catch {
    // target doesn't exist yet — check its nearest existing parent instead
    let parent = path.dirname(target);
    for (let i = 0; i < 64; i++) {
      try {
        realTarget = await fs.realpath(parent);
        if (!isInside(realBase, realTarget)) throw new Error("path escape blocked (symlink)");
        return;
      } catch {
        const up = path.dirname(parent);
        if (up === parent) return; // reached filesystem root
        parent = up;
      }
    }
    return;
  }
  if (!isInside(realBase, realTarget)) throw new Error("path escape blocked (symlink)");
}

export type FsEntry = {
  name: string;
  path: string;
  rel: string;
  size: number;
  isDir: boolean;
  modified: string;
};

export async function listDir(root: keyof Roots | string, rel = ""): Promise<FsEntry[]> {
  const target = resolveSafe(root, rel);
  await assertRealInside(root, target);
  const entries = await fs.readdir(target, { withFileTypes: true });
  const out: FsEntry[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const abs = path.join(target, e.name);
    try {
      const st = await fs.stat(abs);
      out.push({
        name: e.name,
        path: abs,
        rel: path.join(rel, e.name).replace(/\\/g, "/"),
        size: st.size,
        isDir: e.isDirectory(),
        modified: st.mtime.toISOString(),
      });
    } catch {}
  }
  out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  return out;
}

export async function readFile(root: keyof Roots | string, rel: string): Promise<string> {
  const target = resolveSafe(root, rel);
  await assertRealInside(root, target);
  return fs.readFile(target, "utf8");
}

export async function readFileBytes(root: keyof Roots | string, rel: string): Promise<Buffer> {
  const target = resolveSafe(root, rel);
  await assertRealInside(root, target);
  return fs.readFile(target);
}

export async function writeFile(root: keyof Roots | string, rel: string, content: string): Promise<void> {
  const target = resolveSafe(root, rel);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await assertRealInside(root, target);
  await fs.writeFile(target, content);
}

export async function deleteFile(root: keyof Roots | string, rel: string): Promise<void> {
  const target = resolveSafe(root, rel);
  await assertRealInside(root, target);
  await fs.rm(target, { force: true, recursive: false });
}

export async function statFile(root: keyof Roots | string, rel: string) {
  const target = resolveSafe(root, rel);
  await assertRealInside(root, target);
  return fs.stat(target);
}

/**
 * Resolve an absolute path supplied by the request, but ONLY if it falls under one
 * of the named roots (defeats arbitrary-absolute-path reads via ingest filePath).
 * Returns the realpath-checked absolute path, or throws.
 */
export async function resolveUnderRoots(absPath: string): Promise<string> {
  if (typeof absPath !== "string" || !absPath) throw new Error("invalid path");
  const target = path.resolve(absPath);
  for (const key of ALLOWED_ROOT_KEYS) {
    const base = path.resolve(ROOTS[key]);
    if (isInside(base, target)) {
      let realBase: string, realTarget: string;
      try {
        realBase = await fs.realpath(base);
        realTarget = await fs.realpath(target);
      } catch {
        throw new Error("path not found");
      }
      if (isInside(realBase, realTarget)) return realTarget;
    }
  }
  throw new Error("path is outside allowed roots");
}

const TEXT_EXT = new Set([".md", ".txt", ".json", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".py", ".log", ".csv", ".yaml", ".yml", ".toml"]);
const MAX_EXTRACT_BYTES = 25 * 1024 * 1024;

export async function extractText(absPath: string): Promise<string> {
  const st = await fs.stat(absPath);
  if (st.size > MAX_EXTRACT_BYTES) throw new Error(`file too large (${(st.size / 1024 / 1024).toFixed(1)} MB > 25 MB)`);
  const ext = path.extname(absPath).toLowerCase();
  if (ext === ".pdf") {
    const mod = (await import("pdf-parse")) as unknown as {
      default?: (b: Buffer) => Promise<{ text: string }>;
      pdf?: (b: Buffer) => Promise<{ text: string }>;
    };
    const pdfParse = mod.default || mod.pdf || (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
    const buf = await fs.readFile(absPath);
    const out = await (pdfParse as (b: Buffer) => Promise<{ text: string }>)(buf);
    return out.text;
  }
  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: absPath });
    return result.value;
  }
  if (TEXT_EXT.has(ext)) {
    return fs.readFile(absPath, "utf8");
  }
  // unknown/binary → best-effort utf8, but capped
  return (await fs.readFile(absPath, "utf8")).slice(0, 1_000_000);
}

export function listRoots(): { name: string; path: string }[] {
  return Object.entries(ROOTS).map(([name, p]) => ({ name, path: p }));
}
