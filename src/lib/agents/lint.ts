import { generateJSON } from "../ollama";
import { listPages, appendLog } from "../wiki";
import type { AgentRunner } from "./types";

type LintReport = {
  contradictions: string[];
  orphans: string[];
  stale: string[];
  suggested_links: Array<{ from: string; to: string; reason: string }>;
};

export const lintRunner: AgentRunner = async (job, log) => {
  const pages = await listPages();
  log(`Linting ${pages.length} pages`);
  const ids = new Set(pages.map((p) => p.slug));
  const incoming: Record<string, number> = {};
  for (const p of pages) for (const l of p.links) incoming[l] = (incoming[l] || 0) + 1;
  const orphans = pages.filter((p) => !incoming[p.slug]).map((p) => p.slug);

  const summary = pages
    .map((p) => `- ${p.slug}: ${p.title} | tags: ${p.tags.join(",")} | links: ${p.links.join(",")}`)
    .join("\n");

  const prompt = `You are a wiki linter. Given this catalog of pages, list:
1) contradictions across pages (slug pairs + brief reason)
2) candidate orphan pages (already detected: ${orphans.join(", ") || "none"})
3) stale pages (claims that look dated)
4) suggested cross-links between pages

Catalog:
${summary.slice(0, 6000)}`;

  const rep = await generateJSON<LintReport>(
    prompt,
    `{ "contradictions": ["string"], "orphans": ["string"], "stale": ["string"], "suggested_links": [{"from":"string","to":"string","reason":"string"}] }`,
  );

  const filteredLinks = rep.suggested_links.filter((l) => ids.has(l.from) && ids.has(l.to));
  await appendLog(`lint pass: ${rep.contradictions.length} contradictions, ${orphans.length} orphans, ${filteredLinks.length} link suggestions`);
  log(`Found ${rep.contradictions.length} contradictions, ${filteredLinks.length} link suggestions`);
  return { ...rep, orphans, suggested_links: filteredLinks };
};
