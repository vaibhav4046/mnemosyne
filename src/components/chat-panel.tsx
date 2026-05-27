"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";
import { Send, Sparkles, Trash2, Quote } from "lucide-react";
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

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chats]);

  async function send() {
    if (!input.trim() || busy) return;
    const userTurn = { id: nanoid(6), role: "user" as const, content: input };
    const asstId = nanoid(6);
    appendChat(userTurn);
    appendChat({ id: asstId, role: "assistant", content: "", streaming: true });
    const prompt = input;
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chats.map((c) => ({ role: c.role, content: c.content })), { role: "user", content: prompt }],
        }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const ev = JSON.parse(line.slice(6));
          if (ev.type === "token") {
            acc += ev.text;
            updateChat(asstId, { content: acc });
          } else if (ev.type === "citations") {
            updateChat(asstId, { citations: ev.citations });
          } else if (ev.type === "done") {
            updateChat(asstId, { streaming: false });
          } else if (ev.type === "error") {
            updateChat(asstId, { content: acc + `\n\n_Error: ${ev.error}_`, streaming: false });
          }
        }
      }
    } catch (e) {
      updateChat(asstId, { content: `Error: ${e instanceof Error ? e.message : String(e)}`, streaming: false });
    }
    setBusy(false);
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
          key={`l-${m.index}`}
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
        <button onClick={clearChats} className="btn-ghost btn text-[12px]" title="clear">
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
            <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto mt-7">
              {[
                "Summarise my CV.",
                "What's in my desktop folder?",
                "Draft an email about my CV to a recruiter.",
                "What does my wiki say about quantum computing?",
              ].map((p) => (
                <button
                  key={p}
                  onClick={() => setInput(p)}
                  className="text-left text-[12.5px] glass px-3 py-2 rounded-lg hover:border-[var(--accent)] transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {chats.map((c) => (
          <div key={c.id} className={`flex ${c.role === "user" ? "justify-end" : ""}`}>
            <div className={`max-w-[80%] ${c.role === "user" ? "ml-auto" : ""}`}>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-1 px-1">
                {c.role}
                {c.streaming && <span className="ml-2 pulse-soft text-[var(--accent)]">●</span>}
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
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p>{typeof children === "string" ? renderContent(children) : children}</p>,
                      }}
                    >
                      {c.content || (c.streaming ? "_thinking…_" : "")}
                    </ReactMarkdown>
                  ) : (
                    c.content
                  )}
                </div>
              </div>
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask anything · ⏎ to send · ⇧⏎ for newline"
            rows={2}
            className="input resize-none scroll-thin"
            disabled={busy}
          />
          <button onClick={send} disabled={busy || !input.trim()} className="btn btn-primary h-[42px] px-4 disabled:opacity-50">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
