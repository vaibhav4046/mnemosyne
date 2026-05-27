import { NextRequest } from "next/server";
import { generateJSON } from "@/lib/ollama";
import { writePage, getPage, rebuildIndex, appendLog } from "@/lib/wiki";
import { upsert } from "@/lib/vector";
import { clampText, err } from "@/lib/validate";

export const runtime = "nodejs";

type FactPlan = { facts: string[]; tags: string[]; reason: string };

export async function POST(req: NextRequest) {
  let body: { userMsg?: unknown; assistantMsg?: unknown; threadTitle?: unknown } = {};
  try { body = await req.json(); } catch { return err(400, "invalid JSON"); }
  const userMsg = clampText(body.userMsg, 4000);
  const assistantMsg = clampText(body.assistantMsg, 8000);
  const threadTitle = clampText(body.threadTitle, 200);
  if (!userMsg || !assistantMsg) return err(400, "userMsg and assistantMsg required");

  const prompt = `You maintain a personal memory file. From this exchange, extract 1-5 atomic FACTS worth remembering long-term (user preferences, project decisions, named entities, deadlines). Skip generic info. Return JSON.

User: ${userMsg}
Assistant: ${assistantMsg}`;

  let plan: FactPlan;
  try {
    plan = await generateJSON<FactPlan>(prompt, `{ "facts": ["short factual sentence"], "tags": ["topic"], "reason": "string" }`);
  } catch (e) {
    return err(500, e instanceof Error ? e.message : "memory extraction failed");
  }

  if (!plan.facts || plan.facts.length === 0) return Response.json({ ok: true, added: 0 });

  const stamp = new Date().toISOString();
  const date = stamp.slice(0, 10);
  const slug = "memory";
  const existing = await getPage(slug);
  const lines: string[] = [];
  if (!existing) {
    lines.push(`> Continuously-updated personal memory extracted from chat threads.`);
    lines.push("");
    lines.push(`## ${date}`);
    lines.push("");
  } else {
    lines.push(existing.body);
    if (!existing.body.includes(`## ${date}`)) {
      lines.push("");
      lines.push(`## ${date}`);
      lines.push("");
    }
  }
  for (const f of plan.facts) {
    lines.push(`- \`${stamp.slice(11, 19)}\` ${f}${threadTitle ? ` _(from [[${threadTitle}]])_` : ""}`);
  }

  const allTags = Array.from(new Set([...(existing?.tags || []), "memory", ...(plan.tags || [])])).slice(0, 12);
  const allSources = Array.from(new Set([...(existing?.sources || []), `chat:${date}`])).slice(0, 30);
  await writePage({ slug, title: "Memory", body: lines.join("\n"), tags: allTags, sources: allSources });

  for (let i = 0; i < plan.facts.length; i++) {
    await upsert({
      id: `memory#${stamp}#${i}`,
      source: `memory:${date}`,
      title: "Memory",
      text: plan.facts[i],
      meta: { from: "memory", threadTitle, stamp },
    });
  }

  await rebuildIndex();
  await appendLog(`memory +${plan.facts.length} facts from "${threadTitle || "chat"}"`);
  return Response.json({ ok: true, added: plan.facts.length, facts: plan.facts });
}
