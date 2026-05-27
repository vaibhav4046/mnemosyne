"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Folder, FileText, Upload, ChevronRight, Home, RefreshCcw, Loader2, ArrowUp } from "lucide-react";

type FsEntry = {
  name: string;
  path: string;
  rel: string;
  size: number;
  isDir: boolean;
  modified: string;
};

type Root = { name: string; path: string };

export function FilesPanel() {
  const toast = useStore((s) => s.toast);
  const setView = useStore((s) => s.setView);
  const [roots, setRoots] = useState<Root[]>([]);
  const [root, setRoot] = useState<string>("vault");
  const [rel, setRel] = useState<string>("");
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/files");
        const d = await r.json();
        setRoots(d.roots);
      } catch {
        toast({ kind: "error", msg: "Failed to load roots" });
      }
    })();
  }, [toast]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/files?root=${root}&rel=${encodeURIComponent(rel)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "list failed");
      setEntries(d.entries || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "list failed");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [root, rel]);

  async function ingest(e: FsEntry) {
    setIngesting(e.path);
    try {
      const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: `file:${e.path}`, title: e.name, filePath: e.path }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "ingest failed");
      toast({ kind: "success", msg: `Ingest queued for ${e.name}`, ttl: 6000 });
      setTimeout(() => setView("agents"), 500);
    } catch (err) {
      toast({ kind: "error", msg: err instanceof Error ? err.message : "ingest failed" });
    } finally {
      setIngesting(null);
    }
  }

  const parts = rel.split("/").filter(Boolean);
  const up = parts.slice(0, -1).join("/");
  const filtered = q ? entries.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())) : entries;

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between border-b border-[var(--border)] glass">
        <div className="flex items-center gap-2.5">
          <Folder size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">Files</span>
          <span className="text-[11px] text-[var(--text-faint)]">· sandboxed roots</span>
        </div>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter…" className="input text-[12px] py-1 w-40" aria-label="filter files" />
          <button onClick={load} className="btn-ghost btn" title="refresh" aria-label="refresh">
            <RefreshCcw size={13} />
          </button>
        </div>
      </header>

      <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center gap-1.5 text-[12px] flex-wrap">
        {roots.map((r) => (
          <button
            key={r.name}
            onClick={() => {
              setRoot(r.name);
              setRel("");
            }}
            className={`chip cursor-pointer transition-colors ${root === r.name ? "border-[var(--accent)] text-white" : ""}`}
            title={r.path}
          >
            <Home size={9} /> {r.name}
          </button>
        ))}
        <span className="text-[var(--text-faint)] mx-2">/</span>
        {rel && (
          <button onClick={() => setRel(up)} className="btn-ghost btn p-1" title="up" aria-label="go up">
            <ArrowUp size={12} />
          </button>
        )}
        <button onClick={() => setRel("")} className="text-[var(--text-dim)] hover:text-white">
          {root}
        </button>
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={11} className="text-[var(--text-faint)]" />
            <button
              onClick={() => setRel(parts.slice(0, i + 1).join("/"))}
              className="text-[var(--text-dim)] hover:text-white"
            >
              {p}
            </button>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin">
        {loading ? (
          <div className="text-center text-[var(--text-faint)] mt-12 flex justify-center">
            <Loader2 className="animate-spin" size={18} />
          </div>
        ) : error ? (
          <div className="text-center text-[var(--red)] mt-12 text-sm px-6">
            <div className="glass-strong rounded-lg p-4 max-w-md mx-auto">
              <p className="font-medium mb-1">Cannot read this folder.</p>
              <p className="text-[var(--text-dim)] text-[12px]">{error}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[var(--text-faint)] mt-12 text-sm">
            {entries.length === 0 ? "Empty folder." : "No matches."}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]/40">
            {filtered.map((e) => (
              <div
                key={e.path}
                className="px-5 py-2.5 flex items-center gap-3 hover:bg-[var(--bg-card)] group"
              >
                {e.isDir ? (
                  <Folder size={15} className="text-[var(--accent)]" />
                ) : (
                  <FileText size={15} className="text-[var(--text-dim)]" />
                )}
                <button
                  onClick={() => e.isDir && setRel(e.rel)}
                  className="flex-1 text-left text-[13px] truncate"
                  disabled={!e.isDir}
                >
                  {e.name}
                </button>
                <span className="text-[10.5px] text-[var(--text-faint)] tabular-nums">
                  {e.isDir ? "" : (e.size / 1024).toFixed(1) + " KB"}
                </span>
                {!e.isDir && (
                  <button
                    onClick={() => ingest(e)}
                    disabled={ingesting === e.path}
                    className="btn btn-ghost text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="ingest into wiki"
                    aria-label={`ingest ${e.name}`}
                  >
                    {ingesting === e.path ? <Loader2 className="animate-spin" size={11} /> : <Upload size={11} />}
                    ingest
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
