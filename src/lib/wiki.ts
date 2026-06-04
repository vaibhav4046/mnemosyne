import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { VAULT_DIR } from "./paths";

export { VAULT_DIR };
export const PAGES_DIR = path.join(VAULT_DIR, "pages");

export type WikiPage = {
  slug: string;
  title: string;
  tags: string[];
  sources: string[];
  links: string[];
  body: string;
  raw: string;
  updated: string;
};

export async function ensureVault(): Promise<void> {
  await fs.mkdir(PAGES_DIR, { recursive: true });
  const must = [
    {
      file: path.join(VAULT_DIR, "CLAUDE.md"),
      content: `# Wiki Schema

This is the Own Wiki personal knowledge vault. The LLM curates these pages.

## Conventions
- Every page lives in \`pages/<slug>.md\`.
- Front-matter: \`title, tags, sources, links, updated\`.
- Cross-references use \`[[wiki-slug]]\` syntax.
- The agent maintains \`index.md\` (catalog) and \`log.md\` (append-only ledger).

## Operations
- **Ingest**: agent reads a source, summarises, creates/updates pages, logs.
- **Query**: chat retrieves cited context from pages + raw sources.
- **Lint**: agent sweeps for contradictions, stale claims, orphans.
- **Maintain**: continuous consistency + cross-ref updates.
`,
    },
    {
      file: path.join(VAULT_DIR, "index.md"),
      content: `# Index\n\n_Auto-maintained catalog of wiki pages._\n`,
    },
    {
      file: path.join(VAULT_DIR, "log.md"),
      content: `# Log\n\n_Append-only ledger of ingests, queries, and lint passes._\n`,
    },
  ];
  for (const m of must) {
    try {
      await fs.access(m.file);
    } catch {
      await fs.writeFile(m.file, m.content);
    }
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function parsePage(raw: string, slug: string): WikiPage {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const body = parsed.content.trim();
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const links = new Set<string>();
  for (const m of body.matchAll(linkRegex)) links.add(slugify(m[1]));
  // YAML coerces unquoted timestamps to Date and numbers to number — normalise
  // everything to strings so downstream (CSV export, UI, search) never sees a
  // non-string where it expects one.
  const asStr = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
  const toStrArr = (v: unknown): string[] => (Array.isArray(v) ? v.map(asStr) : v === undefined || v === null || v === "" ? [] : [asStr(v)]);
  return {
    slug,
    title: data.title !== undefined && data.title !== null ? asStr(data.title) : slug,
    tags: toStrArr(data.tags),
    sources: toStrArr(data.sources),
    links: [...links],
    body,
    raw,
    updated: data.updated !== undefined && data.updated !== null && data.updated !== "" ? asStr(data.updated) : "",
  };
}

export async function listPages(): Promise<WikiPage[]> {
  await ensureVault();
  const files = await fs.readdir(PAGES_DIR);
  const out: WikiPage[] = [];
  for (const f of files) {
    if (!f.endsWith(".md")) continue;
    const slug = f.replace(/\.md$/, "");
    const raw = await fs.readFile(path.join(PAGES_DIR, f), "utf8");
    out.push(parsePage(raw, slug));
  }
  return out;
}

export async function getPage(slug: string): Promise<WikiPage | null> {
  await ensureVault();
  try {
    const raw = await fs.readFile(path.join(PAGES_DIR, `${slug}.md`), "utf8");
    return parsePage(raw, slug);
  } catch {
    return null;
  }
}

export async function writePage(opts: {
  slug?: string;
  title: string;
  body: string;
  tags?: string[];
  sources?: string[];
}): Promise<WikiPage> {
  await ensureVault();
  const slug = opts.slug || slugify(opts.title);
  const fm = matter.stringify(opts.body.trim() + "\n", {
    title: opts.title,
    tags: opts.tags || [],
    sources: opts.sources || [],
    updated: new Date().toISOString(),
  });
  await fs.writeFile(path.join(PAGES_DIR, `${slug}.md`), fm);
  return parsePage(fm, slug);
}

export async function deletePage(slug: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(PAGES_DIR, `${slug}.md`));
    return true;
  } catch {
    return false;
  }
}

export async function appendLog(line: string): Promise<void> {
  await ensureVault();
  const stamp = new Date().toISOString();
  await fs.appendFile(path.join(VAULT_DIR, "log.md"), `\n- \`${stamp}\` ${line}`);
}

export async function rebuildIndex(): Promise<void> {
  const pages = await listPages();
  const byTag: Record<string, WikiPage[]> = {};
  for (const p of pages) {
    for (const t of p.tags.length ? p.tags : ["untagged"]) {
      byTag[t] = byTag[t] || [];
      byTag[t].push(p);
    }
  }
  const lines = ["# Index", "", `_${pages.length} pages._`, ""];
  for (const tag of Object.keys(byTag).sort()) {
    lines.push(`## ${tag}`);
    for (const p of byTag[tag].sort((a, b) => a.title.localeCompare(b.title))) {
      lines.push(`- [[${p.slug}]] — ${p.title}`);
    }
    lines.push("");
  }
  await fs.writeFile(path.join(VAULT_DIR, "index.md"), lines.join("\n"));
}

export function buildGraph(pages: WikiPage[]): { nodes: { id: string; label: string; group: string }[]; links: { source: string; target: string }[] } {
  const ids = new Set(pages.map((p) => p.slug));
  const nodes = pages.map((p) => ({
    id: p.slug,
    label: p.title,
    group: p.tags[0] || "untagged",
  }));
  const links: { source: string; target: string }[] = [];
  for (const p of pages) {
    for (const l of p.links) {
      if (ids.has(l)) links.push({ source: p.slug, target: l });
    }
  }
  return { nodes, links };
}

export { slugify };
