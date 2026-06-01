import { NextRequest } from "next/server";
import { bootstrapAgents } from "@/lib/agents";
import { spawn, subscribe, getJob } from "@/lib/agents/registry";
import { clampText, err } from "@/lib/validate";

export const runtime = "nodejs";

type SwarmKind = "research" | "broad";

export async function POST(req: NextRequest) {
  bootstrapAgents();
  let body: { topic?: unknown; kind?: unknown } = {};
  try { body = await req.json(); } catch { return err(400, "invalid JSON"); }
  const topic = clampText(body.topic, 200) || "general";
  const kind: SwarmKind = body.kind === "broad" ? "broad" : "research";

  // Each agent searches a DIFFERENT angle of the same topic so the synthesis
  // gets diverse, non-overlapping evidence. query drives the web search; task
  // shapes the grounded summary.
  const tasks =
    kind === "broad"
      ? [
          { query: `${topic}`, task: `Give a clear factual overview of ${topic}: what it is, why it matters, key facts.` },
          { query: `${topic} examples applications`, task: `Describe real applications and examples of ${topic}.` },
          { query: `${topic} advantages limitations`, task: `Explain the advantages, limitations, and trade-offs of ${topic}.` },
        ]
      : [
          { query: `${topic}`, task: `Explain what ${topic} is and how it works, with specifics.` },
          { query: `${topic} techniques methods`, task: `Summarise the main techniques, methods, and approaches in ${topic}.` },
          { query: `${topic} applications use cases`, task: `Summarise real-world applications and use cases of ${topic}.` },
        ];

  const jobs = await Promise.all(tasks.map((t) => spawn("browser", `Swarm: ${t.query}`, { ...t, maxSources: 5 })));
  const lintJob = await spawn("lint", `Swarm: lint after research on ${topic}`, {});
  const ids = [...jobs.map((j) => j.id), lintJob.id];

  let synthSpawned = false;
  const off = subscribe((job) => {
    if (!ids.includes(job.id)) return;
    const allDone = ids.every((id) => {
      const j = getJob(id);
      return j && (j.status === "done" || j.status === "error");
    });
    if (allDone && !synthSpawned) {
      synthSpawned = true;
      spawn("synthesize", `Swarm report: ${topic}`, {
        jobIds: ids.filter((id) => getJob(id)?.status === "done"),
        title: `Swarm report: ${topic}`,
        topic,
      }).catch(() => {});
      off();
    }
  });

  return Response.json({ topic, kind, jobIds: ids });
}
