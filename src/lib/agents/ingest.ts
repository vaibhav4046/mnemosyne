import path from "node:path";
import { generateJSON } from "../ollama";
import { upsert, chunkText, removeBySource } from "../vector";
import { writePage, rebuildIndex, appendLog, slugify, getPage, listPages } from "../wiki";
import { extractText } from "../fs";
import type { AgentRunner } from "./types";

export type IngestInput = {
  source: string;
  title?: string;
  text?: string;
  filePath?: string;
};

type WikiPlan = {
  pages: Array<{
    slug: string;
    title: string;
    tags: string[];
    summary: string;
    sections: Array<{ heading: string; body: string }>;
    see_also: string[];
  }>;
  log: string;
};

function renderPageBody(p: WikiPlan["pages"][number], source: string): string {
  const lines: string[] = [];
  lines.push(`> ${p.summary.trim()}`);
  lines.push("");
  for (const sec of p.sections) {
    lines.push(`## ${sec.heading.trim()}`);
    lines.push("");
    lines.push(sec.body.trim());
    lines.push("");
  }
  if (p.see_also && p.see_also.length) {
    lines.push("## See also");
    lines.push("");
    for (const s of p.see_also) {
      const slug = slugify(s);
      if (slug) lines.push(`- [[${slug}]]`);
    }
    lines.push("");
  }
  lines.push("## Sources");
  lines.push("");
  lines.push(`- ${source}`);
  return lines.join("\n");
}

export const ingestRunner: AgentRunner = async (job, log) => {
  const input = job.input as IngestInput;
  let text = input.text || "";
  let title = input.title || input.source;
  if (input.filePath) {
    log(`Reading ${input.filePath}`);
    text = await extractText(input.filePath);
    title = title || path.basename(input.filePath);
  }
  if (!text.trim()) throw new Error("Empty source text");

  log(`Embedding ${text.length} chars in chunks`);
  await removeBySource(input.source);
  const chunks = chunkText(text, 800, 120);
  for (let i = 0; i < chunks.length; i++) {
    await upsert({
      id: `${input.source}#${i}`,
      source: input.source,
      title,
      text: chunks[i],
      meta: { chunk: i, total: chunks.length },
    });
    if (i % 5 === 0) log(`Embedded ${i + 1}/${chunks.length}`);
  }

  log(`Planning wiki pages with LLM`);
  const existing = await listPages();
  const existingSlugs = existing.map((p) => p.slug).slice(0, 60);

  const planPrompt = `You are the curator of a personal knowledge wiki. Given the source below, output a JSON plan to create or update 4 to 8 atomic wiki pages.

Rules for EACH page:
- "slug": kebab-case, unique, descriptive, max 60 chars.
- "title": clear human title.
- "tags": 2-4 short tags.
- "summary": a single concise sentence used as a blockquote at the top.
- "sections": 3-5 structured sections. Each section has a "heading" and a multi-paragraph "body" with proper blank lines between paragraphs, bullet points where useful, and **bold** for key terms. Bodies should be substantive (100-300 words each).
- "see_also": 3-6 cross-references — REUSE these existing slugs whenever relevant: ${existingSlugs.join(", ") || "(none yet)"}. You may also propose new slugs that other pages in this plan create.
- Cross-link liberally inside section bodies with [[other-slug]] syntax.

Also output one short "log" line summarising what was ingested.

Source title: ${title}
Source id: ${input.source}

Source text (truncated):
"""
${text.slice(0, 8000)}
"""`;

  const plan = await generateJSON<WikiPlan>(
    planPrompt,
    `{ "pages": [{ "slug": "string", "title": "string", "tags": ["string"], "summary": "string", "sections": [{"heading":"string","body":"string"}], "see_also": ["string"] }], "log": "string" }`,
  );

  for (const p of plan.pages) {
    const slug = slugify(p.slug || p.title);
    if (!slug) continue;
    const existingPage = await getPage(slug);
    const renderedBody = renderPageBody(p, input.source);
    const finalBody = existingPage
      ? `${existingPage.body}\n\n---\n\n_Updated from [[${slugify(input.source)}]] at ${new Date().toISOString().slice(0, 10)}_\n\n${renderedBody}`
      : renderedBody;
    await writePage({
      slug,
      title: p.title,
      tags: p.tags,
      sources: [input.source, ...(existingPage?.sources || [])].slice(0, 16),
      body: finalBody,
    });
    log(`Wrote page ${slug} (${p.sections.length} sections)`);
  }

  await rebuildIndex();
  await appendLog(`ingest \`${input.source}\` → ${plan.pages.length} pages. ${plan.log}`);

  return {
    source: input.source,
    pages: plan.pages.map((p) => slugify(p.slug || p.title)).filter(Boolean),
    chunks: chunks.length,
  };
};
