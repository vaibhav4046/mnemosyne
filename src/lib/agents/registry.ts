import { nanoid } from "nanoid";
import PQueue from "p-queue";
import type { AgentJob, AgentKind, AgentRunner } from "./types";

const queue = new PQueue({ concurrency: 4 });
const jobs = new Map<string, AgentJob>();
const runners = new Map<AgentKind, AgentRunner>();
const subscribers = new Set<(job: AgentJob) => void>();

export function register(kind: AgentKind, runner: AgentRunner) {
  runners.set(kind, runner);
}

export function subscribe(fn: (job: AgentJob) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function emit(job: AgentJob) {
  for (const fn of subscribers) {
    try {
      fn(job);
    } catch {}
  }
}

export function listJobs(): AgentJob[] {
  return [...jobs.values()].sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));
}

export function getJob(id: string): AgentJob | undefined {
  return jobs.get(id);
}

export async function spawn(kind: AgentKind, title: string, input: unknown): Promise<AgentJob> {
  const runner = runners.get(kind);
  if (!runner) throw new Error(`No runner for ${kind}`);
  const job: AgentJob = {
    id: nanoid(8),
    kind,
    title,
    input,
    status: "queued",
    startedAt: new Date().toISOString(),
    logs: [],
  };
  jobs.set(job.id, job);
  emit(job);
  queue.add(async () => {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    emit(job);
    const log = (msg: string, level: "info" | "warn" | "error" = "info") => {
      job.logs.push({ t: new Date().toISOString(), level, msg });
      emit(job);
    };
    try {
      job.result = await runner(job, log);
      job.status = "done";
    } catch (e) {
      job.error = e instanceof Error ? e.message : String(e);
      job.status = "error";
      log(job.error, "error");
    }
    job.endedAt = new Date().toISOString();
    emit(job);
  });
  return job;
}

export function pending() {
  return queue.size + queue.pending;
}
