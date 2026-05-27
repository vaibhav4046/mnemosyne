"use client";
import { useEffect, useState, useMemo } from "react";
import { useStore, type View } from "@/store";
import {
  MessageSquare,
  BookOpen,
  Network,
  Folder,
  Cpu,
  Plug,
  Settings,
  Plus,
  Activity,
  Globe,
  Trash2,
} from "lucide-react";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number }>;
  run: () => void | Promise<void>;
};

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const setView = useStore((s) => s.setView);
  const openModal = useStore((s) => s.openModal);
  const toast = useStore((s) => s.toast);
  const clearChats = useStore((s) => s.clearChats);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const views: { id: View; label: string; icon: Action["icon"] }[] = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "wiki", label: "Wiki", icon: BookOpen },
    { id: "graph", label: "Graph", icon: Network },
    { id: "files", label: "Files", icon: Folder },
    { id: "agents", label: "Agents", icon: Cpu },
    { id: "mcp", label: "MCP", icon: Plug },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const actions: Action[] = useMemo(() => {
    const goto: Action[] = views.map((v) => ({
      id: `goto:${v.id}`,
      label: `Go to ${v.label}`,
      hint: "view",
      icon: v.icon,
      run: () => setView(v.id),
    }));
    const cmds: Action[] = [
      {
        id: "wiki:new",
        label: "Wiki: new page",
        hint: "wiki",
        icon: Plus,
        run: () =>
          openModal({
            kind: "prompt",
            title: "New wiki page",
            placeholder: "page title",
            onSubmit: async (title) => {
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
              if (!slug) return toast({ kind: "error", msg: "invalid title" });
              await fetch(`/api/wiki/${slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, body: `# ${title}\n\n` }),
              });
              setView("wiki");
              toast({ kind: "success", msg: `Created [[${slug}]]` });
            },
          }),
      },
      {
        id: "lint:run",
        label: "Run wiki lint pass",
        hint: "agents",
        icon: Activity,
        run: async () => {
          await fetch("/api/agents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "lint", title: "Wiki lint", input: {} }),
          });
          setView("agents");
          toast({ kind: "info", msg: "Lint queued" });
        },
      },
      {
        id: "browser:run",
        label: "Run browser agent…",
        hint: "agents",
        icon: Globe,
        run: () =>
          openModal({
            kind: "prompt",
            title: "Browser agent — URL",
            placeholder: "https://example.com",
            defaultValue: "https://news.ycombinator.com",
            onSubmit: async (url) => {
              await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  kind: "browser",
                  title: `Browse ${url}`,
                  input: { url, task: "Summarise the page in 5 bullets." },
                }),
              });
              setView("agents");
              toast({ kind: "info", msg: `Browser agent on ${url}` });
            },
          }),
      },
      {
        id: "chat:clear",
        label: "Clear chat history",
        hint: "chat",
        icon: Trash2,
        run: () => {
          clearChats();
          toast({ kind: "success", msg: "Chat cleared" });
        },
      },
    ];
    return [...goto, ...cmds];
  }, [setView, openModal, toast, clearChats]);

  const filtered = useMemo(() => {
    if (!q) return actions;
    const lower = q.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(lower) || a.hint?.toLowerCase().includes(lower));
  }, [q, actions]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (open && e.key === "Escape") {
        setOpen(false);
      } else if (open && e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (open && e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (open && e.key === "Enter" && filtered[idx]) {
        e.preventDefault();
        filtered[idx].run();
        setOpen(false);
        setQ("");
        setIdx(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, filtered, idx]);

  useEffect(() => setIdx(0), [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-strong rounded-xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search commands…"
          className="w-full bg-transparent border-0 outline-none px-4 py-3.5 text-[14px] border-b border-[var(--border)]"
        />
        <div className="max-h-[55vh] overflow-y-auto scroll-thin py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-[var(--text-faint)]">No matches.</div>
          ) : (
            filtered.map((a, i) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    a.run();
                    setOpen(false);
                    setQ("");
                  }}
                  onMouseEnter={() => setIdx(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left transition-colors ${
                    i === idx ? "bg-[var(--bg-card)] text-white" : "text-[var(--text-dim)]"
                  }`}
                >
                  <Icon size={14} />
                  <span className="flex-1">{a.label}</span>
                  {a.hint && <span className="chip text-[10px]">{a.hint}</span>}
                </button>
              );
            })
          )}
        </div>
        <div className="px-4 py-2 text-[10.5px] text-[var(--text-faint)] border-t border-[var(--border)] flex justify-between">
          <span>↑↓ navigate · ⏎ select · esc close</span>
          <span>⌘K</span>
        </div>
      </div>
    </div>
  );
}
