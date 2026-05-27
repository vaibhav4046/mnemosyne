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

function resolveSafe(root: keyof Roots | string, rel: string): string {
  const base = ROOTS[root] || root;
  const target = path.resolve(base, rel || ".");
  const baseResolved = path.resolve(base);
  if (!target.startsWith(baseResolved)) {
    throw new Error(`Path escape blocked: ${rel}`);
  }
  return target;
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
  return fs.readFile(target, "utf8");
}

export async function readFileBytes(root: keyof Roots | string, rel: string): Promise<Buffer> {
  const target = resolveSafe(root, rel);
  return fs.readFile(target);
}

export async function writeFile(root: keyof Roots | string, rel: string, content: string): Promise<void> {
  const target = resolveSafe(root, rel);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
}

export async function deleteFile(root: keyof Roots | string, rel: string): Promise<void> {
  const target = resolveSafe(root, rel);
  await fs.rm(target, { force: true, recursive: false });
}

export async function statFile(root: keyof Roots | string, rel: string) {
  const target = resolveSafe(root, rel);
  return fs.stat(target);
}

export async function extractText(absPath: string): Promise<string> {
  const ext = path.extname(absPath).toLowerCase();
  if (ext === ".pdf") {
    const mod = (await import("pdf-parse")) as unknown as { default?: (b: Buffer) => Promise<{ text: string }>; pdf?: (b: Buffer) => Promise<{ text: string }> };
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
  if ([".md", ".txt", ".json", ".js", ".ts", ".tsx", ".html", ".css", ".py", ".log", ".csv"].includes(ext)) {
    return fs.readFile(absPath, "utf8");
  }
  return fs.readFile(absPath, "utf8");
}

export function listRoots(): { name: string; path: string }[] {
  return Object.entries(ROOTS).map(([name, p]) => ({ name, path: p }));
}
