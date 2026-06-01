import { generateJSON } from "../ollama";
import { writePage, rebuildIndex, appendLog, slugify } from "../wiki";
import { getJob } from "./registry";
import type { AgentRunner } from "./types";

export type SynthesizeInput = {
  jobIds: string[];
  title: string;
  topic?: string;
};

type Plan = {
  slug: string;
  title: string;
  tags: string[];
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  insights: string[];
};

export const synthesizeRunner: AgentRunner = async (job, log) => {
  const input = job.input as SynthesizeInput;
  log(`Synthesising ${input.jobIds.length} job results`);

  const findings: Array<{ id: string; kind: string; title: string; result: unknown }> = [];
  for (const id of input.jobIds) {
    const j = getJob(id);
    if (!j) {
      log(`Job ${id} missing`, "warn");
      continue;
    }
    if (j.status !== "done") {
      log(`Job ${id} not done (${j.status})`, "warn");
      continue;
    }
    findings.push({ id, kind: j.kind, title: j.title, result: j.result });
  }
  if (findings.length === 0) throw new Error("No completed jobs to synthesise");

  const findingsText = findings
    .map((f, i) => `--- Finding ${i + 1} (${f.kind}: ${f.title}) ---\n${JSON.stringify(f.result, null, 2).slice(0, 4000)}`)
    .join("\n\n");

  const prompt = `You are synthesising parallel agent findings into a single coherent wiki page. ${input.topic ? `Topic context: ${input.topic}.` : ""}

Findings from ${findings.length} agents:
${findingsText}

Produce a JSON page plan that:
- "slug": kebab-case, short (e.g. "swarm-report-${Date.now()}").
- "title": "${input.title}".
- "tags": ["swarm", ...up to 3 topic tags].
- "summary": one concise sentence.
- "sections": 3-5 sections. Include one section per finding labelled with its agent, plus a "Key insights" section and a "Cross-references" section that links related concepts as [[slug]].
- "insights": 3-7 high-leverage takeaways across the findings.

Use proper markdown — blank lines between paragraphs, bullets where useful, **bold** for key terms.`;

  let plan: Plan | null = null;
  try {
    plan = await generateJSON<Plan>(
      prompt,
      `{ "slug": "string", "title": "string", "tags": ["string"], "summary": "string", "sections": [{"heading":"string","body":"string"}], "insights": ["string"] }`,
    );
  } catch (e) {
    log(`structured synthesis failed (${e instanceof Error ? e.message : e}) — using fallback`, "warn");
  }

  // Defend against any missing/scalar field a small model might emit.
  const summary = typeof plan?.summary === "string" && plan.summary.trim() ? plan.summary.trim() : `Synthesis of ${findings.length} research agents on ${input.topic || "the topic"}.`;
  const sections = Array.isArray(plan?.sections) ? plan!.sections.filter((s) => s && typeof s.body === "string" && s.body.trim()) : [];
  // Strip any leading bullet/number marker the model prepended (e.g. "* ", "- ",
  // "• ", "1. ") so we don't render a double marker after wrapping in "- ".
  const stripBullet = (s: string) => s.trim().replace(/^([-*•‣]|\d+[.)])\s+/, "").trim();
  const insights = Array.isArray(plan?.insights)
    ? plan!.insights.filter((x) => typeof x === "string" && x.trim()).map(stripBullet).filter(Boolean)
    : [];
  const tags = Array.isArray(plan?.tags) ? plan!.tags.filter((x) => typeof x === "string") : [];
  const baseSlug = typeof plan?.slug === "string" && plan.slug.trim() ? plan.slug : `swarm-${input.topic || "report"}`;
  const slug = slugify(baseSlug) || `swarm-report`;

  const lines: string[] = [];
  lines.push(`> ${summary}`);
  lines.push("");

  // Clean a model-written heading: drop leading "#"/bullet markers and surrounding
  // bold so we don't render "## **Heading**" (redundant bold inside an H2).
  const cleanHeading = (h: string) =>
    h.trim().replace(/^#+\s*/, "").replace(/^([-*•‣]|\d+[.)])\s+/, "").replace(/^\*\*(.+?)\*\*$/, "$1").trim();
  if (sections.length) {
    for (const s of sections) {
      const heading = typeof s.heading === "string" && s.heading.trim() ? cleanHeading(s.heading) : "Findings";
      lines.push(`## ${heading || "Findings"}`);
      lines.push("");
      lines.push(s.body.trim());
      lines.push("");
    }
  } else {
    // Fallback: render each agent's grounded answer directly so we never lose data.
    for (const f of findings) {
      const r = f.result as { answer?: string; sources?: { n: number; title: string; url: string }[]; query?: string } | undefined;
      lines.push(`## ${r?.query || f.title}`);
      lines.push("");
      lines.push(typeof r?.answer === "string" && r.answer.trim() ? r.answer.trim() : "_(no answer)_");
      if (Array.isArray(r?.sources) && r!.sources.length) {
        lines.push("");
        lines.push("**Sources:** " + r!.sources.map((s) => `[${s.n}] ${s.url}`).join(" · "));
      }
      lines.push("");
    }
  }

  if (insights.length) {
    lines.push("## Key insights");
    lines.push("");
    for (const i of insights) lines.push(`- ${i}`);
    lines.push("");
  }

  // Always append a real sources section aggregated from the agents.
  const allSources = new Set<string>();
  for (const f of findings) {
    const r = f.result as { sources?: { url: string }[] } | undefined;
    if (Array.isArray(r?.sources)) for (const s of r!.sources) if (s?.url) allSources.add(s.url);
  }
  if (allSources.size) {
    lines.push("## Sources");
    lines.push("");
    for (const u of allSources) lines.push(`- ${u}`);
    lines.push("");
  }

  lines.push("## Contributing agents");
  lines.push("");
  for (const f of findings) lines.push(`- \`${f.kind}\` — ${f.title} (job \`${f.id}\`)`);

  await writePage({
    slug,
    title: input.title,
    tags: ["swarm", ...tags].slice(0, 6),
    sources: findings.map((f) => `job:${f.id}`),
    body: lines.join("\n"),
  });
  await rebuildIndex();
  await appendLog(`synthesise ${findings.length} jobs → [[${slug}]]`);
  log(`Wrote synthesis page: ${slug} (${findings.length} agents, ${allSources.size} sources)`);

  return { slug, title: input.title, insights, sources: [...allSources], contributing: findings.map((f) => f.id) };
};
