import { generateJSON } from "../ollama";
import { listPages, getPage, writePage, rebuildIndex, appendLog } from "../wiki";
import { search } from "../vector";
import type { AgentRunner } from "./types";

export type EnrichInput = { slug?: string };

type EnrichPlan = {
  expanded_body: string;
  added_links: string[];
  reason: string;
};

export const enrichRunner: AgentRunner = async (job, log) => {
  const input = job.input as EnrichInput;
  const all = await listPages();
  if (all.length === 0) throw new Error("No pages to enrich");

  let target = input.slug ? all.find((p) => p.slug === input.slug) : null;
  if (!target) {
    const sparse = [...all].sort((a, b) => a.body.length - b.body.length);
    target = sparse[0];
  }
  log(`Enriching ${target.slug} (currently ${target.body.length} chars)`);

  const related = await search(target.title + " " + target.tags.join(" "), 5);
  const relatedSummary = related
    .filter((r) => r.source !== target!.slug)
    .map((r) => `- (${r.source}) ${r.text.slice(0, 200)}`)
    .join("\n");

  const peerSlugs = all
    .filter((p) => p.slug !== target!.slug)
    .map((p) => `${p.slug}: ${p.title}`)
    .slice(0, 40)
    .join("\n");

  const prompt = `You are a wiki curator improving a sparse page. Add more substance: expand sections, add a "## Deeper context" section, add multiple [[wiki-slug]] cross-references to relevant peer pages.

Current page slug: ${target.slug}
Current title: ${target.title}
Current tags: ${target.tags.join(", ")}

Current body:
"""
${target.body}
"""

Available peer pages to cross-link to (slug: title):
${peerSlugs}

Related embedded context that might be useful:
${relatedSummary || "(none)"}

Return JSON with:
- "expanded_body": the full new markdown body (preserve existing content where useful, add new sections, ensure 4+ [[wiki-slug]] cross-links to peer pages, proper blank lines between sections)
- "added_links": list of slugs you added cross-references to
- "reason": one sentence explaining what you improved`;

  const plan = await generateJSON<EnrichPlan>(
    prompt,
    `{ "expanded_body": "string", "added_links": ["string"], "reason": "string" }`,
  );

  await writePage({
    slug: target.slug,
    title: target.title,
    body: plan.expanded_body,
    tags: target.tags,
    sources: target.sources,
  });
  await rebuildIndex();
  await appendLog(`enrich ${target.slug} → +${plan.added_links.length} links. ${plan.reason}`);
  log(`Enriched ${target.slug}: ${plan.reason}`);
  return { slug: target.slug, added_links: plan.added_links, reason: plan.reason, new_length: plan.expanded_body.length };
};
