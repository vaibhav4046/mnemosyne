import { nanoid } from "nanoid";
import PQueue from "p-queue";
import type { AgentJob, AgentKind, AgentRunner } from "./types";

const queue = new PQueue({ concurrency: 4 });
const jobs = new Map<string, AgentJob>();
const runners = new Map<AgentKind, AgentRunner>();
const subscribers = new Set<(job: AgentJob) => void>();

const MAX_JOBS = 80;
const MAX_LOGS = 400;

// Per-kind hard timeout so a hung runner can't wedge a queue slot (and stall swarms).
const TIMEOUT_MS: Record<AgentKind, number> = {
  ingest: 180_000,
  enrich: 180_000,
  lint: 120_000,
  query: 90_000,
  browser: 180_000,
  file: 300_000,
  synthesize: 180_000,
  mcp: 60_000,
  desktop: 600_000,
};

export function register(kind: AgentKind, runner: AgentRunner) {
  runners.set(kind, runner);
}

export function subscribe(fn: (job: AgentJob) => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

function emit(job: AgentJob) {
  for (const fn of [...subscribers]) {
    try {
      fn(job);
    } catch {}
  }
}

function evictOld() {
  if (jobs.size <= MAX_JOBS) return;
  const sorted = [...jobs.values()].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
  for (const j of sorted) {
    if (jobs.size <= MAX_JOBS) break;
    if (j.status === "done" || j.status === "error") jobs.delete(j.id);
  }
}

export function listJobs(): AgentJob[] {
  return [...jobs.values()].sort((a, b) => (b.startedAt > a.startedAt ? 1 : -1));
}

export function getJob(id: string): AgentJob | undefined {
  return jobs.get(id);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`agent timed out after ${Math.round(ms / 1000)}s`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
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
  evictOld();
  emit(job);

  // Fire-and-forget but every path sets a terminal status — a job can never get stuck "running".
  queue
    .add(async () => {
      job.status = "running";
      job.startedAt = new Date().toISOString();
      emit(job);
      const log = (msg: string, level: "info" | "warn" | "error" = "info") => {
        job.logs.push({ t: new Date().toISOString(), level, msg });
        if (job.logs.length > MAX_LOGS) job.logs.splice(0, job.logs.length - MAX_LOGS);
        emit(job);
      };
      try {
        job.result = await withTimeout(Promise.resolve(runner(job, log)), TIMEOUT_MS[kind] ?? 120_000);
        job.status = "done";
      } catch (e) {
        job.error = e instanceof Error ? e.message : String(e);
        job.status = "error";
        job.logs.push({ t: new Date().toISOString(), level: "error", msg: job.error });
      }
      job.endedAt = new Date().toISOString();
      emit(job);
    })
    .catch((e) => {
      // Absolute backstop: queue-level failure still resolves the job.
      job.error = e instanceof Error ? e.message : String(e);
      job.status = "error";
      job.endedAt = new Date().toISOString();
      emit(job);
    });

  return job;
}

export function pending() {
  return queue.size + queue.pending;
}
