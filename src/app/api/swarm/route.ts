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

  const tasks =
    kind === "broad"
      ? [
          { url: undefined, task: `Find the top 5 most recent news headlines about: ${topic}` },
          { url: undefined, task: `Find 3 high-quality reference pages or wiki articles about: ${topic}` },
          { url: undefined, task: `Find 3 recent discussions or threads about: ${topic} from Hacker News or Reddit` },
        ]
      : [
          { url: undefined, task: `Search the web and summarise the current state-of-the-art on: ${topic}` },
          { url: "https://arxiv.org/", task: `Find the 3 most relevant recent papers about: ${topic}` },
          { url: "https://news.ycombinator.com/", task: `Find top HN discussions related to: ${topic}` },
        ];

  const jobs = await Promise.all(tasks.map((t) => spawn("browser", `Swarm: ${t.task.slice(0, 60)}`, t)));
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
