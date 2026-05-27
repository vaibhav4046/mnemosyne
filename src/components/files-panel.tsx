"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Folder, FileText, Upload, ChevronRight, Home, RefreshCcw, Loader2, ArrowUp, FileType, FileImage, FileCode, FolderPlus, Eye } from "lucide-react";

type FsEntry = {
  name: string;
  path: string;
  rel: string;
  size: number;
  isDir: boolean;
  modified: string;
};

type Root = { name: string; path: string };

function iconFor(name: string, isDir: boolean) {
  if (isDir) return Folder;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf", "doc", "docx"].includes(ext)) return FileType;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return FileImage;
  if (["js", "ts", "tsx", "jsx", "py", "rs", "go", "json", "yaml", "yml", "toml"].includes(ext)) return FileCode;
  return FileText;
}

function colorFor(name: string, isDir: boolean) {
  if (isDir) return "var(--violet)";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "#ef4444";
  if (["doc", "docx"].includes(ext)) return "#3b82f6";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "#22d3a8";
  if (["md", "txt"].includes(ext)) return "var(--brass)";
  if (["js", "ts", "tsx", "jsx"].includes(ext)) return "#f59e0b";
  return "var(--fg-3)";
}

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
  const [selected, setSelected] = useState<FsEntry | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  useEffect(() => { load(); setSelected(null); setPreview(null); }, [root, rel]);

  async function loadPreview(e: FsEntry) {
    setSelected(e);
    setPreview(null);
    if (e.isDir) return;
    if (e.size > 1_000_000) { setPreview("(file too large for preview)"); return; }
    const ext = e.name.split(".").pop()?.toLowerCase() || "";
    if (!["md", "txt", "json", "js", "ts", "tsx", "jsx", "py", "html", "css", "yaml", "yml", "toml", "log", "csv"].includes(ext)) {
      setPreview(`(${ext || "binary"} file — open via ingest to extract text)`);
      return;
    }
    setPreviewLoading(true);
    try {
      const r = await fetch(`/api/files?root=${root}&file=${encodeURIComponent(e.rel)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPreview(d.content?.slice(0, 5000) || "(empty)");
    } catch (err) {
      setPreview(`Error: ${err instanceof Error ? err.message : err}`);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function ingestFile(e: FsEntry) {
    setIngesting(e.path);
    try {
      const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: `file:${e.path}`, title: e.name, filePath: e.path }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "ingest failed");
      toast({ kind: "success", msg: `Ingest queued: ${e.name}`, ttl: 5000 });
      setTimeout(() => setView("agents"), 500);
    } catch (err) {
      toast({ kind: "error", msg: err instanceof Error ? err.message : "ingest failed" });
    } finally {
      setIngesting(null);
    }
  }

  async function ingestFolder(e: FsEntry) {
    setIngesting(e.path);
    try {
      const r = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "file", title: `Folder scan: ${e.name}`, input: { root, rel: e.rel } }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "scan failed");
      toast({ kind: "success", msg: `Folder scan queued: ${e.name}`, ttl: 5000 });
      setTimeout(() => setView("agents"), 500);
    } catch (err) {
      toast({ kind: "error", msg: err instanceof Error ? err.message : "scan failed" });
    } finally {
      setIngesting(null);
    }
  }

  const parts = rel.split("/").filter(Boolean);
  const up = parts.slice(0, -1).join("/");
  const filtered = q ? entries.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())) : entries;

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between glass" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <Folder size={15} style={{ color: "var(--violet)" }} />
          <span className="font-medium text-[14px]">Files</span>
          <span className="text-[11px]" style={{ color: "var(--fg-3)" }}>· {filtered.length} items · sandboxed</span>
        </div>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="filter…" className="input text-[12px] py-1 w-40" aria-label="filter files" />
          <button onClick={load} className="btn-ghost btn" title="refresh" aria-label="refresh"><RefreshCcw size={13} /></button>
        </div>
      </header>

      <div className="px-4 py-2.5 flex items-center gap-1.5 text-[12px] flex-wrap" style={{ borderBottom: "0.5px solid var(--border)" }}>
        {roots.map((r) => (
          <button key={r.name} onClick={() => { setRoot(r.name); setRel(""); }} className={`chip cursor-pointer transition-colors ${root === r.name ? "violet" : ""}`} title={r.path}>
            <Home size={9} /> {r.name}
          </button>
        ))}
        <span style={{ color: "var(--fg-4)" }} className="mx-2">/</span>
        {rel && (
          <button onClick={() => setRel(up)} className="btn-ghost btn p-1" title="up" aria-label="go up"><ArrowUp size={12} /></button>
        )}
        <button onClick={() => setRel("")} style={{ color: "var(--fg-2)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-1)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-2)")}>{root}</button>
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight size={11} style={{ color: "var(--fg-4)" }} />
            <button onClick={() => setRel(parts.slice(0, i + 1).join("/"))} style={{ color: "var(--fg-2)" }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg-1)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-2)")}>{p}</button>
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-hidden flex min-h-0">
        <div className="flex-1 overflow-y-auto scroll-thin min-w-0">
          {loading ? (
            <div className="text-center mt-12 flex justify-center" style={{ color: "var(--fg-3)" }}><Loader2 className="animate-spin" size={18} /></div>
          ) : error ? (
            <div className="text-center mt-12 text-sm px-6">
              <div className="glass-strong rounded-lg p-4 max-w-md mx-auto">
                <p className="font-medium mb-1" style={{ color: "var(--danger)" }}>Cannot read this folder.</p>
                <p className="text-[12px]" style={{ color: "var(--fg-2)" }}>{error}</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center mt-12 text-sm" style={{ color: "var(--fg-3)" }}>{entries.length === 0 ? "Empty folder." : "No matches."}</div>
          ) : (
            <div>
              {filtered.map((e) => {
                const Icon = iconFor(e.name, e.isDir);
                const isSel = selected?.path === e.path;
                return (
                  <div
                    key={e.path}
                    className="px-5 py-2 flex items-center gap-3 group cursor-pointer transition-colors"
                    style={{ background: isSel ? "var(--navy-2)" : "transparent", borderBottom: "0.5px solid rgba(245,240,228,0.03)", borderLeft: isSel ? "2px solid var(--violet)" : "2px solid transparent" }}
                    onClick={() => loadPreview(e)}
                    onDoubleClick={() => e.isDir && setRel(e.rel)}
                  >
                    <Icon size={15} style={{ color: colorFor(e.name, e.isDir) }} />
                    <span className="flex-1 text-[13px] truncate" style={{ color: "var(--fg-1)" }}>{e.name}</span>
                    <span className="text-[10.5px] tabular-nums" style={{ color: "var(--fg-3)" }}>
                      {e.isDir ? "—" : e.size < 1024 ? `${e.size} B` : e.size < 1024 * 1024 ? `${(e.size / 1024).toFixed(1)} KB` : `${(e.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                    {e.isDir ? (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); ingestFolder(e); }}
                        disabled={ingesting === e.path}
                        className="btn btn-ghost text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="scan + ingest folder (first 10 files)"
                        aria-label={`scan folder ${e.name}`}
                      >
                        {ingesting === e.path ? <Loader2 className="animate-spin" size={11} /> : <FolderPlus size={11} />} scan
                      </button>
                    ) : (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); ingestFile(e); }}
                        disabled={ingesting === e.path}
                        className="btn btn-ghost text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="ingest into wiki"
                        aria-label={`ingest ${e.name}`}
                      >
                        {ingesting === e.path ? <Loader2 className="animate-spin" size={11} /> : <Upload size={11} />} ingest
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <div className="w-[360px] shrink-0 overflow-y-auto scroll-thin" style={{ borderLeft: "0.5px solid var(--border)", background: "var(--navy)" }}>
            <div className="px-4 py-3" style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div className="mono text-[10px] tracking-[0.16em] uppercase mb-2 flex items-center gap-2" style={{ color: "var(--fg-3)" }}>
                <Eye size={11} /> Preview
              </div>
              <div className="text-[13px] font-medium truncate" style={{ color: "var(--fg-1)" }}>{selected.name}</div>
              <div className="mono text-[10.5px] mt-1 break-all" style={{ color: "var(--fg-3)" }}>{selected.path}</div>
              <div className="mono text-[10.5px] mt-1" style={{ color: "var(--fg-3)" }}>
                {selected.isDir ? "directory" : `${selected.size.toLocaleString()} bytes · modified ${selected.modified.slice(0, 10)}`}
              </div>
              {!selected.isDir && (
                <button onClick={() => ingestFile(selected)} disabled={ingesting === selected.path} className="btn btn-primary w-full justify-center mt-3 text-[12px]">
                  {ingesting === selected.path ? <Loader2 className="animate-spin" size={11} /> : <Upload size={11} />} ingest into wiki
                </button>
              )}
              {selected.isDir && (
                <button onClick={() => ingestFolder(selected)} disabled={ingesting === selected.path} className="btn btn-primary w-full justify-center mt-3 text-[12px]">
                  {ingesting === selected.path ? <Loader2 className="animate-spin" size={11} /> : <FolderPlus size={11} />} scan folder
                </button>
              )}
            </div>
            <div className="p-4">
              {previewLoading ? (
                <Loader2 className="animate-spin" size={14} style={{ color: "var(--fg-3)" }} />
              ) : preview ? (
                <pre className="mono text-[11px] whitespace-pre-wrap break-all" style={{ color: "var(--fg-2)", lineHeight: 1.55 }}>{preview}</pre>
              ) : (
                <div className="text-[12px]" style={{ color: "var(--fg-3)" }}>No preview.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
