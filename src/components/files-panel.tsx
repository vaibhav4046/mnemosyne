"use client";
import { useEffect, useState } from "react";
import { Folder, FileText, Upload, ChevronRight, Home, RefreshCcw, Loader2 } from "lucide-react";

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
  const [roots, setRoots] = useState<Root[]>([]);
  const [root, setRoot] = useState<string>("desktop");
  const [rel, setRel] = useState<string>("");
  const [entries, setEntries] = useState<FsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/files");
      const d = await r.json();
      setRoots(d.roots);
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/files?root=${root}&rel=${encodeURIComponent(rel)}`);
      const d = await r.json();
      setEntries(d.entries || []);
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
      setToast(`Job ${d.jobId} queued — see Agents panel`);
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast(`Failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIngesting(null);
    }
  }

  const parts = rel.split("/").filter(Boolean);

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between border-b border-[var(--border)] glass">
        <div className="flex items-center gap-2.5">
          <Folder size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">Files</span>
          <span className="text-[11px] text-[var(--text-faint)]">· sandboxed roots</span>
        </div>
        <button onClick={load} className="btn-ghost btn">
          <RefreshCcw size={13} /> refresh
        </button>
      </header>

      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 text-[12px] flex-wrap">
        {roots.map((r) => (
          <button
            key={r.name}
            onClick={() => {
              setRoot(r.name);
              setRel("");
            }}
            className={`chip cursor-pointer ${root === r.name ? "border-[var(--accent)] text-white" : ""}`}
            title={r.path}
          >
            <Home size={9} /> {r.name}
          </button>
        ))}
        <span className="text-[var(--text-faint)] mx-2">/</span>
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
        ) : entries.length === 0 ? (
          <div className="text-center text-[var(--text-faint)] mt-12 text-sm">Empty.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]/40">
            {entries.map((e) => (
              <div
                key={e.path}
                className="px-5 py-2.5 flex items-center gap-3 hover:bg-[var(--bg-card)] group"
              >
                {e.isDir ? <Folder size={15} className="text-[var(--accent)]" /> : <FileText size={15} className="text-[var(--text-dim)]" />}
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

      {toast && (
        <div className="absolute bottom-4 right-4 glass-strong rounded-lg px-4 py-2.5 text-[12px] shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
