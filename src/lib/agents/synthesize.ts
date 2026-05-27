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

  const plan = await generateJSON<Plan>(
    prompt,
    `{ "slug": "string", "title": "string", "tags": ["string"], "summary": "string", "sections": [{"heading":"string","body":"string"}], "insights": ["string"] }`,
  );

  const slug = slugify(plan.slug || `swarm-${Date.now()}`);
  const lines: string[] = [];
  lines.push(`> ${plan.summary.trim()}`);
  lines.push("");
  for (const s of plan.sections) {
    lines.push(`## ${s.heading.trim()}`);
    lines.push("");
    lines.push(s.body.trim());
    lines.push("");
  }
  if (plan.insights?.length) {
    lines.push("## Key insights");
    lines.push("");
    for (const i of plan.insights) lines.push(`- ${i}`);
    lines.push("");
  }
  lines.push("## Contributing agents");
  lines.push("");
  for (const f of findings) lines.push(`- \`${f.kind}\` — ${f.title} (job \`${f.id}\`)`);

  await writePage({
    slug,
    title: input.title,
    tags: ["swarm", ...(plan.tags || [])].slice(0, 6),
    sources: findings.map((f) => `job:${f.id}`),
    body: lines.join("\n"),
  });
  await rebuildIndex();
  await appendLog(`synthesise ${input.jobIds.length} jobs → [[${slug}]]`);
  log(`Wrote synthesis page: ${slug}`);

  return { slug, title: input.title, insights: plan.insights, contributing: findings.map((f) => f.id) };
};
