"use client";
import { useEffect, useRef, useState } from "react";
import { Cpu, Play, Activity, CheckCircle2, XCircle, Clock, Loader2, Globe, Shuffle } from "lucide-react";
import type { AgentJob } from "@/lib/agents/types";

export function AgentsPanel() {
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [selected, setSelected] = useState<AgentJob | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState("https://news.ycombinator.com");
  const [browserTask, setBrowserTask] = useState("Top 3 headlines and a 1-sentence summary of each.");
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/agents/stream");
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "snapshot") setJobs(ev.jobs);
        else if (ev.type === "update") {
          setJobs((prev) => {
            const idx = prev.findIndex((j) => j.id === ev.job.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = ev.job;
              return next;
            }
            return [ev.job, ...prev];
          });
          setSelected((s) => (s?.id === ev.job.id ? ev.job : s));
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  async function runLint() {
    setBusy("lint");
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "lint", title: "Wiki lint pass", input: {} }),
    });
    setBusy(null);
  }

  async function runBrowser() {
    setBusy("browser");
    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "browser",
        title: `Browse ${browserUrl}`,
        input: { url: browserUrl, task: browserTask },
      }),
    });
    setBusy(null);
  }

  async function runSwarm() {
    setBusy("swarm");
    await Promise.all([
      fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "lint", title: "Swarm: lint", input: {} }),
      }),
      fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "browser",
          title: "Swarm: HN scan",
          input: { url: "https://news.ycombinator.com", task: "Top 5 headlines." },
        }),
      }),
      fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "browser",
          title: "Swarm: arXiv recent ML",
          input: { url: "https://arxiv.org/list/cs.LG/recent", task: "List 5 recent ML titles with one-line summaries." },
        }),
      }),
    ]);
    setBusy(null);
  }

  function badge(status: string) {
    if (status === "running") return <Loader2 size={12} className="animate-spin text-[var(--accent)]" />;
    if (status === "done") return <CheckCircle2 size={12} className="text-[var(--green)]" />;
    if (status === "error") return <XCircle size={12} className="text-[var(--red)]" />;
    return <Clock size={12} className="text-[var(--text-faint)]" />;
  }

  return (
    <div className="flex h-full relative z-10">
      <div className="w-[340px] shrink-0 border-r border-[var(--border)] glass flex flex-col">
        <header className="h-12 px-4 flex items-center gap-2.5 border-b border-[var(--border)]">
          <Cpu size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">Swarm</span>
          <span className="text-[11px] text-[var(--text-faint)] ml-auto">{jobs.length} jobs</span>
        </header>

        <div className="p-3 border-b border-[var(--border)] space-y-2">
          <button onClick={runSwarm} disabled={!!busy} className="btn btn-primary w-full justify-center">
            <Shuffle size={13} /> launch swarm (3 parallel)
          </button>
          <button onClick={runLint} disabled={!!busy} className="btn w-full justify-center">
            <Activity size={13} /> wiki lint pass
          </button>
          <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/60">
            <div className="text-[10px] uppercase text-[var(--text-faint)] tracking-wider px-1">browser agent</div>
            <input value={browserUrl} onChange={(e) => setBrowserUrl(e.target.value)} className="input text-[12px]" />
            <input value={browserTask} onChange={(e) => setBrowserTask(e.target.value)} className="input text-[12px]" />
            <button onClick={runBrowser} disabled={!!busy} className="btn w-full justify-center">
              <Globe size={13} /> browse
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-thin">
          {jobs.length === 0 && (
            <div className="text-[12px] text-[var(--text-faint)] px-4 py-6 text-center">No jobs yet.</div>
          )}
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelected(j)}
              className={`w-full text-left px-3 py-2.5 border-b border-[var(--border)]/40 hover:bg-[var(--bg-card)] ${
                selected?.id === j.id ? "bg-[var(--bg-card)] border-l-2 border-l-[var(--accent)]" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {badge(j.status)}
                <span className="text-[12.5px] font-medium truncate flex-1">{j.title}</span>
                <span className="chip">{j.kind}</span>
              </div>
              <div className="text-[10px] text-[var(--text-faint)] mt-1">
                {j.id} · {j.logs.length} log lines
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {selected ? (
          <div className="p-6 max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              {badge(selected.status)}
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <span className="chip">{selected.kind}</span>
              <span className="chip">{selected.status}</span>
            </div>
            <div className="glass rounded-lg p-3 font-mono text-[11.5px] text-[var(--text-dim)] mb-4 max-h-[40vh] overflow-y-auto scroll-thin">
              {selected.logs.length === 0 ? (
                <span className="text-[var(--text-faint)]">No logs yet.</span>
              ) : (
                selected.logs.map((l, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-[var(--text-faint)]">{l.t.slice(11, 19)}</span>{" "}
                    <span className={l.level === "error" ? "text-[var(--red)]" : l.level === "warn" ? "text-[var(--amber)]" : ""}>
                      {l.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
            {selected.result !== undefined && (
              <div>
                <div className="text-[11px] uppercase text-[var(--text-faint)] tracking-wider mb-2">Result</div>
                {(selected.result as { screenshot?: string }).screenshot && (
                  <img
                    src={(selected.result as { screenshot: string }).screenshot}
                    alt=""
                    className="rounded-lg border border-[var(--border)] mb-3 max-w-full"
                  />
                )}
                <pre className="glass rounded-lg p-3 text-[11px] overflow-x-auto scroll-thin">
                  {JSON.stringify(selected.result, null, 2).slice(0, 4000)}
                </pre>
              </div>
            )}
            {selected.error && (
              <div className="text-[var(--red)] text-[12px] mt-2">Error: {selected.error}</div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-[var(--text-faint)] text-sm">
            <div className="text-center">
              <Play className="mx-auto mb-2 opacity-50" size={28} />
              Select a job or launch the swarm.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
