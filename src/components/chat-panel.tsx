"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useStore } from "@/store";
import { Send, Link as LinkIcon, Globe, Upload, History, Square, Copy, RefreshCcw, Check, Quote } from "lucide-react";
import { nanoid } from "nanoid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SUGGESTIONS = [
  { kind: "wiki", q: "What is Own Wiki and how does the self-improving loop work?" },
  { kind: "concept", q: "Summarise the Karpathy LLM-wiki pattern in 3 bullets." },
  { kind: "agents", q: "How does the multi-step browser agent decide what to click?" },
  { kind: "rag", q: "What's the difference between RAG retrieval and the wiki layer here?" },
];

export function ChatPanel() {
  const chats = useStore((s) => s.chats);
  const appendChat = useStore((s) => s.appendChat);
  const updateChat = useStore((s) => s.updateChat);
  const setView = useStore((s) => s.setView);
  const setSelectedSlug = useStore((s) => s.setSelectedSlug);
  const toast = useStore((s) => s.toast);
  const modelInfo = useStore((s) => s.modelInfo);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ragOn, setRagOn] = useState(true);
  const [browseOn, setBrowseOn] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }

  async function send(promptText?: string) {
    const text = promptText ?? input;
    if (!text.trim() || busy) return;
    const userTurn = { id: nanoid(6), role: "user" as const, content: text };
    const asstId = nanoid(6);
    appendChat(userTurn);
    appendChat({ id: asstId, role: "assistant", content: "", streaming: true });
    if (!promptText) setInput("");
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chats.filter((c) => !c.streaming).map((c) => ({ role: c.role, content: c.content })),
            { role: "user", content: text },
          ],
          useRag: ragOn,
        }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("no response body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") {
              acc += ev.text;
              updateChat(asstId, { content: acc });
            } else if (ev.type === "citations") {
              updateChat(asstId, { citations: ev.citations });
            } else if (ev.type === "error") {
              updateChat(asstId, { content: acc, error: ev.error, streaming: false });
            }
          } catch {}
        }
      }
      updateChat(asstId, { streaming: false });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        updateChat(asstId, { content: acc + " _(stopped)_", streaming: false });
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        updateChat(asstId, { content: acc, error: msg, streaming: false });
        toast({ kind: "error", msg: `Chat failed: ${msg}` });
      }
    }
    abortRef.current = null;
    setBusy(false);
  }

  async function regenerate(id: string) {
    const idx = chats.findIndex((c) => c.id === id);
    if (idx < 1) return;
    updateChat(id, { content: "", streaming: true, error: undefined });
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chats.slice(0, idx).map((c) => ({ role: c.role, content: c.content })),
          useRag: ragOn,
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error("regenerate failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "token") { acc += ev.text; updateChat(id, { content: acc }); }
            else if (ev.type === "citations") updateChat(id, { citations: ev.citations });
          } catch {}
        }
      }
      updateChat(id, { streaming: false });
    } catch (e) {
      updateChat(id, { error: e instanceof Error ? e.message : String(e), streaming: false });
    }
    setBusy(false);
  }

  function copy(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function renderContent(content: string, citations?: { source: string; title: string; score: number }[]) {
    const parts: React.ReactNode[] = [];
    const re = /\[\[([^\]]+)\]\]|\[(\d+)\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      if (m.index > last) parts.push(content.slice(last, m.index));
      if (m[1]) {
        const slug = m[1];
        parts.push(
          <span
            key={`l-${m.index}-${parts.length}`}
            className="wikilink"
            onClick={() => { setSelectedSlug(slug); setView("wiki"); }}
          >
            {slug}
          </span>,
        );
      } else if (m[2]) {
        const n = parseInt(m[2], 10);
        const c = citations?.[n - 1];
        parts.push(
          <span key={`c-${m.index}-${parts.length}`} className="cite-chip" title={c?.source || ""}>
            <span className="num">{n}</span>
            {c?.title?.slice(0, 26) || `cite ${n}`}
          </span>,
        );
      }
      last = m.index + m[0].length;
    }
    if (last < content.length) parts.push(content.slice(last));
    return parts;
  }

  const empty = chats.length === 0;

  return (
    <div className="grid grid-rows-[1fr_auto] h-full relative z-10">
      <div ref={scrollRef} className="overflow-y-auto scroll-thin pt-[56px] pb-[24px]">
        {empty ? (
          <div className="grid place-items-center h-full text-center p-6">
            <div className="max-w-[560px]">
              <div className="w-[92px] h-[92px] mx-auto mb-[28px] opacity-90">
                <Image src="/logo.svg" alt="" width={92} height={92} />
              </div>
              <h1 className="serif text-[56px] leading-[1.04] mb-[12px]">
                Ask your <span className="serif-italic" style={{ color: "var(--brass)" }}>vault</span>.
              </h1>
              <p style={{ color: "var(--fg-3)", fontSize: 15, maxWidth: 440, margin: "0 auto 36px" }}>
                Own Wiki reads from your interlinked Markdown pages and indexed chunks on this machine. Citations are clickable and reversible.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px] text-left">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.q}
                    onClick={() => send(s.q)}
                    className="p-[16px] rounded-md transition-all"
                    style={{ background: "var(--navy)", border: "0.5px solid var(--border)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div className="mono text-[10px] tracking-[0.16em] uppercase mb-[6px]" style={{ color: "var(--violet-2)" }}>{s.kind}</div>
                    <div className="text-[13.5px] leading-[1.4]" style={{ color: "var(--fg-1)" }}>{s.q}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[760px] mx-auto px-[32px] flex flex-col gap-[36px]">
            {chats.map((c) => (
              <div key={c.id} className="grid grid-cols-[32px_1fr] gap-[14px] group">
                <div
                  className="w-8 h-8 rounded-full grid place-items-center mono text-[11px] font-semibold"
                  style={{
                    background: c.role === "user" ? "var(--navy-3)" : "rgba(168, 85, 247, 0.1)",
                    border: c.role === "user" ? "0.5px solid var(--border)" : "0.5px solid rgba(168, 85, 247, 0.3)",
                    color: c.role === "user" ? "var(--fg-1)" : "var(--violet-2)",
                  }}
                >
                  {c.role === "user" ? "YOU" : <Image src="/logo.svg" alt="" width={18} height={18} />}
                </div>
                <div className="pt-[4px] min-w-0">
                  <div className="flex items-center gap-[10px] mb-[8px]">
                    <span className="text-[13px] font-medium" style={{ color: "var(--fg-1)" }}>{c.role === "user" ? "You" : "Own Wiki"}</span>
                    <span className="mono text-[11px]" style={{ color: "var(--fg-3)" }}>
                      {new Date().toTimeString().slice(0, 5)}
                      {c.role === "assistant" && modelInfo?.chatModel ? ` · ${modelInfo.chatModel.replace(/:latest$/, "")}` : ""}
                    </span>
                    {c.streaming && (
                      <span className="tag violet">
                        <span className="status-dot" style={{ width: 5, height: 5, boxShadow: "none" }} />
                        streaming
                      </span>
                    )}
                    {c.error && <span className="tag" style={{ color: "var(--danger)", borderColor: "rgba(208,106,106,0.4)" }}>error</span>}
                  </div>
                  <div className="prose-mn">
                    {c.role === "assistant" ? (
                      c.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p>{typeof children === "string" ? renderContent(children, c.citations) : children}</p>
                            ),
                          }}
                        >
                          {c.content}
                        </ReactMarkdown>
                      ) : (
                        <p style={{ color: "var(--fg-3)" }}>retrieving…<span className="caret" /></p>
                      )
                    ) : (
                      <p>{c.content}</p>
                    )}
                    {c.streaming && c.content && <span className="caret" />}
                  </div>
                  {c.error && (
                    <div className="mt-2 text-[12px] pt-2" style={{ color: "var(--danger)", borderTop: "0.5px solid rgba(208,106,106,0.2)" }}>{c.error}</div>
                  )}
                  {c.role === "assistant" && c.citations && c.citations.length > 0 && (
                    <div className="cite-tray">
                      <div className="cite-tray-head flex items-center gap-2">
                        <LinkIcon size={11} />
                        Sources · {c.citations.length} chunks
                      </div>
                      {c.citations.map((cit, i) => (
                        <div key={i} className="cite-row">
                          <span className="ix">{i + 1}</span>
                          <span>
                            <span style={{ color: "var(--fg-1)", fontWeight: 500 }}>{cit.title}</span>
                            <span className="src ml-2">· {cit.source}</span>
                          </span>
                          <span className="src">{cit.score.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {c.role === "assistant" && !c.streaming && c.content && (
                    <div className="flex gap-[4px] mt-[14px] opacity-50 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copy(c.id, c.content)} className="flex items-center gap-[6px] px-[8px] py-[4px] rounded-sm mono text-[10px] tracking-[0.1em] uppercase transition-all" style={{ color: "var(--fg-3)" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg-1)"; e.currentTarget.style.background = "rgba(245,240,228,0.04)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg-3)"; e.currentTarget.style.background = "transparent"; }}>
                        {copiedId === c.id ? <Check size={11} /> : <Copy size={11} />} {copiedId === c.id ? "copied" : "copy"}
                      </button>
                      <button onClick={() => regenerate(c.id)} className="flex items-center gap-[6px] px-[8px] py-[4px] rounded-sm mono text-[10px] tracking-[0.1em] uppercase transition-all" style={{ color: "var(--fg-3)" }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--fg-1)"; e.currentTarget.style.background = "rgba(245,240,228,0.04)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--fg-3)"; e.currentTarget.style.background = "transparent"; }}>
                        <RefreshCcw size={11} /> regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-[32px] pt-[18px] pb-[24px]" style={{ borderTop: "0.5px solid var(--border)", background: "linear-gradient(180deg, transparent, rgba(8,9,15,0.6) 40%)" }}>
        <div className="max-w-[760px] mx-auto p-[14px] rounded-md transition-colors" style={{ background: "var(--navy-2)", border: "0.5px solid var(--border)" }}>
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask the librarian… ([[wikilinks]] auto-suggest)"
            rows={1}
            aria-label="Chat input"
            className="w-full bg-transparent border-0 outline-none resize-none text-[15px] leading-[1.5] min-h-[22px] max-h-[200px]"
            style={{ color: "var(--fg-1)" }}
          />
          <div className="flex items-center gap-[6px] pt-[8px] mt-[8px]" style={{ borderTop: "0.5px solid var(--border-2)" }}>
            <button onClick={() => setRagOn(!ragOn)} className={`chip ${ragOn ? "solid" : ""}`} title="toggle RAG retrieval">
              <LinkIcon size={11} /> RAG
            </button>
            <button onClick={() => setBrowseOn(!browseOn)} className={`chip ${browseOn ? "solid" : ""}`} title="(coming) attach browser context">
              <Globe size={11} /> Browse
            </button>
            <button className="chip" title="(coming) attach file">
              <Upload size={11} /> Attach
            </button>
            <button onClick={() => useStore.getState().clearChats()} className="chip" title="clear thread">
              <History size={11} /> New thread
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span className="mono text-[10px] tracking-[0.06em]" style={{ color: "var(--fg-4)" }}>↵ send · ⇧↵ newline</span>
              {busy ? (
                <button onClick={stop} className="w-8 h-8 rounded-sm grid place-items-center" style={{ background: "var(--danger)", color: "white" }} aria-label="stop">
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim()} className="w-8 h-8 rounded-sm grid place-items-center transition-colors disabled:cursor-not-allowed" style={{ background: input.trim() ? "var(--violet)" : "var(--navy-3)", color: input.trim() ? "white" : "var(--fg-3)" }} aria-label="send message">
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
