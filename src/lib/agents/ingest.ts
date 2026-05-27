import path from "node:path";
import { generateJSON } from "../ollama";
import { upsert, chunkText, removeBySource } from "../vector";
import { writePage, rebuildIndex, appendLog, slugify, getPage } from "../wiki";
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
    body: string;
  }>;
  log: string;
};

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
  const planPrompt = `You are the curator of a personal knowledge wiki. Given the following source, produce a JSON plan that:
- Extracts 1-4 atomic wiki pages worth creating or updating.
- Each page has a kebab-case slug, a concise title, 1-4 tags, a 1-sentence summary, and a markdown body using [[other-slug]] cross-references where useful.
- Add one short log line summarising the ingestion.

Source title: ${title}
Source id: ${input.source}

Source text (truncated):
"""
${text.slice(0, 6000)}
"""`;

  const plan = await generateJSON<WikiPlan>(
    planPrompt,
    `{ "pages": [{ "slug": "string", "title": "string", "tags": ["string"], "summary": "string", "body": "string" }], "log": "string" }`,
  );

  for (const p of plan.pages) {
    const slug = slugify(p.slug || p.title);
    const existing = await getPage(slug);
    const body = existing
      ? `${existing.body}\n\n---\n\n_Updated from [[${input.source}]]_\n\n${p.body}`
      : `> ${p.summary}\n\n${p.body}\n\n## Sources\n- ${input.source}`;
    await writePage({
      slug,
      title: p.title,
      tags: p.tags,
      sources: [input.source],
      body,
    });
    log(`Wrote page ${slug}`);
  }

  await rebuildIndex();
  await appendLog(`ingest \`${input.source}\` → ${plan.pages.length} pages. ${plan.log}`);

  return { pages: plan.pages.map((p) => slugify(p.slug || p.title)), chunks: chunks.length };
};
