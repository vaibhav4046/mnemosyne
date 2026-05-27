"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { Send, Sparkles, Trash2, Quote, Square, Copy, RefreshCcw, Check } from "lucide-react";
import { nanoid } from "nanoid";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatPanel() {
  const chats = useStore((s) => s.chats);
  const appendChat = useStore((s) => s.appendChat);
  const updateChat = useStore((s) => s.updateChat);
  const clearChats = useStore((s) => s.clearChats);
  const setView = useStore((s) => s.setView);
  const setSelectedSlug = useStore((s) => s.setSelectedSlug);
  const toast = useStore((s) => s.toast);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
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
    const prevUser = chats.slice(0, idx).reverse().find((c) => c.role === "user");
    if (!prevUser) return;
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
            if (ev.type === "token") {
              acc += ev.text;
              updateChat(id, { content: acc });
            } else if (ev.type === "citations") {
              updateChat(id, { citations: ev.citations });
            }
          } catch {}
        }
      }
      updateChat(id, { streaming: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      updateChat(id, { error: msg, streaming: false });
    }
    setBusy(false);
  }

  function copy(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function renderContent(content: string) {
    const parts: React.ReactNode[] = [];
    const re = /\[\[([^\]]+)\]\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      if (m.index > last) parts.push(content.slice(last, m.index));
      const slug = m[1];
      parts.push(
        <span
          key={`l-${m.index}-${parts.length}`}
          className="wikilink"
          onClick={() => {
            setSelectedSlug(slug);
            setView("wiki");
          }}
        >
          {slug}
        </span>,
      );
      last = m.index + m[0].length;
    }
    if (last < content.length) parts.push(content.slice(last));
    return parts;
  }

  return (
    <div className="flex flex-col h-full relative z-10">
      <header className="h-12 px-5 flex items-center justify-between border-b border-[var(--border)] glass">
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-[var(--accent)]" />
          <span className="font-medium text-[14px]">Chat</span>
          <span className="text-[11px] text-[var(--text-faint)]">· RAG + wiki context</span>
        </div>
        <button onClick={clearChats} className="btn-ghost btn text-[12px]" title="clear conversation" aria-label="clear conversation">
          <Trash2 size={13} /> clear
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin px-6 py-6 space-y-5">
        {chats.length === 0 && (
          <div className="text-center mt-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-2)]/20 border border-[var(--accent)]/30 mb-4">
              <Sparkles className="text-[var(--accent)]" size={28} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Ask your knowledge.</h2>
            <p className="text-[var(--text-dim)] text-sm max-w-md mx-auto leading-relaxed">
              Mnemosyne retrieves from your local wiki and embedded source chunks, then streams an answer from your local Ollama model.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto mt-7">
              {[
                "What is Mnemosyne?",
                "Summarise the Karpathy LLM wiki pattern.",
                "Why Ollama instead of an API?",
                "How does the RAG pipeline work?",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-left text-[12.5px] glass px-3 py-2.5 rounded-lg hover:border-[var(--accent)] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mt-7">
              Press <span className="kbd">⌘K</span> for the command palette.
            </div>
          </div>
        )}

        {chats.map((c) => (
          <div key={c.id} className={`flex ${c.role === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[80%] group ${c.role === "user" ? "ml-auto" : ""}`}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-1 px-1 flex items-center gap-2">
                <span>{c.role}</span>
                {c.streaming && <span className="pulse-soft text-[var(--accent)]">●</span>}
                {c.error && <span className="text-[var(--red)]">error</span>}
              </div>
              <div
                className={`rounded-xl px-4 py-3 ${
                  c.role === "user"
                    ? "bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent-2)]/10 border border-[var(--accent)]/20"
                    : "glass"
                }`}
              >
                <div className="prose-mn">
                  {c.role === "assistant" ? (
                    c.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p>{typeof children === "string" ? renderContent(children) : children}</p>
                          ),
                        }}
                      >
                        {c.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-[var(--text-faint)] italic">thinking<span className="caret" /></span>
                    )
                  ) : (
                    c.content
                  )}
                  {c.streaming && c.content && <span className="caret" />}
                </div>
                {c.error && (
                  <div className="mt-2 text-[12px] text-[var(--red)] border-t border-[var(--red)]/20 pt-2">
                    {c.error}
                  </div>
                )}
              </div>
              {c.role === "assistant" && !c.streaming && c.content && (
                <div className="flex gap-1.5 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copy(c.id, c.content)}
                    className="btn-ghost btn text-[10.5px] py-1 px-2"
                    title="copy"
                    aria-label="copy message"
                  >
                    {copiedId === c.id ? <Check size={11} /> : <Copy size={11} />}
                    {copiedId === c.id ? "copied" : "copy"}
                  </button>
                  <button
                    onClick={() => regenerate(c.id)}
                    className="btn-ghost btn text-[10.5px] py-1 px-2"
                    title="regenerate"
                    aria-label="regenerate response"
                  >
                    <RefreshCcw size={11} /> regenerate
                  </button>
                </div>
              )}
              {c.citations && c.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                  {c.citations.map((cit, i) => (
                    <span key={i} className="chip" title={cit.source}>
                      <Quote size={9} /> [{i + 1}] {cit.title.slice(0, 30)} · {(cit.score * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-[var(--border)] glass">
        <div className="flex gap-2 items-end">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything · ⏎ to send · ⇧⏎ for newline"
            rows={1}
            aria-label="Chat input"
            className="input resize-none scroll-thin min-h-[42px]"
            disabled={busy && !abortRef.current}
          />
          {busy ? (
            <button
              onClick={stop}
              className="btn h-[42px] px-4"
              aria-label="stop generating"
              title="stop"
              style={{ background: "var(--red)", borderColor: "var(--red)", color: "white" }}
            >
              <Square size={13} fill="white" />
            </button>
          ) : (
            <button
              onClick={() => send()}
              disabled={!input.trim()}
              className="btn btn-primary h-[42px] px-4 disabled:opacity-50"
              aria-label="send message"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
