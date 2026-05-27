"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useStore } from "@/store";
import { BookOpen, Plus, Save, RefreshCcw, Tag, Search, X, Trash2, Download, Clock, FileText, Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { WikiPage } from "@/lib/wiki";

type PageList = { pages: (Omit<WikiPage, "body" | "raw"> & { preview: string })[] };
type PageWithMeta = WikiPage & { backlinks: { slug: string; title: string; tags: string[] }[]; words: number; readingMin: number };

export function WikiPanel() {
  const selectedSlug = useStore((s) => s.selectedSlug);
  const setSelectedSlug = useStore((s) => s.setSelectedSlug);
  const openModal = useStore((s) => s.openModal);
  const toast = useStore((s) => s.toast);
  const setView = useStore((s) => s.setView);
  const [pages, setPages] = useState<PageList["pages"]>([]);
  const [page, setPage] = useState<PageWithMeta | null>(null);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [q, setQ] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/wiki");
      const d: PageList = await r.json();
      setPages(d.pages);
      if (!selectedSlug && d.pages.length) setSelectedSlug(d.pages[0].slug);
    } catch (e) {
      toast({ kind: "error", msg: `Failed to load wiki: ${e instanceof Error ? e.message : e}` });
    }
  }, [selectedSlug, setSelectedSlug, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!selectedSlug) { setPage(null); return; }
    (async () => {
      try {
        const r = await fetch(`/api/wiki/${selectedSlug}`);
        if (!r.ok) { setPage(null); return; }
        const d = (await r.json()) as PageWithMeta;
        setPage(d);
        setEditBody(d.body);
        setEditTitle(d.title);
        setEditing(false);
      } catch {
        setPage(null);
      }
    })();
  }, [selectedSlug]);

  async function save() {
    if (!page) return;
    try {
      const r = await fetch(`/api/wiki/${page.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, body: editBody, tags: page.tags, sources: page.sources }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({ error: "save failed" })); throw new Error(d.error); }
      setEditing(false);
      toast({ kind: "success", msg: `Saved ${page.slug}` });
      refresh();
    } catch (e) {
      toast({ kind: "error", msg: e instanceof Error ? e.message : "save failed" });
    }
  }

  function newPage() {
    openModal({
      kind: "prompt",
      title: "New wiki page",
      placeholder: "page title",
      onSubmit: async (title) => {
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
        if (!slug) { toast({ kind: "error", msg: "Title must contain letters or numbers" }); return; }
        try {
          const r = await fetch(`/api/wiki/${slug}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, body: `# ${title}\n\nNew page.` }),
          });
          if (!r.ok) { const d = await r.json().catch(() => ({ error: "create failed" })); throw new Error(d.error); }
          setSelectedSlug(slug);
          await refresh();
          toast({ kind: "success", msg: `Created [[${slug}]]` });
        } catch (e) {
          toast({ kind: "error", msg: e instanceof Error ? e.message : "create failed" });
        }
      },
    });
  }

  function deleteCurrent() {
    if (!page) return;
    openModal({
      kind: "confirm",
      title: `Delete ${page.slug}?`,
      body: "This removes the markdown file. Sources and embeddings stay.",
      danger: true,
      onConfirm: async () => {
        await fetch(`/api/wiki/${page.slug}`, { method: "DELETE" });
        toast({ kind: "success", msg: `Deleted ${page.slug}` });
        setSelectedSlug(null);
        refresh();
      },
    });
  }

  const filtered = pages.filter(
    (p) => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.tags.some((t) => t.includes(q.toLowerCase())),
  );

  const toc = useMemo(() => {
    if (!page) return [];
    const out: { level: number; text: string; id: string }[] = [];
    const re = /^(#{2,3})\s+(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(page.body))) {
      const text = m[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push({ level: m[1].length, text, id });
    }
    return out;
  }, [page]);

  function renderWikilinks(content: string) {
    return content.replace(/\[\[([^\]]+)\]\]/g, (_m, s) => `[\`${s}\`](#/wiki/${s})`);
  }

  return (
    <div className="flex h-full relative z-10">
      <div className="w-[300px] shrink-0 flex flex-col" style={{ borderRight: "0.5px solid var(--border)", background: "var(--navy)" }}>
        <header className="h-12 px-4 flex items-center justify-between" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: "var(--violet)" }} />
            <span className="text-[13px] font-medium">Wiki</span>
            <span className="text-[11px]" style={{ color: "var(--fg-3)" }}>· {pages.length} pages</span>
          </div>
          <div className="flex gap-1">
            <button onClick={refresh} className="btn-ghost btn p-1.5" title="refresh" aria-label="refresh wiki">
              <RefreshCcw size={13} />
            </button>
            <button onClick={newPage} className="btn-ghost btn p-1.5" title="new page" aria-label="new page">
              <Plus size={13} />
            </button>
          </div>
        </header>
        <div className="px-3 py-2" style={{ borderBottom: "0.5px solid var(--border)" }}>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--fg-3)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input pl-7 text-[12px] py-1.5" placeholder="filter…" aria-label="filter pages" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin">
          {filtered.length === 0 && (
            <div className="text-[12px] px-4 py-6 text-center" style={{ color: "var(--fg-3)" }}>
              {pages.length === 0 ? "No pages yet." : "No matches."}
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedSlug(p.slug)}
              className="w-full text-left px-3 py-2.5 transition-colors"
              style={{
                borderBottom: "0.5px solid rgba(245,240,228,0.04)",
                background: selectedSlug === p.slug ? "var(--navy-2)" : "transparent",
                borderLeft: selectedSlug === p.slug ? "2px solid var(--violet)" : "2px solid transparent",
              }}
            >
              <div className="text-[13px] font-medium truncate" style={{ color: "var(--fg-1)" }}>{p.title}</div>
              <div className="text-[10.5px] truncate mt-0.5" style={{ color: "var(--fg-3)" }}>{p.preview}</div>
              {p.tags.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {p.tags.slice(0, 3).map((t) => (
                    <span key={t} className="chip text-[9.5px] py-0">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {page ? (
          <>
            <header className="h-12 px-5 flex items-center justify-between glass" style={{ borderBottom: "0.5px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input text-[14px] py-1 max-w-md" aria-label="page title" />
                ) : (
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="serif text-[18px] truncate" style={{ color: "var(--fg-1)" }}>{page.title}</span>
                    <span className="chip shrink-0">/{page.slug}</span>
                    <span className="mono text-[10.5px]" style={{ color: "var(--fg-3)" }}>
                      <Clock size={9} className="inline -mt-0.5 mr-1" />{page.readingMin} min · <FileText size={9} className="inline -mt-0.5 mx-1" />{page.words.toLocaleString()} words
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0 items-center">
                {!editing && (
                  <div className="flex gap-1 items-center mr-2 pr-2" style={{ borderRight: "0.5px solid var(--border)" }}>
                    <Download size={11} style={{ color: "var(--fg-3)" }} />
                    {(["md", "pdf", "docx", "csv", "html"] as const).map((fmt) => (
                      <a
                        key={fmt}
                        href={`/api/export/${page.slug}?format=${fmt}`}
                        className="btn-ghost btn text-[10.5px] mono tracking-[0.1em] uppercase px-2 py-1"
                        title={`Download .${fmt}`}
                      >
                        {fmt}
                      </a>
                    ))}
                  </div>
                )}
                {editing ? (
                  <>
                    <button onClick={() => { setEditing(false); setEditBody(page.body); setEditTitle(page.title); }} className="btn">
                      <X size={13} /> cancel
                    </button>
                    <button onClick={save} className="btn btn-primary"><Save size={13} /> save</button>
                  </>
                ) : (
                  <>
                    <button onClick={deleteCurrent} className="btn-ghost btn" title="delete page" aria-label="delete page">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => setEditing(true)} className="btn">edit</button>
                  </>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-hidden flex min-h-0">
              <div className="flex-1 overflow-y-auto scroll-thin p-8 min-w-0">
                {editing ? (
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="input scroll-thin font-mono text-[12.5px] min-h-[60vh] w-full" spellCheck={false} aria-label="page body" />
                ) : (
                  <article className="prose-mn max-w-3xl mx-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ children }) => {
                          const text = String(children);
                          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                          return <h2 id={id}>{children}</h2>;
                        },
                        h3: ({ children }) => {
                          const text = String(children);
                          const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                          return <h3 id={id}>{children}</h3>;
                        },
                        a: ({ href, children }) => {
                          if (href?.startsWith("#/wiki/")) {
                            const slug = href.slice("#/wiki/".length);
                            return (
                              <span className="wikilink" onClick={() => { setSelectedSlug(slug); setView("wiki"); }}>
                                {children}
                              </span>
                            );
                          }
                          return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                        },
                      }}
                    >
                      {renderWikilinks(page.body)}
                    </ReactMarkdown>

                    {page.backlinks && page.backlinks.length > 0 && (
                      <section className="mt-12 pt-6" style={{ borderTop: "0.5px solid var(--border)" }}>
                        <div className="mono text-[10px] tracking-[0.18em] uppercase mb-3 flex items-center gap-2" style={{ color: "var(--fg-3)" }}>
                          <Link2 size={11} /> Backlinks · {page.backlinks.length}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {page.backlinks.map((b) => (
                            <button
                              key={b.slug}
                              onClick={() => setSelectedSlug(b.slug)}
                              className="text-left p-3 rounded transition-all"
                              style={{ background: "var(--navy)", border: "0.5px solid var(--border)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                            >
                              <div className="text-[13px] font-medium" style={{ color: "var(--fg-1)" }}>{b.title}</div>
                              <div className="mono text-[10px] mt-0.5" style={{ color: "var(--fg-3)" }}>/{b.slug}</div>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {page.sources.length > 0 && (
                      <section className="mt-8 pt-4" style={{ borderTop: "0.5px solid var(--border)" }}>
                        <div className="mono text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--fg-3)" }}>Sources</div>
                        <div className="flex flex-wrap gap-1.5">
                          {page.sources.map((s) => <span key={s} className="chip">{s}</span>)}
                        </div>
                      </section>
                    )}
                  </article>
                )}
              </div>

              {!editing && toc.length >= 2 && (
                <div className="w-[200px] shrink-0 overflow-y-auto scroll-thin p-4" style={{ borderLeft: "0.5px solid var(--border-2)" }}>
                  <div className="mono text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--fg-3)" }}>On this page</div>
                  <div className="space-y-1">
                    {toc.map((h, i) => (
                      <a key={i} href={`#${h.id}`} className="block text-[11.5px] truncate transition-colors" style={{ color: "var(--fg-2)", paddingLeft: (h.level - 2) * 10 }} onMouseEnter={(e) => (e.currentTarget.style.color = "var(--violet-2)")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-2)")}>
                        {h.text}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--fg-3)" }}>
            {pages.length === 0 ? (
              <div className="text-center">
                <BookOpen className="mx-auto mb-3 opacity-50" size={32} />
                <p>The vault is empty.</p>
                <button onClick={newPage} className="btn btn-primary mt-3"><Plus size={13} /> create first page</button>
              </div>
            ) : <p>Select a page.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
