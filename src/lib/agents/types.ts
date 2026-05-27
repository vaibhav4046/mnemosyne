export type AgentKind = "ingest" | "query" | "lint" | "browser" | "file" | "mcp";
export type AgentStatus = "queued" | "running" | "done" | "error";

export type AgentLogLine = { t: string; level: "info" | "warn" | "error"; msg: string };

export type AgentJob = {
  id: string;
  kind: AgentKind;
  title: string;
  input: unknown;
  status: AgentStatus;
  startedAt: string;
  endedAt?: string;
  result?: unknown;
  error?: string;
  logs: AgentLogLine[];
};

export type AgentRunner = (job: AgentJob, log: (msg: string, level?: "info" | "warn" | "error") => void) => Promise<unknown>;
